async function fetchAndDisplayFeeds() {
  const parser = new DOMParser();
  const container = document.getElementById("rss-feed");
  let allItems = [];

  try {
    // Fetch RSS sources from rss-sources.json
    const response = await fetch("rss-sources.json");
    const feeds = await response.json();

    for (const feed of feeds) {
      try {
        const feedResponse = await fetch(feed);
        const text = await feedResponse.text();
        const xml = parser.parseFromString(text, "application/xml");

        // Check if the feed is Atom or RSS based on root element
        const isAtom = xml.documentElement.nodeName === "feed";

        const websiteTitle = isAtom
          ? xml.querySelector("feed > title").textContent
          : xml.querySelector("channel > title").textContent;

        const items = Array.from(
          isAtom ? xml.querySelectorAll("entry") : xml.querySelectorAll("item")
        ).map(item => {
          let imageUrl = null;

          // Extract image from description/content (RSS or Atom)
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
    allItems = allItems.slice(0, 20);

    // Display the sorted items
    container.innerHTML = allItems.map(item => `
      <div class="feed-item">
        <h2><a href="${item.link}" target="_blank">${item.title}</a></h2>
        <p><strong>${item.websiteTitle}</strong></p>
        <p>${item.pubDate.toLocaleDateString()}</p>
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}">` : ""}
        <p>${item.description}</p>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error fetching RSS sources:", error);
  }
}

fetchAndDisplayFeeds();
