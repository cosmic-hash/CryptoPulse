import requests
import json
from bs4 import BeautifulSoup

input_file = "../crypto_news.json"
# --- Load input JSON ---
with open(input_file, "r") as f:
    input_data = json.load(f)

# --- Extract urls ---
urls = [item["url"] for item in input_data]

def scrape_article(url, max_paragraphs=3):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract <p> tags
        paragraphs = soup.find_all('p')
        content = []

        for p in paragraphs:
            text = p.get_text(strip=True)
            if text:
                content.append(text)
            if len(content) >= max_paragraphs:
                break

        return {
            "url": url,
            "content": " ".join(content)
        }

    except Exception as e:
        return {
            "url": url,
            "error": str(e)
        }

# Scrape all URLs
results = [scrape_article(url) for url in urls]

# Print the scraped content
for result in results:
    print(f"\nURL: {result['url']}")
    if "content" in result:
        print(f"Content: {result['content']}")
    else:
        print(f"Error: {result['error']}")