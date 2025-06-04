import { MongoClient } from "mongodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";
import fs from "fs/promises";
import express from "express";


const app = express();
app.get("/", (req, res) => {
  res.send("Server is running...");
});
app.listen
(6500, () => {
  console.log("Server is listening on port 6000");
});

dotenv.config();

const REGION = process.env.AWS_REGION;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

const mongoClient = new MongoClient("mongodb+srv://mohanavamsi14:vamsi@cluster0.3huumg1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
await mongoClient.connect();
console.log("Connected to MongoDB 🌿");

const db = mongoClient.db("final_record");
const collection = db.collection("main_stock_list");

const stocks = JSON.parse(await fs.readFile("./main_stocks.json", "utf-8"));
console.log("Stocks loaded 👍");

const error = [];

for (let stock of stocks.slice(1531)) {
  const symbol = stock.Symbol;
  console.log("Started processing", symbol);
  const item = await collection.findOne({ Symbol: symbol });

  if (item?.financials?.length && item?.web_links_data?.length && item?.news_data?.length) {
    delete item._id;
    try {
      await docClient.send(
        new PutCommand({
          TableName: "main_stock_list",
          Item: {
            stockId: symbol,
            ...item
          },
        })
      );
      console.log(`${symbol} sent to DynamoDB ✅`);
    } catch (err) {
      console.error(`Error sending ${symbol} to DynamoDB ❌`, err);
      error.push({ symbol, error: err.message });
    }
  } else {
    error.push({ symbol, issue: "Missing data" });
    console.log("Found incomplete data ❗ Check this out.");
  }
}

console.log("All done 🚀");
await fs.writeFile("./error.json", JSON.stringify(error, null, 2));
