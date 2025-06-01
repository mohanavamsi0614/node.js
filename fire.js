import axios from "axios";
import { MongoClient } from "mongodb";
import scraper from "./scraper.js";
import express from "express";

const app = express();
app.use(express.json());

function sleep(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.get("/", (req, res) => {
  res.send("Hello World");
});
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

// MongoDB config
const MONGO_URI = "mongodb+srv://mohanavamsi14:vamsi@cluster.74mis.mongodb.net/?retryWrites=true&w=majority&appName=Cluster";
const DB_NAME = "stocksDB";
const COLLECTION_NAME = "Web_links_all_stock_list";

// Connect to MongoDB
async function connectToMongo() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);
  const all_stocks = client.db("financial_reports").collection("all_stock_list");
  return { client, collection, all_stocks };
}

const { collection, all_stocks } = await connectToMongo();
let stocks = await all_stocks.find({}).toArray();
console.log("✅ Stocks loaded");

async function processStock(stock) {
  const exists = await collection.findOne({ symbol: stock.symbol });
  if (exists) return;

  console.log("Processing:", stock.name);

  try {
    const [res1, res2] = await Promise.all([
      axios.post(
        "https://api.firecrawl.dev/v1/scrape",
        { url: stock.link, formats: ["links"] },
        {
          headers: {
            Authorization: "Bearer fc-e2a73f0e071b48adadbcb6cf022f9626",
          },
        }
      ),
      axios.post(
        "https://api.firecrawl.dev/v1/scrape",
        { url: stock.ir, formats: ["links"] },
        {
          headers: {
            Authorization: "Bearer fc-e2a73f0e071b48adadbcb6cf022f9626",
          },
        }
      ),
    ]);
    await sleep();

    const links = [...res1.data.data.links, ...res2.data.data.links];
    const doc = await collection.findOne({ symbol: stock.symbol });

    if (doc) {
      const combinedLinks = [...new Set([...(doc.links || []), ...links])];
      await collection.updateOne(
        { symbol: stock.symbol },
        { $set: { links: combinedLinks, ir: "done" } }
      );
    } else {
      await collection.insertOne({
        name: stock.name,
        symbol: stock.symbol,
        off_website: stock.link,
        ir_website: stock.ir,
        links,
        ir: "done",
      });
    }

    console.log(`✅ Inserted/Updated data for ${stock.name}`);
  } catch (err) {
    console.error(`❌ Error with ${stock.name}:`, err.message);
    console.log("⚙️ Falling back to local scraper...");

    try {
      const [local1, local2] = await Promise.all([
        scraper(stock.link),
        scraper(stock.ir),
      ]);
      const links = [...local1, ...local2];

      if (links.length > 0) {
        await collection.insertOne({
          name: stock.name,
          symbol: stock.symbol,
          off_website: stock.link,
          ir_website: stock.ir,
          links,
          ir: "done",
        });
        console.log(`✅ Inserted (local) data for ${stock.name}`);
      } else {
        console.log(`⚠️ No links found locally for ${stock.name}`);
      }
    } catch (localErr) {
      console.log(`❌ Local scrape failed for ${stock.name}:`, localErr.message);
    }
  }
}

// Batch stocks into chunks of 4 and process in parallel
const BATCH_SIZE = 5;
const startIndex = 40000;
const stocksToProcess = stocks.slice(startIndex);

for (let i = 0; i < stocksToProcess.length; i += BATCH_SIZE) {
  const batch = stocksToProcess.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(processStock));
}

console.log("🎉 All stocks processed successfully!");
