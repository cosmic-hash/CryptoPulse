import json
import psycopg2

# --- Load Scored Data ---
with open("../output.json", "r") as f:
    scored_data = json.load(f)

# --- PostgreSQL DB Connection ---
conn = psycopg2.connect(
    host="ep-old-bonus-a4kej9kq-pooler.us-east-1.aws.neon.tech",
    database="neondb",
    user="neondb_owner",
    password="npg_Ywb2mK8guPWn"
)
cur = conn.cursor()

# --- Update Table with Scores ---
for item in scored_data:
    try:
        cur.execute(
            "UPDATE crypto_news SET score = %s WHERE id = %s",
            (item["score"], item["id"])
        )
    except Exception as e:
        print(f"Error updating id={item['id']}: {e}")

# --- Finalize ---
conn.commit()
cur.close()
conn.close()
print("Database updated successfully.")
