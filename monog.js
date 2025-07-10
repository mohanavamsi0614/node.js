import { MongoClient } from 'mongodb';
import express from "express"
const client=new MongoClient("mongodb+srv://mohanavamsi14:vamsi@cluster0.m8goeuw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
await client.connect();
const db=client.db("all_stock_list")
const collection=db.collection("api_responses");

const app = express();
app.use(express.json());    
app.get("/",(req,res)=>{
    res.send("Welcome to the MongoDB API");
})
app.post("/get",async (req,res)=>{
    const url=req.body.url;
    const check=await collection.findOne({url: url
    });
    if(check){
        res.json({
            status: "success",
        });
    }        
    res.json({
        status: "not found",
    });
})
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
