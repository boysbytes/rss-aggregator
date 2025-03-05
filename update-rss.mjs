import fs from 'fs';
import fetch from 'node-fetch';
import { DOMParser } from 'xmldom';

async function fetchAndGenerateHtml() {
  // Load RSS sources from rss-sources.json
  const feeds = JSON.parse(fs.readFileSync('rss-sources.json', 'utf8'));

  const parser = new DOMParser();
  let allItems = [];

  for (const feed of feeds) {
    try {
      const response = await fetch(feed);
      const text = await response.text();
      const xml = parser.parseFromString(text, "application/xml");

      const websiteTitle = xml.querySelector("channel > title").textContent;

      const items = Array.from(xml.querySelectorAll("item")).map(item => {
        let imageUrl = null;

        const description = item.querySelector("description");
        if (description && description.textContent) {
          const imgMatch = description.textContent.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) imageUrl = imgMatch[1];
        }

        const cleanDescription =
          description?.textContent.replace(/<img[^>]*>/g, "") || "";

        return {
          title: item.querySelector("title").textContent,
          link: item.querySelector("link").textContent,
          pubDate: new Date(item.querySelector("pubDate").textContent),
          description: cleanDescription,
          imageUrl,
          websiteTitle
        };
      });

      allItems = allItems.concat(items);
    } catch (error) {
      console.error(`Error fetching feed ${feed}:`, error);
    }
  }

  // Sort items by publication date in descending order
  allItems.sort((a, b) => b.pubDate - a.pubDate);

  // Limit to the latest 20 entries
  allItems = allItems.slice(0, 20);

  // Generate HTML content
  const htmlContent = allItems.map(item => `
    <div class="feed-item">
      <h2><a href="${item.link}" target="_blank">${item.title}</a></h2>
      <p><strong>${item.websiteTitle}</strong></p>
      <p>${item.pubDate.toLocaleDateString()}</p>
      ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}">` : ""}
      <p>${item.description}</p>
    </div>
  `).join("");

  // Update index.html with the new content
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const updatedHtml = indexHtml.replace('<div id="rss-feed"></div>', `<div id="rss-feed">${htmlContent}</div>`);
  fs.writeFileSync('index.html', updatedHtml);
}

fetchAndGenerateHtml().catch(console.error);
