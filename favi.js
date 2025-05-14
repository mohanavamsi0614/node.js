import express from "express";
import { MongoClient } from "mongodb";
import AWS from "aws-sdk";
import axios from "axios";
import * as cheerio from "cheerio";
import { config } from "dotenv";
import { URL } from "url";

config(); // Load .env

const app = express();
app.get("/", (req, res) => res.send("Server is up"));
app.listen(6500, () => console.log("Running on port 6500..."));

// AWS S3 Setup
const S3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "eu-north-1"
});

// MongoDB Setup
const client = new MongoClient("mongodb+srv://mohanavamsi14:vamsi@cluster.74mis.mongodb.net/?retryWrites=true&w=majority&appName=Cluster/");
const DB_NAME = "financial_reports";
const COLLECTION_NAME = "symbols_main_stock_list";
const BUCKET = "mainstocklist";

// Favicon Fetcher Function
async function getFaviconUrl(websiteUrl,name) {
  try {
    const response = await axios.get(websiteUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    const iconLink = $("link[rel='icon'], link[rel='shortcut icon']").attr("href");

    if (iconLink) {
      const fullUrl = new URL(iconLink, websiteUrl).href;
      const iconData = await axios.get(fullUrl, { responseType: "arraybuffer" });

      const hostname = new URL(websiteUrl).hostname;
      await S3.putObject({
        Bucket: BUCKET,
        Key: `favicons/${name}.ico`,
        Body: iconData.data,
        ContentType: "image/x-icon",
      }).promise();

      return fullUrl;
    } else {
      return "not found";
    }
  } catch {
    return "not found";
  }
}

// Main Updater
async function updateFaviconData() {
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const stocks = await collection.find({}).toArray();

    for (const stock of stocks) {
      const id = stock._id;
      const websiteUrl = stock.Website;

      if (!websiteUrl || websiteUrl.trim() === "") {
        console.log(`No website for ${stock.Name}, marking 'not found'`);
        await collection.updateOne({ _id: id }, {
          $set: { link: "not found", favicon: "not found" }
        });
        continue;
      }

      const faviconUrl = await getFaviconUrl(websiteUrl,stock.Name);
      await collection.updateOne({ _id: id }, {
        $set: { favicon: faviconUrl }
      });

      console.log(`Updated ${stock.Name}: ${faviconUrl}`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

updateFaviconData();
