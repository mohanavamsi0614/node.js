import { YoutubeTranscript } from "youtube-transcript";
import OpenAI from "openai";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import eventRoutes from "./routes/eventRoutes";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

let openai = new OpenAI({ apiKey: process.env.api, dangerouslyAllowBrowser: true });

async function convert(url) {
        messages: [
            {
                role: "user",
                content: response + "\n hey convert this into telugu and add some details and make that look comfortable for people in a clean manner"
            }
        ]
    });
    return completion.choices[0].message.content;
}

app.post("/", async (req, res) => {
    const { url } = req.body;
    try {
        const data = await convert(url);
        res.send(data);
    } catch (error) {
        console.log(error)
        res.status(500).send("Error processing request");
    }
});

app.listen(5000, () => {
    console.log("listening");
});