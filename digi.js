import express from "express";
import axios from "axios";
import crypto from "crypto";
import { write, writeFile } from "fs";

const app = express();

const CLIENT_ID = "MC549CEC19";
const sercreat_id="f350db1866d7ecbb4454"
const REDIRECT_URI = "http://localhost:3000/auth/digilocker/callback";

// ---- helpers ----
function base64URLEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest();
}

// ⚠️ in-memory (dev only)
let store = {};

// ---- STEP 1: Redirect to DigiLocker ----
app.get("/", (req, res) => {
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(sha256(codeVerifier));
  const state = crypto.randomBytes(16).toString("hex");

  store[state] = { codeVerifier };

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const url =
    "https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize?" +
    params.toString();

  res.redirect(url);
});

// ---- STEP 2: Callback ----
app.get("/auth/digilocker/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;
    console.log(code)
    if (error) {
      return res.send(`OAuth Error ❌: ${error}`);
    }

    if (!code || !state) {
      return res.send("Missing code/state ❌");
    }

    const session = store[state];

    if (!session) {
      return res.send("Invalid state ❌");
    }

    const { codeVerifier } = session;

    // ---- STEP 3: Token Exchange ----
    const tokenRes = await axios.post(
      "https://api.digitallocker.gov.in/public/oauth2/1/token",
      new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        client_secret: sercreat_id,
        code_verifier: codeVerifier,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token } = tokenRes.data;
    console.log(access_token)

    // ---- STEP 4: Get Documents ----
    const docsRes = await axios.get(
      "https://digilocker.meripehchaan.gov.in/public/oauth2/1/files/issued",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );
    console.log(docsRes)
    res.json(docsRes.data)
  } catch (err) {
    writeFile("text.html",err.response?.data || err.message,(err)=>{console.log(err)})
    // console.error(err.response?.data || err.message);
    res.send("Error ❌ Check console");
  }
});

app.listen(3000, () => {
  console.log("🚀 Running at http://localhost:5000");
});
