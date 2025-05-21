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
    await axios.get("https://node-js-2-xvhk.onrender.com");
    await axios.get("https://node-js-cvcm.onrender.com");
    console.log("Pinged both servers");
  } catch (err) {
    console.error("Error pinging servers:", err.message);
  }
}, 20000);
