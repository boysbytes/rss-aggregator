const feeds = [
  "https://boysbytes.github.io/day-dots-jekyll/feed.xml", // Add your RSS feed URLs here
  "https://simonwillison.net/atom/everything/"
  // Here's an example "<rss-feed01>", "rss-feed02>"
];

async function fetchAndDisplayFeeds() {
  const parser = new DOMParser();
  const container = document.getElementById("rss-feed");
  let allItems = [];

  for (const feed of feeds) {
    try {
      const response = await fetch(feed);
      const text = await response.text();
      const xml = parser.parseFromString(text, "application/xml");

      // Extract website title from <channel><title>
      const websiteTitle = xml.querySelector("channel > title").textContent;

      const items = Array.from(xml.querySelectorAll("item")).map(item => {
        let imageUrl = null;

        // Extract the first <img> tag from the <description> field
        const description = item.querySelector("description");
        if (description && description.textContent) {
          const imgMatch = description.textContent.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) imageUrl = imgMatch[1];
        }

        // Remove any img tags from the description to avoid showing thumbnails
        const cleanDescription = description?.textContent.replace(/<img[^>]*>/g, "") || "";

        return {
          title: item.querySelector("title").textContent,
          link: item.querySelector("link").textContent,
          pubDate: new Date(item.querySelector("pubDate").textContent),
          description: cleanDescription,
          imageUrl,
          websiteTitle // Add website title to each item
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

  // Display the sorted items
  container.innerHTML = allItems.map(item => `
    <div class="feed-item">
      <h2><a href="${item.link}" target="_blank">${item.title}</a></h2>
      <p><strong>${item.websiteTitle}</strong></p>
      <p>${item.pubDate.toLocaleDateString()}</p> <!-- Show only date -->
      ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}">` : ""}
      <p>${item.description}</p>
    </div>
  `).join("");
}

fetchAndDisplayFeeds();
