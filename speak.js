const express=require("express")
const multer=require("multer")
const fs=require("fs")
const cors=require("cors")
const fetch=require("node-fetch")


const app=express()
const upload=multer({storage:multer.memoryStorage()})

app.use(cors())
app.post("/upload",upload.single("file"),async(req,res)=>{
    if(!req.file){
        return res.status(400).send("No file uploaded.")
    }
    const fileBuffer=req.file.buffer
    const buffer=Buffer.from(fileBuffer)
    const base64=buffer.toString("base64")
    try {
        const response = await fetch("https://apis.languageconfidence.ai/speech-assessment/scripted/us", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": "cCVZmyWqLLyv4LWX9qo4VFMJU8Ni32jZ",
                "x-user-id": "vamsi"
            },
            body: JSON.stringify({audio_base64:base64,
            expected_text:req.body.expected_text,audio_format:"webm"})
        });

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
})

app.listen(6300,()=>{
    console.log("Server started on http://localhost:6300")
})
