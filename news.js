import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import { MongoClient } from "mongodb";
import express from "express"

const app=express()

app.get("/",(req,res)=>{
  res.send("running...")})


// MongoDB config
const MONGO_URI = "mongodb+srv://mohanavamsi14:vamsi@cluster.74mis.mongodb.net/?retryWrites=true&w=majority&appName=Cluster";
const DB_NAME = "stocksDB";
const COLLECTION_NAME = "profiles";

// Utility functions
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function logWithTime(msg) {
  const now = new Date().toLocaleTimeString();
  console.log(`[${now}] ${msg}`);
}

async function connectToMongo() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);
  return { client, collection };
}

// Main stock processing logic
async function processStock({ Name, Symbol, Sector, Industry }, collection) {
  const link = `https://stockanalysis.com/quote/${Symbol.replace(':', '/')}`;
  logWithTime(`➡️ Fetching: ${link}`);

  try {
    const response = await axios.get(link, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
      timeout: 15000,
      validateStatus: () => true, // Accept all status codes
    });

    if (response.status === 429 || response.status >= 500) {
      logWithTime(`🚨 HTTP ${response.status} — Bot detection triggered.`);
      return "bot";
    }

    const $ = cheerio.load(response.data);

    const noNews = $("span")
      .toArray()
      .some((el) => $(el).text().includes("There is no news available yet."));

    const links = $("h3 a")
      .toArray()
      .map((a) => {
        const href = $(a).attr("href");
        if (!href) return null;
        return href.startsWith("http") ? href : `https://stockanalysis.com${href}`;
      })
      .filter(Boolean);

    if (!noNews) {
      logWithTime(`🤖 No links, likely bot detection.`);
      return "bot";
    }

    const dataToStore = {
      Symbol,
      company: Name,
      Sector,
      Industry,
      links: noNews ? ["No links available"] : links,
    };

    await collection.updateOne({ Symbol }, { $set: dataToStore }, { upsert: true });

    if (noNews) {
      logWithTime(`🚫 No news for ${Symbol}`);
    } else {
      logWithTime(`✅ Done: ${Symbol} | ${links.length} links`);
    }

  } catch (err) {
    logWithTime(`❌ Error with ${Symbol}: ${err.message}`);
  }
}

// Main scraper run function
async function runScraper() {
  const { client, collection } = await connectToMongo();
  let botDetected = false;

  try {
    const stocks = JSON.parse(await fs.readFile("./allstocks.json", "utf-8"));
    const existingDocs = await collection.find({}, { projection: { Symbol: 1 } }).toArray();
    const doneSymbols = new Set(existingDocs.map((d) => d.Symbol));

    const symbolChunks = chunkArray(stocks, 5);

    for (const chunk of symbolChunks) {
      if (botDetected) break;

      const filteredChunk = chunk.filter((stock) => !doneSymbols.has(stock.Symbol));
      if (filteredChunk.length === 0) continue;

      await Promise.all(
        filteredChunk.map(async (stock) => {
          const res = await processStock(stock, collection);
          if (res === "bot") botDetected = true;
        })
      );

      if (!botDetected) {
        logWithTime("✅ Batch processed and saved to MongoDB.");
      } else {
        logWithTime("⚠️ Bot detected. Skipping remaining stocks.");
        break;
      }
    }

    if (!botDetected) {
      logWithTime("🎉 Scraping round complete!");
    }
  } catch (err) {
    logWithTime(`❌ Error during scraping round: ${err.message}`);
  } finally {
    await client.close();
  }

  return botDetected;
}

// Infinite loop runner
(async () => {
  while (true) {
    logWithTime("🚀 Starting new scraping cycle...");

    const startTime = Date.now();
    const botDetected = await runScraper();
    const duration = Date.now() - startTime;

    if (botDetected) {
      const remainingTime = Math.max(0, 2 * 60 * 1000 - duration); // 2 minutes
      logWithTime(`⏳ Bot detection triggered. Waiting ${Math.ceil(remainingTime / 1000)} seconds before retrying...`);
      await sleep(remainingTime);
    }
  }
})();

app.listen(5000,()=>{
  console.log("runing")
})
