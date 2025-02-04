import express from "express"
import puppeteer from "puppeteer";
import cors from 'cors'
const app = express();

app.use(express.json());
app.use(cors())

function generateHTML(title, authors, summary) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Styled Document</title>
        <style>
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                font-family: Roboto, Helvetica Neue, Arial, sans-serif;
            }
            body {
                background-color: #f8f9fa;
                color: #2e414f;
                line-height: 1.6;
                height:100vh;
                padding: 20px;
            }
            header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 20px;
                background-color: #fff;
                border-bottom: 1px solid #e0e0e0;
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
                margin-bottom: 20px;
            }
            h1 {
                line-height: 40px;
                margin-bottom: 20px;
            }
            input {
                padding: 8px;
                border: 1px solid #ccc;
                width: 100%;
                margin-bottom: 10px;
            }
            .container {
                background-color: #ebeced;
                width: 100%;
                justify-content: space-around;
                align-items: center;
                display: flex;
                padding: 20px;
                border-radius: 10px;
            }
            .det {
                font-weight: lighter;
                margin-bottom: 10px;
            }
            .header-buttons button {
                margin-left: 5px;
                padding: 8px 12px;
                border-radius: 5px;
                cursor: pointer;
            }
            .header-buttons .sign-in {
                color: #0f3875;
                border: 1px solid #0f3875;
            }
            .header-buttons .create-account {
                background-color: #0f3875;
                color: white;
                border: none;
            }
            .actions div {
                color: #1857b5;
                cursor: pointer;
                margin: 5px;
            }
            .actions .view-on-sage {
                background-color: #1857b5;
                color: white;
                padding: 4px;
                border-radius: 10px;
            }
        </style>
    </head>
    <body>
        <header>
            <img src="./image1.png" alt="Logo" style="width: 250px;">
            <div style="width: 100%; display: flex;">
                <input placeholder="Search"/>
                <button style="border: none; background-color: #f5d45f; padding: 8px;">Search</button>
            </div>
            <div class="header-buttons" style="display: flex;">
                <button class="sign-in">Sign In</button>
                <button class="create-account">Create a Free Account</button>
            </div>
        </header>
        <div class="container">
            <div style="width: 750px;">
                <h1>${title}</h1>
                <div style="display: flex;" class="det">
                    <p>${authors}</p>
                    <p>Jun 2024</p>
                </div>
                <div>
                    <p>${summary}</p>
                </div>
                <div class="actions" style="display: flex; justify-content: space-evenly;">
                    <div class="view-on-sage">View on SAGE</div>
                    <div>Save to Library</div>
                    <div>Create Alert</div>
                    <div>Cite</div>
                </div>
            </div>
            <div>
                <img src='./image.png' style="width: 340px;"/>
            </div>
        </div>
    </body>
    </html>
    `;
}

app.post("/generate-screenshot", async (req, res) => {
    try {
        const { title, authors, summary } = req.body;

        if (!title || !authors || !summary) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const htmlContent = generateHTML(title, authors, summary);
        await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
        const screenshot = await page.screenshot({ encoding: "base64" });
        await browser.close();
        res.json(`data:image/png;base64,${screenshot}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error: " + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});