import json
import csv

# File paths
json_file = "../output.json"
csv_file = "../scores.csv"

# Load JSON data
with open(json_file, "r") as f:
    data = json.load(f)

# Write to CSV
with open(csv_file, "w", newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=["id", "title", "score"])
    writer.writeheader()
    writer.writerows(data)

print(f"CSV written to {csv_file}")