import axios from "axios";
import { MongoClient } from "mongodb";
import AWS from "aws-sdk";
import mime from "mime-types";
import { readFile } from "fs/promises";
import pLimit from "p-limit";
import dotenv from "dotenv";
import express from "express";
import cron from "node-cron";

dotenv.config();

const app = express();
app.get("/", (req, res) => {
  res.send("Server is running...");
});
app.listen(6600, () => {
  console.log("🚀 Express server running on port 6600...");
});

// AWS S3 Setup
const S3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "eu-north-1",
});
const BUCKET_NAME = "mainstocklist";

// MongoDB Setup
const mongoClient = new MongoClient(
  "mongodb+srv://mohanavamsi14:vamsi@cluster0.3huumg1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
);

let symbols = {};

async function loadFavicons() {
  const data = await readFile("favicon.json", "utf-8");
  symbols = JSON.parse(data);
  console.log("✅ Favicons loaded");
}
async function processCompany(i) {
  const company = i.Name;
  const industry = i.Industry || "";
  const sector = i.Sector || "";
  const title = i.title || "";
  let url = i.source_url || "";
  const favicon = symbols[company] || "";
  const ogurl = url;

  try {
    console.log(`\n🚀 Processing: ${company}`);

    // Check for disallowed file extensions
    const lowerUrl = url.toLowerCase();
    const disallowedExtensions = [".mp3", ".mp4", ".zip"];
    if (disallowedExtensions.some(ext => lowerUrl.endsWith(ext))) {
      console.log(`📄 Skipping unsupported file type for ${company}`);
    } 
    
    else if (!(url.includes(".pdf") || url.includes(".PDF") || url.includes(".doc") || url.includes(".docx") || url.includes(".xls") || url.includes(".xlsx") || url.includes(".ppt") || url.includes(".pptx"))) {
      console.log("uploading to s3");
      console.log(`🌐 Downloading from: ${url}`);
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000,
      });

      const contentType =
        response.headers["content-type"] || mime.lookup(url) || "application/octet-stream";

      const timestampedTitle = `${Date.now()}_${title}`;

      console.log(`📦 Uploading to S3 as ${contentType} ...`);
      const params = {
        Bucket: BUCKET_NAME,
        Key: `reports/${timestampedTitle}`,
        Body: response.data,
        ContentType: contentType,
      };

      await S3.putObject(params).promise();
      url = `https://${BUCKET_NAME}.s3.eu-north-1.amazonaws.com/reports/${timestampedTitle}`;
      console.log(`✅ S3 upload complete: ${url}`);
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

    console.log(`📤 Sending to API for ${company} ...`);
    const res = await axios.post(
      "https://eprid4tv0b.execute-api.eu-west-1.amazonaws.com/final/rag-ingestor",
      reqBody,{timeout: 20000}
    );

    console.log(`🎉 API response for ${company}: ${res.status} ${res.statusText}`);

    const resultCollection = mongoClient.db("main_stock_list").collection("api_responses");
    await resultCollection.insertOne({
      company,
      response: res.data,
      timestamp: new Date(),
      url: ogurl,
    });

    console.log(`✅ Saved API response for ${company} to MongoDB\n${"-".repeat(40)}`);
  } catch (err) {
    console.error(`❌ Error with ${company}: ${err.message}\n${"-".repeat(40)}`);
  }
}


  try {
    await mongoClient.connect();
    console.log("🟢 Connected to MongoDB");

    await loadFavicons();

    const mainCollection = mongoClient.db("main_stock_list").collection("main_stock_list");
    const responseCollection = mongoClient.db("main_stock_list").collection("api_responses");

    
    let companies = await mainCollection.find({}).toArray()
    companies=companies.slice(30000);
    let existingResponse = await responseCollection.find({}).toArray()
    existingResponse=existingResponse.map((i) => i.url);

    console.log("\n⚙️ Starting parallel processing with 2 concurrent tasks...");
    const limit = pLimit(3);

    const tasks = companies.map((company) =>
      limit(async () => {
        const url = company.source_url;
        const existing = existingResponse.find((i) => i === url);

        if (existing) {
          // console.log(`🔄 Already processed: ${company.Name}`);
          return;
        }

        await processCompany(company);
      })
    );

    await Promise.all(tasks);

    console.log("\n✅ All done!");
  } catch (err) {
    console.error("❌ Main Error:", err.message);
  } finally {
    await mongoClient.close();
    console.log("🔒 MongoDB connection closed");
  }
