import { MongoClient } from "mongodb";
import express from "express";

const app=express()
const client= new MongoClient("mongodb+srv://mohanavamsi14:vamsi@cluster0.3huumg1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
await client.connect();
const final=client.db("final_record").collection("main_stock_list")
app.get("/",(req,res)=>{
    res.send("working...")
})    
app.get("/all",async(req,res)=>{
    const all_stocks=await final.find({}).toArray()
    res.send(all_stocks)
})
app.listen(6000,()=>{
    console.log("ewfj")
})    
