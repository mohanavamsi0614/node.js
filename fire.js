import axios from "axios";
import fs from "fs/promises";
import { MongoClient } from "mongodb";
import dotenv from "dotenv"
dotenv.config()
// MongoDB config
const MONGO_URI = "mongodb+srv://mohanavamsi14:vamsi@cluster.74mis.mongodb.net/?retryWrites=true&w=majority&appName=Cluster";
const DB_NAME = "stocksDB";
const COLLECTION_NAME = "Web_links";

async function connectToMongo() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);
  return { client, collection };
}

const { collection } = await connectToMongo();

let stocks = JSON.parse(await fs.readFile("./main_stocks.json", "utf-8"));

let Symbols=await collection.find({}).toArray()
Symbols=Symbols.map((i)=>{return i.symbol})
for (let stock of stocks) {
    if (Symbols.includes(stock.Symbol)) continue
  if (!stock.Website) continue;

  try {
    const res = await axios.post(
      "https://api.firecrawl.dev/v1/scrape",
      { url: stock.Website, formats: ["links"] },
      {
        headers: {
          Authorization: "Bearer "+process.env.token,
        },
      }
    );

    const links = res.data.data.links;
    await collection.insertOne({
      name: stock.Name,
      symbol: stock.Symbol,
      website: stock.Website,
      links,
    });

    console.log(`Inserted data for ${stock.Name}`);
  } catch (err) {
    console.error(`Error processing ${stock.Name}:`, err.message);
  }
}
