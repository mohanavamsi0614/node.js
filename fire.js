import axios from "axios";
import { MongoClient } from "mongodb";
import scaraper from "./scraper.js";
import express from  "express";

const app = express();

function sleep(){
  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
}
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
const COLLECTION_NAME = "Web_links_all_stock_list";

// Connect to MongoDB
async function connectToMongo() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);
  var all_stocks=client.db("financial_reports").collection("all_stock_list");
  return { client, collection,all_stocks };
}

const { collection,all_stocks } = await connectToMongo();

// Read stocks from file
let stocks = await all_stocks.find({}).toArray();
console.log("loaded")

// Get already processed symbols
let Symbols = await collection.find({}).toArray();
console.log("loaded")
Symbols = Symbols
.filter((i) =>i.links.length!=0)
.map((i) => i.symbol);
for (let stock of stocks) {
  if (Symbols.includes(stock.symbol)) continue;

  console.log("Processing stock:", stock.name);


  try {
    const res = await axios.post(
      "https://api.firecrawl.dev/v1/scrape",
      { url: stock.link, formats: ["links"] },
      {
        headers: {
          Authorization: "Bearer fc-e2a73f0e071b48adadbcb6cf022f9626",
        },
      }
    );
    await sleep()

    console.log("offical done for ",stock.name)
    const res_2 = await axios.post(
      "https://api.firecrawl.dev/v1/scrape",
      { url: stock.ir, formats: ["links"] },
      {
        headers: {
          Authorization: "Bearer fc-e2a73f0e071b48adadbcb6cf022f9626",
        },
      }
    );
    links=[...links,...res_2.data.data.links]


    const doc = await collection.findOne({ symbol: stock.symbol });

    if (doc) {
      const existingLinks = doc.links || [];
      const combinedLinks = [...new Set([...existingLinks, ...links])];

      await collection.updateOne(
        { symbol: stock.symbol },
        { $set: { links: combinedLinks, ir: "done" } }
      );
    } else {
      await collection.insertOne({
        name: stock.name,
        symbol: stock.symbol,
        off_website: stock.link,
        ir_website:stock.ir,
        links,
        ir: "done",
      });
    }

    console.log(`✅ Inserted/Updated data for ${stock.name}`);
  } catch (err) {
    console.error(`❌ Error with ${stock.name}:`, err.message);
    console.log("⚙️ Falling back to local scraper...");

    try {
      let links=[]
      const res1 = await scaraper(stock.link);
      const res_2 = await scaraper(stock.ir);
      links=[...res1,...res_2]
      if (links.length!=0) {
        await collection.insertOne({
          name: stock.name,
          symbol: stock.symbol,
off_website: stock.link,
        ir_website:stock.ir,          links,
          ir: "done",
        });
        console.log(`✅ Inserted (local) data for ${stock.name}`);
      } else {
        console.log(`⚠️ No links found locally for ${stock.name}`);
      }
    } catch (err2) {
      console.log(`❌ Local scrape failed for ${stock.Name}:`, err2.message);
    }
  }
}
