import { YoutubeTranscript } from "youtube-transcript";
import OpenAI from "openai";
import express from "express";
import cors from "cors";
const app = express();
app.use(express.json());
app.use(cors());
let api = "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";
let openai = new OpenAI({ apiKey: api, dangerouslyAllowBrowser: true });

async function convert(url) {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    let response = transcript.map((i) => i.text).join(" ");
    const completion = await openai.chat.completions.create({
        model: "o1-mini",
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
        res.status(500).send("Error processing request");
    }
});

app.listen(5000, () => {
    console.log("listening");
});