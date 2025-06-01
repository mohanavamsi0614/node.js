import axios from "axios";
import { MongoClient } from "mongodb";
import AWS from "aws-sdk";
import mime from "mime-types";
import { readFile } from "fs/promises";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
app.get("/", (req, res) => {
  res.send("Server is running...");
});
app.listen
(6000, () => {
  console.log("Server is listening on port 6000");
});
const S3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "eu-north-1",
});
const BUCKET_NAME = "mainstocklist";

const mongoClient = new MongoClient("mongodb+srv://mohanavamsi14:vamsi@cluster0.3huumg1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

let symbols = {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadFavicons() {
  const data = await readFile("favicon.json", "utf-8");
  symbols = JSON.parse(data);
  console.log("🧠 Loaded favicons.");
}

// Main function for processing a single company
async function processCompany(i) {
  const company = i.Name;
  const industry = i.Industry || "";
  const sector = i.Sector || "";
  const title = i.title || "";
  let url = i.source_url || "";
  const favicon = symbols[company] || "";
  const ogurl = url;

  try {
    console.log(`\n🟡 Starting: ${company}`);

    const lowerUrl = url.toLowerCase();
    const disallowedExtensions = [".mp3", ".mp4", ".zip"];
    if (disallowedExtensions.some((ext) => lowerUrl.endsWith(ext))) {
      console.log(`🚫 Skipping unsupported file type: ${url}`);
      return;
    }

    if (!/\.(pdf|docx?|xlsx?|pptx?)$/i.test(url)) {
      console.log(`⬇️  Downloading content from: ${url}`);
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000,
      });

      const contentType =
        response.headers["content-type"] || mime.lookup(url) || "application/octet-stream";

      const safeTitle = title.replace(/[^\w\d_\-\.]/g, "_");
      const timestampedTitle = `${Date.now()}_${safeTitle}`;

      const params = {
        Bucket: BUCKET_NAME,
        Key: `reports/${timestampedTitle}`,
        Body: response.data,
        ContentType: contentType,
      };

      console.log(`📦 Uploading to S3 as ${timestampedTitle} (${contentType})`);
      await S3.putObject(params).promise();

      url = `https://${BUCKET_NAME}.s3.${S3.config.region}.amazonaws.com/reports/${timestampedTitle}`;
      console.log(`✅ Uploaded to S3: ${url}`);
    }

    const reqBody = {
      company,
      industry,
      sector,
      title,
      link: url,
      url,
      favicon,
      flag: "test1505",
    };

    console.log(`📤 Sending data to ingestion API...`);
    const res = await axios.post(
      "https://eprid4tv0b.execute-api.eu-west-1.amazonaws.com/final/rag-ingestor",
      reqBody
    );

    console.log(`🎯 API response: ${res.status} ${res.statusText}`);

    const resultCollection = mongoClient.db("main_stock_list").collection("api_responses");
    await resultCollection.insertOne({
      company,
      response: res.data,
      timestamp: new Date(),
      url: ogurl,
    });

    console.log(`📝 Saved ${company} response to MongoDB.`);
    console.log("-".repeat(50));
  } catch (err) {
    console.error(`❌ Error processing ${company}: ${err.message}`);
    console.log("-".repeat(50));
  }
}

// Main execution block
(async () => {
  try {
    await mongoClient.connect();
    console.log("🟢 Connected to MongoDB");

    await loadFavicons();

    const mainCollection = mongoClient.db("main_stock_list").collection("main_stock_list");
    const responseCollection = mongoClient.db("main_stock_list").collection("api_responses");

    let companies = await readFile("./main_stocks.json", "utf-8");
    companies = JSON.parse(companies);
    console.log(`📊 Loaded ${companies.length} companies`);

    for (const company of companies) {
      const matches = await mainCollection.find({ Name: company.Name }).toArray();

      for (const match of matches) {
        if (!match.source_url) {
          console.log(`⚠️  No source URL for ${match.Name}`);
          continue;
        }

        const existing = await responseCollection.findOne({ url: match.source_url });
        if (existing) {
          console.log(`🔁 Already processed: ${match.Name}`);
          continue;
        }

        await processCompany(match);
        await sleep(300); // Optional: delay between requests
      }
    }

    console.log("\n✅ All companies processed.");
  } catch (err) {
    console.error("🔥 Main Error:", err.message);
  } finally {
    await mongoClient.close();
    console.log("🔒 MongoDB connection closed");
  }
})();
