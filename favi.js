import { MongoClient } from "mongodb";
import AWS from "aws-sdk";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs/promises"
import express from "express"

const app=express()

app.get("/",(req,res)=>{
  res.send("ewfbj")})
app.listen(6500,()=>{
  console.log("listening")
})

dotenv.config();

// AWS S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "eu-north-1",
});

const stocks=JSON.parse(await fs.readFile("./main_stocks.json", "utf-8"));

// MongoDB Configuration
const uri = "mongodb+srv://mohanavamsi14:vamsi@cluster0.3huumg1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);
await client.connect();
const db = client.db("main_stock_list");
const collection = db.collection("main_stock_list");

for (let stock of stocks) {
  const symbol = stock.Symbol;
  const {Country,Industry,Sector} = stock;
  const existingDoc = await collection.findOne({
    Name:stock.Name})
    if (existingDoc) {
    console.log(`Document with symbol ${symbol} already exists. Skipping...`);
    continue;
    }
    console.log(`Processing stock: ${stock.Name} (${symbol})`);
    const response = await axios.get(
      `https://financialmodelingprep.com/stable/sec-filings-search/symbol?symbol=${symbol}&from=1960-01-01&to=2025-01-01&apikey=5a42ba792eb59c0e2e3f5375c0bebeea`
    )
    const data = response.data;
    for (let i of data){
        const {formType,finalLink}=i
        await collection.insertOne({
            Name: stock.Name,
            Symbol: symbol,
            title: formType,
            source_url: finalLink,
            source_website:finalLink
            ,Country,Industry,Sector
        })
        console.log(`Inserted document for ${stock.Name} (${symbol}) with form type ${formType}`);
    }
    console.log(`Completed processing for ${stock.Name} (${symbol})`);
}
console.log("All stocks processed successfully.");
