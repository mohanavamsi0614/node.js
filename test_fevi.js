import express from "express";
import { MongoClient } from "mongodb";
import AWS from "aws-sdk";
import axios from "axios";
import { config } from "dotenv";
import { URL } from "url";
import path from "path";

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
const client = new MongoClient("mongodb+srv://mohanavamsi14:vamsi@cluster.74mis.mongodb.net/?retryWrites=true&w=majority&appName=Cluster");
const DB_NAME = "financial_reports";
const COLLECTION_NAME = "symbols_main_stock_list";
const BUCKET = "mainstocklist";

// Google Favicon Fetcher
async function getFaviconUrlViaGoogle(domain, name, size = 64) {
  try {
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
    const response = await axios.get(googleFaviconUrl, { responseType: "arraybuffer" });

    const s3Key = `favicons/${name}.png`;
    await S3.putObject({
      Bucket: BUCKET,
      Key: s3Key,
      Body: response.data,
      ContentType: "image/png",
    }).promise();

    return `https://${BUCKET}.s3.eu-north-1.amazonaws.com/${s3Key}`;
  } catch (err) {
    console.error(`Failed to fetch favicon for ${domain}:`, err.message);
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
          $set: { favicon: "not found" }
        });
        continue;
      }

      let domain;
      try {
        domain = new URL(websiteUrl).hostname;
      } catch (e) {
        console.log(`Invalid URL for ${stock.Name}, marking 'not found'`);
        await collection.updateOne({ _id: id }, {
          $set: { favicon: "not found" }
        });
        continue;
      }

      const faviconUrl = await getFaviconUrlViaGoogle(domain, stock.Name);
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
