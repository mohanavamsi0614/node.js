import express from "express";
import { MongoClient } from "mongodb";
import AWS from "aws-sdk";
import axios from "axios";
import cheerio from "cheerio";
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
  region: process.env.AWS_REGION,
});

// MongoDB Setup
const client = new MongoClient(process.env.MONGO_URI);
const DB_NAME = process.env.MONGO_DB_NAME;
const COLLECTION_NAME = process.env.MONGO_COLLECTION_NAME;
const BUCKET = process.env.S3_BUCKET;

// Favicon Fetcher Function
async function getFaviconUrl(websiteUrl) {
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
        Key: `favicons/${hostname}.ico`,
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
      const websiteUrl = stock.link || stock.Website;

      if (!websiteUrl || websiteUrl.trim() === "") {
        console.log(`No website for ${stock.name}, marking 'not found'`);
        await collection.updateOne({ _id: id }, {
          $set: { link: "not found", favicon: "not found" }
        });
        continue;
      }

      const faviconUrl = await getFaviconUrl(websiteUrl);
      await collection.updateOne({ _id: id }, {
        $set: { favicon: faviconUrl }
      });

      console.log(`Updated ${stock.name}: ${faviconUrl}`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

updateFaviconData();
