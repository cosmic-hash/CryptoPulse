import csv
import json
import requests

input_file = "neondb_public_crypto_news.json"
csv_file = "scores.csv"

# --- Load input JSON ---
with open(input_file, "r") as f:
    input_data = json.load(f)

# --- Extract titles ---
titles = [item["title"] for item in input_data]

# --- Call Sentiment API ---
api_url = "http://127.0.0.1:8080/predict_sentiment"
headers = {"Content-Type": "application/json"}

response = requests.post(api_url, headers=headers, data=json.dumps(titles))
response.raise_for_status()
scores = response.json()

# --- Merge scores back with input data ---
output_data = [
    {**item, "score": score}
    for item, score in zip(input_data, scores)
]

# Write to CSV
with open(csv_file, "w", newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=["id", "title", "score"])
    writer.writeheader()
    writer.writerows(output_data)

print(f"CSV written to {csv_file}")