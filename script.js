const feeds = [
  "https://boysbytes.github.io/day-dots-jekyll/feed.xml" // Add your RSS feed URLs here
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

      const items = Array.from(xml.querySelectorAll("item")).map(item => {
        let imageUrl = null;

        const description = item.querySelector("description");
        if (description && description.textContent) {
          const imgMatch = description.textContent.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) imageUrl = imgMatch[1];
        }

        const cleanDescription = description?.textContent.replace(/<img[^>]*>/g, "") || "";

        return {
          title: item.querySelector("title").textContent,
          link: item.querySelector("link").textContent,
          pubDate: new Date(item.querySelector("pubDate").textContent),
          description: cleanDescription,
          imageUrl
        };
      });

      allItems = allItems.concat(items);
    } catch (error) {
      console.error(`Error fetching feed ${feed}:`, error);
    }
  }

  allItems.sort((a, b) => b.pubDate - a.pubDate);

  container.innerHTML = allItems.map(item => `
    <div class="feed-item">
      <h2><a href="${item.link}" target="_blank">${item.title}</a></h2>
      <p>${item.pubDate.toLocaleString()}</p>
      ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}">` : ""}
      <p>${item.description}</p>
    </div>
  `).join("");
}

fetchAndDisplayFeeds();
