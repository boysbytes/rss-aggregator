import fs from 'fs/promises';
import fetch from 'node-fetch';
import { DOMParser } from 'xmldom';

// Load RSS sources from JSON file
const loadRssSources = async () => {
  const data = await fs.readFile('rss-sources.json', 'utf8');
  return JSON.parse(data);
};

// Fetch and aggregate RSS/Atom feeds
const fetchAndAggregateFeeds = async (feeds) => {
  const parser = new DOMParser();
  let allItems = [];

  for (const feed of feeds) {
    try {
      const response = await fetch(feed);
      const text = await response.text();
      const xml = parser.parseFromString(text, "application/xml");

      // Check if feed is Atom or RSS
      const isAtom = xml.documentElement.nodeName === "feed";

      const websiteTitle = isAtom
        ? xml.querySelector("feed > title").textContent
        : xml.querySelector("channel > title").textContent;

      const items = Array.from(
        isAtom ? xml.querySelectorAll("entry") : xml.querySelectorAll("item")
      ).map(item => {
        let imageUrl = null;

        // Extract image from description/content
        const description = isAtom
          ? item.querySelector("content")?.textContent || ""
          : item.querySelector("description")?.textContent || "";

        if (description) {
          const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) imageUrl = imgMatch[1];
        }

        // Remove img tags from description/content
        const cleanDescription = description.replace(/<img[^>]*>/g, "");

        return {
          title: item.querySelector("title").textContent,
          link: isAtom
            ? item.querySelector("link[rel='alternate']")?.getAttribute("href")
            : item.querySelector("link").textContent,
          pubDate: new Date(
            isAtom
              ? item.querySelector("updated").textContent
              : item.querySelector("pubDate").textContent
          ),
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
  return allItems.slice(0, 20);
};

// Update index.html with aggregated content
const updateHtmlFile = async () => {
  try {
    const feeds = await loadRssSources();
    const aggregatedFeeds = await fetchAndAggregateFeeds(feeds);

    // Generate HTML content for aggregated feeds
    const htmlContent = aggregatedFeeds.map(item => `
      <div class="feed-item">
        <h2><a href="${item.link}" target="_blank">${item.title}</a></h2>
        <p><strong>${item.websiteTitle}</strong></p>
        <p>${item.pubDate.toLocaleDateString()}</p>
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}">` : ""}
        <p>${item.description}</p>
      </div>
    `).join("");

    // Update index.html with the new content
    let indexHtml = await fs.readFile('index.html', 'utf8');
    indexHtml = indexHtml.replace(
      /<div id="rss-feed">.*<\/div>/s,
      `<div id="rss-feed">${htmlContent}</div>`
    );
    await fs.writeFile('index.html', indexHtml);

    console.log("RSS feed aggregation completed successfully.");
  } catch (error) {
    console.error("Error updating HTML file:", error);
  }
};

updateHtmlFile();
