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
        scope: "openid profile email offline_access User.Read Mail.Read Mail.ReadWrite Mail.Send Calendars.Read Calendars.ReadWrite Calendars.ReadWrite.Shared",
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

app.post("/read_mail", async (req, res) => {
    const { access_token } = req.body;
    const {nextUrl}=req.query
    const url=nextUrl ? decodeURIComponent(nextUrl):"https://graph.microsoft.com/v1.0/me/messages?$top=10&$orderby=receivedDateTime DESC"
    try {
        const mails = await axios.get(
            url,
            {
                headers: { Authorization: `Bearer ${access_token}` }
            }
        );

        res.json({data:mails.data,nextUrl:mails.data["@odata.nextLink"]||null });

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).send("Mail fetch failed");
    }
});
app.post("/create_event", async (req, res) => {
  try {
    const { access_token, subject, body, start, end } = req.body;

    if (!access_token || !subject || !start || !end) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject: subject,
          body: {
            contentType: "HTML",
            content: body || ""
          },
          start: {
            dateTime: start,       // "2026-05-06T10:00:00"
            timeZone: "Asia/Kolkata"
          },
          end: {
            dateTime: end,
            timeZone: "Asia/Kolkata"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json({ success: true, event: data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create event" });
  }
});
app.post("/get_mail/:id", async (req, res) => {
  try {
    const {accessToken} = req.body;
    const { id } = req.params;

    if (!accessToken || !id) {
      return res.status(400).json({ error: "Missing token or message id" });
    }

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mail" });
  }
});


app.post("/mark_as_read",async(req,res)=>{
        const { access_token,message_id } = req.body;
        const url=`https://graph.microsoft.com/v1.0/me/messages/${message_id}`
        const data=await axios.patch(
            url,
            {
                isRead: true
            },
            {
                headers:{
                    Authorization: `Bearer ${access_token}`
                }
            }
        )
        res.json({data:JSON.stringify(data.data)})
})

app.post("/send_mail", async (req, res) => {
  try {
    const { access_token, subject, body, emails } = req.body;

    if (!access_token || !subject || !body || !emails?.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: {
            subject: subject,
            body: {
              contentType: "HTML",
              content: body
            },
            toRecipients: emails.map(email => ({
              emailAddress: {
                address: email
              }
            }))
          }
        })
      }
    );

    if (response.status === 202) {
      return res.json({ success: true, message: "Mail sent 🚀" });
    }

    const error = await response.json();
    return res.status(500).json({ error });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
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