import { MongoClient } from 'mongodb';
import express from "express"
const client=new MongoClient("mongodb+srv://mohanavamsi14:vamsi@cluster0.m8goeuw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
const news_cllient=new MongoClient("mongodb+srv://mohanavamsi14:vamsi@cluster.74mis.mongodb.net/?retryWrites=true&w=majority&appName=Cluster")
 await news_client.connect(
 const news_db=news_cllient.db("stocksDB")
 const news_data=news_db.collection("Web_links_all_stock_list")
await client.connect();
const db=client.db("all_stock_list")
const collection=db.collection("api_responses");

const app = express();
app.use(express.json());    
app.get("/",(req,res)=>{
    res.send("Welcome to the MongoDB API");
})
app.post("/news",(req,res)=>{
    const name=req.body.name;
    const check = await  news_data.findOne({name:name})
    res.json(check.links.slice(20))
}
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
