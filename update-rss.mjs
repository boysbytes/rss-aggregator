import fs from 'fs';
import fetch from 'node-fetch';
import { DOMParser } from 'xmldom';

async function parseFeed(feedUrl) {
    try {
        const response = await fetch(feedUrl);
        const text = await response.text();
        const xml = new DOMParser().parseFromString(text, 'application/xml');

        const isAtom = xml.querySelector('feed') !== null;

        let websiteTitle;
        if (isAtom) {
            websiteTitle = xml.querySelector('feed > title').textContent;
        } else {
            websiteTitle = xml.querySelector('channel > title').textContent;
        }

        const items = Array.from(xml.querySelectorAll(isAtom ? 'entry' : 'item')).map(item => {
            let imageUrl = null;
            let description = '';
            let title = '';
            let link = '';
            let pubDate = null;

            if (isAtom) {
                title = item.querySelector('title').textContent;
                link = item.querySelector('link').getAttribute('href');
                pubDate = new Date(item.querySelector('published').textContent);
                description = item.querySelector('summary')?.textContent || item.querySelector('content')?.textContent || '';

                const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch) imageUrl = imgMatch[1];

                description = description.replace(/<[^>]*>/g, "");

            } else {
                title = item.querySelector('title').textContent;
                link = item.querySelector('link').textContent;
                pubDate = new Date(item.querySelector('pubDate').textContent);
                description = item.querySelector('description')?.textContent || '';

                const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch) imageUrl = imgMatch[1];
                description = description.replace(/<[^>]*>/g, "");
            }

            return {
                title: title,
                link: link,
                pubDate: pubDate,
                description: description,
                imageUrl: imageUrl,
                websiteTitle: websiteTitle
            };
        });
        return items;
    } catch (error) {
        console.error(`Error parsing feed ${feedUrl}:`, error);
        return []; // Return an empty array in case of an error
    }
}

async function generateFeedData() {
    const feeds = [
        "https://boysbytes.github.io/day-dots-jekyll/feed.xml",
        "https://simonwillison.net/atom/everything/"
    ];

    let allItems = [];

    for (const feed of feeds) {
        const items = await parseFeed(feed);
        allItems = allItems.concat(items);
    }

    // Sort all items by date
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    const limitedItems = allItems.slice(0, 20);

    // Convert Date objects to ISO strings
    const serializableItems = limitedItems.map(item => ({
        ...item,
        pubDate: item.pubDate.toISOString() // Convert to ISO string for serialization
    }));

    // Write the combined, sorted feed to a JSON file
    fs.writeFileSync('feed_data.json', JSON.stringify(serializableItems, null, 2)); // Pretty print JSON
}

generateFeedData().catch(console.error);
