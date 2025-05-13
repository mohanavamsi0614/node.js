const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(express.json()); // Middleware to parse JSON body

// Route: POST /search
app.post('/search', async (req, res) => {
  const { Name, Country } = req.body;

  if (!Name || !Country) {
    return res.status(400).json({ error: "Missing 'Name' or 'Country' in request." });
  }

  try {
    const query = `${Name} official website in ${Country}`;
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
    };

    const response = await axios.get(searchUrl, { headers });
    const $ = cheerio.load(response.data);
    const links = [];

    $('a.result__a').each((i, elem) => {
      if (i >= 5) return false;

      const href = $(elem).attr('href');
      const title = $(elem).text();

      if (href.startsWith('http')) {
        links.push({ title, url: href });
      }
    });

    res.json({
      company: Name,
      country: Country,
      results: links
    });
  } catch (error) {
    console.error('Scraping Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch search results.' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
