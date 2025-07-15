import { MongoClient } from 'mongodb';
import express from "express"
const client=new MongoClient("mongodb+srv://mohanavamsi14:vamsi@cluster0.m8goeuw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
const news_client=new MongoClient("mongodb+srv://mohanavamsi14:vamsi@cluster.74mis.mongodb.net/?retryWrites=true&w=majority&appName=Cluster")
await news_client.connect()
const news_db=news_client.db("stocksDB")
const news_data=news_db.collection("Web_links_all_stock_list")
await client.connect();
const db=client.db("all_stock_list")
const collection=db.collection("api_responses");

const app = express();
app.use(express.json());    
app.get("/",(req,res)=>{
    res.send("Welcome to the MongoDB API");
})
app.post("/news",async (req,res)=>{
    const name=req.body.name;
    const check = await  news_data.findOne({name:name})
    const data=check.links.slice(0,20)
    return res.json({links:data})
})
app.post("/get", async (req, res) => {
    try {
        const { url } = req.body;
        const check = await collection.findOne({ url });
        res.json({ status: check ? "success" : "not found" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.post("/add",async (req,res)=>{
    const {symbol,name,link,id,length}=req.body;
    const check=await collection.insertOne({symbol, name, link, id,length});
    res.json({
        status: "success",
    });
})

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
