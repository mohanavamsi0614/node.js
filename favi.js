import express from "express";
import { MongoClient } from "mongodb";
import AWS from "aws-sdk";
import axios from "axios";
import * as cheerio from "cheerio";
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

// Favicon Fetcher Function
async function getFaviconUrl(websiteUrl, name) {
  try {
    const response = await axios.get(websiteUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);

    // Collect all favicon candidates
    const links = $("link[rel*='icon']");
    let bestIcon = null;
    let bestScore = -1;

    links.each((_, el) => {
      const href = $(el).attr("href");
      const sizes = $(el).attr("sizes");

      if (href) {
        const ext = path.extname(href).toLowerCase();
        const sizeValue = sizes ? parseInt(sizes.split("x")[0]) || 0 : 0;

        // Score: prefer .svg/.png, larger sizes
        let score = 0;
        if (ext === ".svg") score += 100;
        else if (ext === ".png") score += 80;
        else if (ext === ".ico") score += 10;

        score += sizeValue;

        if (score > bestScore) {
          bestScore = score;
          bestIcon = href;
        }
      }
    });

    if (bestIcon) {
      const fullUrl = new URL(bestIcon, websiteUrl).href;
      const fileExt = path.extname(fullUrl).toLowerCase().replace(".", "") || "ico";
      const contentType =
        fileExt === "svg" ? "image/svg+xml" :
        fileExt === "png" ? "image/png" :
        fileExt === "jpg" || fileExt === "jpeg" ? "image/jpeg" :
        "image/x-icon";

      const iconData = await axios.get(fullUrl, { responseType: "arraybuffer" });

      const s3Key = `favicons/${name}.${fileExt}`;
      await S3.putObject({
        Bucket: BUCKET,
        Key: s3Key,
        Body: iconData.data,
        ContentType: contentType,
      }).promise();

      return `https://${BUCKET}.s3.eu-north-1.amazonaws.com/${s3Key}`;
    } else {
      return "not found";
    }

  } catch (err) {
    console.error(`Error fetching favicon for ${websiteUrl}:`, err.message);
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

      const faviconUrl = await getFaviconUrl(websiteUrl, stock.Name);
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
