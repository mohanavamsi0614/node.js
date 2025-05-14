const { MongoClient } = require("mongodb");
const AWS = require("aws-sdk");
const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");
const express=require("express")
const app=express()
const dot=require("dotenv").config()
app.get("/",(req,res)=>{
  res.send("wqkjb")
})
app.listen(6500,()=>{
  console.log("runinng...")})

// AWS S3 Setup
const S3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "eu-north-1",
});

// MongoDB Setup
const MONGO_URI = "mongodb+srv://mohanavamsi14:vamsi@cluster.74mis.mongodb.net/?retryWrites=true&w=majority&appName=Cluster";
const client = new MongoClient(MONGO_URI);

async function getFaviconUrl(websiteUrl) {
  try {
    const response = await axios.get(websiteUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    let iconLink = $("link[rel='icon'], link[rel='shortcut icon']").attr("href");

    if (iconLink) {
      const fullUrl = new URL(iconLink, websiteUrl).href;
      const iconData = await axios.get(fullUrl, { responseType: "arraybuffer" });

      const hostname = new URL(websiteUrl).hostname;
      await S3.putObject({
        Bucket: "mainstocklist",
        Key: `favicons/${hostname}.ico`,
        Body: iconData.data,
        ContentType: "image/x-icon",
      }).promise();

      return fullUrl;
    } else {
      return "not found";
    }
  } catch (err) {
    return "not found";
  }
}

async function updateFaviconData() {
  try {
    await client.connect();
    const db = client.db("financial_reports");
    const collection = db.collection("symbols_main_stock_list");

    const stocks = await collection.find({}).toArray();

    for (const stock of stocks) {
      const id = stock._id;
      const websiteUrl = stock.link;

      if (!websiteUrl || websiteUrl === "") {
        console.log(`No website for ${stock.name}, setting link and favicon as 'not found'`);
        await collection.updateOne({ _id: id }, {
          $set: { link: "not found", favicon: "not found" }
        });
        continue;
      }

      const faviconUrl = await getFaviconUrl(websiteUrl);
      await collection.updateOne({ _id: id }, {
        $set: { favicon: faviconUrl }
      });

      console.log(`Updated favicon for ${stock.name}: ${faviconUrl}`);
    }

  } catch (err) {
    console.error("Error updating favicons:", err);
  } finally {
    await client.close();
  }
}

updateFaviconData();
