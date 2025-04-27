from datetime import datetime, timezone
from flask import Flask, jsonify, request
from fetch_posts import fetch_reddit_posts, reddit
from flask_cors import CORS
import os
import psycopg2
import psycopg2.extras
from psycopg2 import OperationalError, InterfaceError
import json

app = Flask(__name__)
CORS(app)

DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT'),
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD')
}

def get_db_connection():
    print("Creating DB connection...")
    return psycopg2.connect(**DB_CONFIG)

# Sentiment API integration
import requests

SENTIMENT_API_URL = "https://sentiment-app-877042335787.us-central1.run.app/para-sentiment-analyze"

def get_sentiment_score(text):
    if not text or not text.strip():
        print("Empty or invalid text for sentiment analysis. Skipping.")
        return None
    try:
        response = requests.post(SENTIMENT_API_URL, json=[text])
        if response.status_code == 200:
            sentiments = response.json()
            if sentiments and isinstance(sentiments, list):
                return sentiments[0]
            return None
        else:
            print(f"Sentiment API failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error calling sentiment API: {str(e)}")
    return None

def get_coins():
    print("Fetching coins from DB...")
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT id, code, subreddit FROM currency WHERE subreddit IS NOT NULL;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    coins = [{"id": row["id"], "code": row["code"], "subreddit": row["subreddit"]} for row in rows]
    print(f"Fetched {len(coins)} coins")
    return coins

@app.route("/reddit_posts", methods=["POST"])
def reddit_posts():
    data = request.get_json()
    limit = data.get("limit", 10)
    
    if not isinstance(limit, int) or limit < 1 or limit > 100:
        return {"status": "error", "message": "Limit must be an integer between 1 and 100."}, 400

    print(f"Fetching {limit} Reddit posts...")
    coins = get_coins()
    print("Fetched coins!", coins)
    posts = fetch_reddit_posts(coins, QUESTIONS, limit=limit)
    print(f"Fetched {len(posts)} posts")
    return jsonify(posts)


@app.route("/reddit_status", methods=["GET"])
def reddit_status():
    try:
        me = reddit.user.me()
        return {"status": "success", "message": f"Authenticated. User: {me}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}, 401

@app.route('/news', methods=['POST'])
def get_filtered_news():
    data = request.get_json(force=True) or {}
    start_iso      = data.get('start_date',  '2017-09-01')
    end_iso        = data.get('end_date',    '2025-01-31')
    currency_codes = data.get('currency_codes')

    try:
        start_dt = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
        end_dt   = datetime.fromisoformat(end_iso.replace("Z",   "+00:00"))
    except ValueError:
        return jsonify({"error": "Invalid ISO format for start_date or end_date"}), 400

    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        query = """
            SELECT
              cn.id,
              cn.title,
              cn.url,
              cn.score,
              cn.newsdatetime,
              c.code AS currency_code
            FROM crypto_news cn
            JOIN news_currency nc ON cn.id = nc.newsid
            JOIN currency c        ON nc.currencyid = c.id
            WHERE cn.newsdatetime >= %s
              AND cn.newsdatetime <= %s
        """

        params = [start_dt, end_dt]

        if currency_codes:
            query += " AND c.code = ANY(%s)"
            params.append(currency_codes)

        query += " ORDER BY cn.newsdatetime DESC"

        cur.execute(query, params)
        rows = cur.fetchall()

        articles = [
            {
                "id":            row["id"],
                "title":         row["title"],
                "url":           row["url"],
                "score":         row["score"],
                "currency_code": row["currency_code"],
                "newsdatetime":  row["newsdatetime"].strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            for row in rows
        ]

        cur.close()
        conn.close()
        return jsonify(articles)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

COINS = [
    {"id": 1, "code": "BTC", "subreddit": "Bitcoin"},
    {"id": 2, "code": "ETH", "subreddit": "ethereum"},
    {"id": 3, "code": "USDT", "subreddit": "Tether+CryptoCurrency"},
    {"id": 4, "code": "XRP", "subreddit": "Ripple"},
    {"id": 5, "code": "BNB", "subreddit": "binance"},
    {"id": 6, "code": "SOL", "subreddit": "solana"},
    {"id": 7, "code": "USDC", "subreddit": "CryptoCurrency"},
    {"id": 8, "code": "TRX", "subreddit": "Tronix"},
    {"id": 9, "code": "DOGE", "subreddit": "dogecoin"},
    {"id": 10, "code": "ADA", "subreddit": "cardano"}
]

QUESTIONS = [
    {
        "id": 4,
        "label": "features",
        "query": '"new features" OR "use cases"',
        "code": "1",
        "text": 'New Features or Use Cases of "coin_name"'
    },
    {
        "id": 5,
        "label": "leadership",
        "query": '"founder" OR "CEO" OR "leadership"',
        "code": "2",
        "text": 'Founders or Leadership of "coin_name"'
    },
    {
        "id": 6,
        "label": "security",
        "query": '"hack" OR "security breach" OR "exploit"',
        "code": "3",
        "text": 'Security Concerns or Hacks related to "coin_name"'
    },
    {
        "id": 7,
        "label": "market",
        "query": '"price prediction" OR "market trend"',
        "code": "4",
        "text": 'Market Trends and Price Predictions of "coin_name"'
    },
    {
        "id": 8,
        "label": "regulations",
        "query": '"regulation" OR "government policy"',
        "code": "5",
        "text": 'Regulatory Updates and Government Policies affecting "coin_name"'
    },
    {
        "id": 1,
        "label": "community",
        "query": '"adoption" OR "community sentiment"',
        "code": "6",
        "text": 'Community Sentiment and Adoption for "coin_name"'
    },
    {
        "id": 2,
        "label": "partnerships",
        "query": '"partnership" OR "integration"',
        "code": "7",
        "text": 'Partnerships and Integrations involving "coin_name"'
    },
    {
        "id": 3,
        "label": "staking",
        "query": '"mining" OR "staking" OR "validator"',
        "code": "8",
        "text": 'Mining and Staking Discussions around "coin_name"'
    }
]

# New reddit_db_dump endpoint
@app.route("/reddit_db_dump", methods=["POST"])
def reddit_db_dump():
    data = request.get_json()
    limit = data.get("limit", 200)
    time_filter = data.get("time_filter", "day")

    # if not isinstance(limit, int) or limit < 1 or limit > 100:
    #     print("Invalid limit provided.")
    #     return {"status": "error", "message": "Limit must be an integer between 1 and 100."}, 400

    try:
        print(f"Fetching Reddit posts with limit={limit} and time_filter='{time_filter}'")
        coins = get_coins()
        posts = fetch_reddit_posts(coins, QUESTIONS, limit=limit, time_filter=time_filter)
        print(f"Fetched {len(posts)} posts from Reddit")

        if not posts:
            print("No posts returned from fetch_reddit_posts.")
            return {"status": "success", "message": "No posts to insert."}

        conn = get_db_connection()
        print("Database connection established.")

        insert_query = """
            INSERT INTO raw_messages
            (source, external_id, question_id, currency_id, author, content, sentiment_score, created_at, fetched_at, metadata, coin)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """

        cur = conn.cursor()
        inserted_count = 0
        for post in posts:
            try:
                # If connection or cursor closed, reopen
                if conn.closed != 0 or cur.closed:
                    print("DB connection lost. Reconnecting...")
                    conn = get_db_connection()
                    cur = conn.cursor()

                print(f"Inserting post: {post['title']} (score: {post['score']})")
                cur.execute(insert_query, (
                    "reddit",
                    f"reddit_{post['id']}",
                    post["question_id"],
                    post["coin_id"],
                    post["author"],
                    f"{post['title']} {post['text']}",
                    get_sentiment_score(f"{post['title']} {post['text']}"),
                    post["timestamp"],
                    datetime.now(timezone.utc).isoformat(),
                    json.dumps({
                        "score": post["score"],
                        "num_comments": post["num_comments"]
                    }),
                    post["coin"]
                ))
                inserted_count += 1
            except (OperationalError, InterfaceError) as db_err:
                # On DB errors, reconnect once and retry
                print(f"DB error: {db_err}. Reconnecting and retrying...")
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute(insert_query, (
                    "reddit",
                    f"reddit_{post['id']}",
                    post["question_id"],
                    post["coin_id"],
                    post["author"],
                    f"{post['title']} {post['text']}",
                    get_sentiment_score(f"{post['title']} {post['text']}"),
                    post["timestamp"],
                    datetime.now(timezone.utc).isoformat(),
                    json.dumps({
                        "score": post["score"],
                        "num_comments": post["num_comments"]
                    }),
                    post["coin"]
                ))
                inserted_count += 1
            except Exception as inner_e:
                print(f"Failed to insert post: {post}")
                print(f"Insert error: {inner_e}")

        conn.commit()
        print("Commit completed. Check the DB to confirm records.")
        print(f"Successfully inserted {inserted_count} out of {len(posts)} posts.")
        if not cur.closed:
            cur.close()
        conn.close()

        return {"status": "success", "message": f"{inserted_count} Reddit posts inserted into DB."}

    except Exception as e:
        print(f"Error during DB dump: {e}")
        return {"status": "error", "message": str(e)}, 500


# Test insert endpoint
@app.route("/test_insert", methods=["POST"])

# Corrected /test_insert endpoint for raw_messages
@app.route("/test_insert", methods=["POST"])
def test_insert():
    try:
        print("Creating DB connection...")
        conn = get_db_connection()
        cur = conn.cursor()

        insert_query = """
            INSERT INTO raw_messages
            (source, external_id, question_id, currency_id, author, content, sentiment_score, created_at, fetched_at, metadata, coin)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """

        from datetime import datetime, timezone
        import uuid
        now = datetime.now(timezone.utc).isoformat()

        test_post = {
            "source": "reddit",
            "external_id": str(uuid.uuid4()),
            "question_id": 7,
            "currency_id": 94,
            "author": "u/susan",
            "content": "Market trends suggest a bullish run for coin_name.",
            "sentiment_score": get_sentiment_score("Bitcoin is looking strong this week! The bullish momentum seems to be building up"),
            "created_at": now,
            "fetched_at": now,
            "metadata": json.dumps({}),
            "coin": "USDC"
        }

        cur.execute(insert_query, (
            test_post["source"],
            test_post["external_id"],
            test_post["question_id"],
            test_post["currency_id"],
            test_post["author"],
            test_post["content"],
            test_post["sentiment_score"],
            test_post["created_at"],
            test_post["fetched_at"],
            test_post["metadata"],
            test_post["coin"]
        ))

        conn.commit()
        cur.close()
        conn.close()
        print("Test insert successful.")
        return {"status": "success", "message": "Test insert successful."}

    except Exception as e:
        print(f"Test insert error: {e}")
        return {"status": "error", "message": str(e)}, 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=False, host='0.0.0.0', port=port)
