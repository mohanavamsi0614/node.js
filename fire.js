import axios from "axios";
import fs from "fs/promises";
import { MongoClient } from "mongodb";
import express from  "express";

const app = express();
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Hello World");
});
app.listen(3000, () => {
  console.log("Server is running on port 3000");
}
);
// MongoDB config
const MONGO_URI = "mongodb+srv://mohanavamsi14:vamsi@cluster.74mis.mongodb.net/?retryWrites=true&w=majority&appName=Cluster";
const DB_NAME = "stocksDB";
console.log("ihiok")
const COLLECTION_NAME = "Web_links";

// Connect to MongoDB
async function connectToMongo() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);
  return { client, collection };
}

const { collection } = await connectToMongo();

// Read stocks from file
let stocks = JSON.parse(await fs.readFile("./main_stocks_investor.json", "utf-8"));
// Get already processed symbols
let Symbols = await collection.find({}).toArray();
console.log("loaded")
Symbols = Symbols
.filter((i) =>i.ir.length!=0)
.map((i) => i.symbol);
console.log(Symbols)
for (let stock of stocks) {
  if (Symbols.includes(stock.Symbol)) continue;
  if (!stock.Website) continue;

  console.log("Processing stock:", stock.Name);

  try {
    const res = await axios.post(
      "https://api.firecrawl.dev/v1/scrape",
      { url: stock.Website, formats: ["links"] },
      {
        headers: {
          Authorization: "Bearer fc-e2a73f0e071b48adadbcb6cf022f9626",
        },
      }
    );

    const links = res.data.data.links;

    const doc = await collection.findOne({ symbol: stock.Symbol });

    if (doc) {
      const existingLinks = doc.links || [];
      const combinedLinks = [...new Set([...existingLinks, ...links])];

      await collection.updateOne(
        { symbol: stock.Symbol },
        { $set: { links: combinedLinks, ir: "done" } }
      );
    } else {
      await collection.insertOne({
        name: stock.Name,
        symbol: stock.Symbol,
        website: stock.Website,
        links,
        ir: "done",
      });
    }

    console.log(`✅ Inserted/Updated data for ${stock.Name}`);
  } catch (err) {
    console.error(`❌ Error with ${stock.Name}:`, err.message);
   
  }
}
