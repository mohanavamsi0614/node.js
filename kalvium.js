import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

const AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0";


app.get("/microsoft", (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        response_type: "code",
        redirect_uri: process.env.REDIRECT_URI,
        response_mode: "query",
        scope: "openid profile email offline_access User.Read Mail.Read Calendars.Read",
        prompt: "consent"
    });

    res.redirect(`${AUTH_BASE}/authorize?${params.toString()}`);
});


app.get("/auth/microsoft/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send("No code");

    try {
        const tokenRes = await axios.post(
            `${AUTH_BASE}/token`,
            new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
                redirect_uri: process.env.REDIRECT_URI
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const { access_token, refresh_token } = tokenRes.data;

        // 👤 Profile
        const profile = await axios.get("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const user = {
            name: profile.data.displayName,
            email: profile.data.mail || profile.data.userPrincipalName
        };

        const params = new URLSearchParams({
            access_token,
            refresh_token,
            name: user.name,
            email: user.email
        });

        res.redirect(`/#${params.toString()}`);

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.redirect("/#error=auth_failed");
    }
});

app.post("/mail", async (req, res) => {
    const { access_token } = req.body;

    try {
        const mails = await axios.get(
            "https://graph.microsoft.com/v1.0/me/messages?$select=subject,from,receivedDateTime&$top=10",
            {
                headers: { Authorization: `Bearer ${access_token}` }
            }
        );

        res.json(mails.data);

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send("Mail fetch failed");
    }
});

app.post("/calendar", async (req, res) => {
    const { access_token } = req.body;

    try {
        const events = await axios.get(
            "https://graph.microsoft.com/v1.0/me/events?$top=10",
            {
                headers: { Authorization: `Bearer ${access_token}` }
            }
        );

        res.json(events.data);

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send("Calendar fetch failed");
    }
});


app.post("/refresh-token", async (req, res) => {
    const { refresh_token } = req.body;

    try {
        const tokenRes = await axios.post(
            `${AUTH_BASE}/token`,
            new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                refresh_token,
                grant_type: "refresh_token",
                scope: "openid profile email offline_access User.Read Mail.Read Calendars.Read",
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        res.json({
            access_token: tokenRes.data.access_token,
            refresh_token: tokenRes.data.refresh_token || refresh_token
        });

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send("Refresh failed");
    }
});

app.listen(3000, () => console.log("🚀 Running on 3000"));
