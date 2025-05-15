async function getFaviconUrl(websiteUrl, name) {
  try {
    const response = await axios.get(websiteUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);

    // Collect all favicon candidates
    const links = $("link[rel*='icon']");
    let bestIcon = null;

    links.each((_, el) => {
      const href = $(el).attr("href");
      const sizes = $(el).attr("sizes");

      if (href) {
        const isPngOrSvg = href.endsWith(".png") || href.endsWith(".svg");
        const sizeValue = sizes ? parseInt(sizes.split("x")[0], 10) || 0 : 0;

        // Prefer high-res PNG/SVG over ICO
        if (!bestIcon || (isPngOrSvg && sizeValue >= 32)) {
          bestIcon = href;
        }
      }
    });

    if (bestIcon) {
      const fullUrl = new URL(bestIcon, websiteUrl).href;
      const fileExt = bestIcon.endsWith(".svg") ? "svg+xml" :
                      bestIcon.endsWith(".png") ? "png" :
                      bestIcon.endsWith(".jpg") ? "jpeg" :
                      "x-icon";

      const iconData = await axios.get(fullUrl, { responseType: "arraybuffer" });

      await S3.putObject({
        Bucket: BUCKET,
        Key: `favicons/${name}.${fileExt === 'x-icon' ? 'ico' : 'png'}`,
        Body: iconData.data,
        ContentType: `image/${fileExt}`,
      }).promise();

      return `https://${BUCKET}.s3.eu-north-1.amazonaws.com/favicons/${name}.${fileExt === 'x-icon' ? 'ico' : 'png'}`;
    } else {
      return "not found";
    }

  } catch (err) {
    console.error("Favicon fetch error for", websiteUrl, err.message);
    return "not found";
  }
}
