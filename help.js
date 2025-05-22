import express from "express";
import axios from "axios"; // <-- You missed this import

const app = express();

app.get("/", (req, res) => {
  res.send("efwkb");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

// Use setInterval with async function
setInterval(async () => {
  try {
    await axios.get("https://node-js-1-lmr5.onrender.com");
    await axios.get("https://node-js-2-c0tc.onrender.com");
    // await axios.get("https://node-js-cvcm.onrender.com");
    // await axios.get("https://node-js-3-4417.onrender.com");
    console.log("Pinged both servers");
  } catch (err) {
    console.error("Error pinging servers:", err.message);
  }
}, 20000);
