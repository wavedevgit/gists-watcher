import fs from "fs/promises";
import * as cheerio from "cheerio";

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

const postToDiscord = async (embed) => {
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });
};

const getPBContent = async (id) => {
  return null
};
const parsePasteBin = async (html) => {
  const $ = cheerio.load(html);
  return Promise.all(
    $("table.maintable tr:has(a)")
      .map(async (i, element) => {
        const el = $(element);
        const id = $(el.find("td>a")).attr("href");
        return {
          link: "https://pastebin.com" + id,
          title: $(el.find("td>a")).text(),
          syntax: $(el.find("td:nth-child(3)>a")).text(),
        };
      })
      .get()
  );
};

async function main() {
  let oldGists = [];
  try {
    oldGists = JSON.parse(await fs.readFile("data/gists.json", "utf-8"));
  } catch {}
  let oldPB = [];
  try {
    oldPB = JSON.parse(await fs.readFile("data/pastebin.json", "utf-8"));
  } catch {}

  const gists = await (
    await fetch("https://api.github.com/gists/public", {
      headers: { "user-agent": "GistsWatcher/1.0" },
    })
  ).json();

  const pastebinArchive = await (
    await fetch("https://pastebin.com/archive")
  ).text();
  const pasteBinData = await parsePasteBin(pastebinArchive);

  const comparedPasteBin = [];
  const comparedGists = [];
  for (let paste of pasteBinData) {
    if (oldPB.find((e) => e.link === paste.link)) continue;
    comparedPasteBin.push(paste);
  }
  for (let gist of gists) {
    if (oldGists.find((e) => e.id === gist.id)) continue;
    comparedGists.push(gist);
  }

  // notify about new pastebins
  for (const paste of comparedPasteBin) {

    await postToDiscord( {content:"pastes/gists created, find them here: https://example.com"});
  }



  // save latest state
  await fs.writeFile(
    "data/gists.json",
    JSON.stringify(gists, null, 2),
    "utf-8"
  );
  await fs.writeFile(
    "data/pastebin.json",
    JSON.stringify(pasteBinData, null, 2),
    "utf-8"
  );
    await fs.writeFile(
    "data/gists.diff.json",
    JSON.stringify(comparedGists, null, 2),
    "utf-8"
  );
  await fs.writeFile(
    "data/pastebin.diff.json",
    JSON.stringify(comparedPasteBin, null, 2),
    "utf-8"
  );
}

main();
