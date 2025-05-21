import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import https from "https";

async function scraper(link) {
  const baseUrl = link;

  try {
    const response = await axios.get(baseUrl, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    const $ = cheerio.load(response.data);

    const links = [];
    $("a").each((_, element) => {
      const href = $(element).attr("href");
      if (href) {
        links.push(new URL(href, baseUrl).href);
      }
    });

    return links;
  } catch (error) {
    console.error("Error fetching the page:", error.message);
    return [];
  }
}

export default scraper
