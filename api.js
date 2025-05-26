import { MongoClient } from "mongodb";
import express from "express";

const app = express();
const client = new MongoClient("mongodb+srv://mohanavamsi14:vamsi@cluster0.3huumg1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

await client.connect(); // Top-level await only works with ES modules
const final = client.db("final_record").collection("main_stock_list");

app.get("/", (req, res) => {
    res.send("working...");
});

app.get("/all", async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const skip = page * 100;
    const all_stocks = await final.find({})
                                   .skip(skip)
                                   .limit(100)
                                   .toArray();
    res.send(all_stocks);
});

app.listen(6500, () => {
    console.log("Server running on http://localhost:6500");
});
