import fs from "fs";
import axios from "axios";
import { MongoClient } from "mongodb";
import AWS from "aws-sdk";
import mime from "mime-types";
import { readFile } from "fs/promises";
import pLimit from "p-limit";
import dotenv from "dotenv";
import express from "express";

const app=express()
app.get("/",(req,res)=>{
  res.send("ewno")})
app.listen(6600,(req,res)=>{
  console.log("server runingg..")
})

dotenv.config();

// AWS S3 Setup
const S3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "eu-north-1"
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

  try {
    console.log(`\n🚀 Processing: ${company}`);

    if (!url.endsWith(".pdf") && !url.endsWith(".PDF")) {
      console.log(`🌐 Downloading from: ${url}`);
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000
      });

      const contentType =
        response.headers["content-type"] || mime.lookup(url) || "application/octet-stream";
      console.log(`📦 Uploading to S3 as ${contentType} ...`);

      const params = {
        Bucket: BUCKET_NAME,
        Key: `reports/${title}`,
        Body: response.data,
        ContentType: contentType
      };

      await S3.putObject(params).promise();
      url = `https://${BUCKET_NAME}.s3.eu-north-1.amazonaws.com/reports/${title}`;
      console.log(`✅ S3 upload complete: ${url}`);
    } else {
      console.log(`📄 Skipping PDF for ${company}`);
    }

    const reqBody = {
      company,
      industry,
      sector,
      title,
      link: url,
      url,
      favicon,
      flag: "test1505"
    };

    console.log(`📤 Sending to API for ${company} ...`);
    const res = await axios.post(
      "https://eprid4tv0b.execute-api.eu-west-1.amazonaws.com/final/rag-ingestor",
      reqBody
    );

    console.log(`🎉 API response for ${company}: ${res.status} ${res.statusText}`);

    const resultCollection = mongoClient.db("main_stock_list").collection("api_responses");
    await resultCollection.insertOne({
      company,
      response: res.data,
      timestamp: new Date(),
      url:url
    });

    console.log(`✅ Saved API response for ${company} to MongoDB\n${"-".repeat(40)}`);
  } catch (err) {
    console.error(`❌ Error with ${company}: ${err.message}\n${"-".repeat(40)}`);
  }
}

async function main() {
  try {
    await mongoClient.connect();
    console.log("🟢 Connected to MongoDB");

    await loadFavicons();

    const mainCollection = mongoClient.db("main_stock_list").collection("main_stock_list");
    const responseCollection = mongoClient.db("main_stock_list").collection("api_responses");

    const companies = await mainCollection.find({}).toArray();

    console.log("\n⚙️ Starting parallel processing with 10 concurrent tasks...");
    const limit = pLimit(5);

    const tasks = companies.map((company) =>
      limit(async () => {
        const url = company.source_url;
        const existing = await responseCollection.findOne({
          url: url
        });

        if (existing) {
          console.log(`⏩ Skipping ${company.Name}, link already processed.`);
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
}


main();
