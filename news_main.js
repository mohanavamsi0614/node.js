import axios from "axios";
import { MongoClient } from "mongodb";
import fs from "fs/promises"
import express from "express"

const app=express()
app.get("/",(req,res)=>{
    res.send("working...")
})
app.listen(6000,()=>{
    console.log("ewfj")
})
const MONGO_URI = "mongodb+srv://mohanavamsi14:vamsi@cluster0.3huumg1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "main_stock_list";
const COLLECTION_NAME = "news";

const client = new MongoClient(MONGO_URI)
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);


let exist=await collection.find({}).toArray()
exist=exist.map((i)=>i.symbol)
const all_stocks=await fs.readFile("./main_stocks.json","utf-8")

console.log("loaded")
for (let stock of all_stocks){
    if (exist.includes(stock.Symbol)) continue;
    const {Industry,Name,Sector,Symbol}=stock
    const api=`https://stockanalysis.com/fetch/infinitenews?type=s&symbol=${Symbol}`
    let res=await axios.get(api)
    res=res.data.data.map((i)=>{return {url:i.url,title:i.title}})
    await collection.insertOne({
        symbol:Symbol,
        name:Name,
        sector:Sector,
        industry:Industry,
        links:res
    })
    console.log("done for ",Name)
}
console.log("goood")
