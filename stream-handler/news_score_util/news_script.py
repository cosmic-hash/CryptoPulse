import json
import requests

# --- File paths ---
input_file = "../crypto_news_input.json"
output_file = "../output.json"

# --- Load input JSON ---
with open(input_file, "r") as f:
    input_data = json.load(f)

# --- Extract titles ---
titles = [item["title"] for item in input_data]

# --- Call Sentiment API ---
api_url = "https://sentiment-app-877042335787.us-central1.run.app/sentence-sentiment-analyze"
headers = {"Content-Type": "application/json"}

response = requests.post(api_url, headers=headers, data=json.dumps(titles))
response.raise_for_status()
scores = response.json()

# --- Merge scores back with input data ---
output_data = [
    {**item, "score": score}
    for item, score in zip(input_data, scores)
]

# --- Write to output file ---
with open(output_file, "w") as f:
    json.dump(output_data, f, indent=2)

print(f"Done! Output written to {output_file}")