import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
app.use(express.json());

const searchDuckDuckGo = async (name, country) => {
  const query = `${name} official website in ${country}`;
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
  };

  const { data } = await axios.get(searchUrl, { headers });
  const $ = cheerio.load(data);

  const links = [];
  $('a.result__a').each((i, el) => {
    if (i >= 5) return false;
    const url = $(el).attr('href');
    const title = $(el).text();
    if (url && url.startsWith('http')) {
      links.push({ title, url });
    }
  });

  return links;
};

app.post('/search', async (req, res) => {
  const { Name, Country } = req.body;

  if (!Name || !Country) {
    return res.status(400).json({ error: "Missing 'Name' or 'Country' in body." });
  }

  try {
    const results = await searchDuckDuckGo(Name, Country);
    res.json({ company: Name, country: Country, results });
  } catch (error) {
    console.error('❌ Scraper error:', error.message);
    res.status(500).json({ error: 'Scraping failed.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
