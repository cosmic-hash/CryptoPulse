import praw
from dotenv import load_dotenv
from pathlib import Path
import os
from datetime import datetime, timezone

# Load env vars from .env
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

# Set up Reddit client
reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent=os.getenv("REDDIT_USER_AGENT")
)

<<<<<<< HEAD
def fetch_reddit_posts(coins, questions, limit=10, time_filter="all"):
    posts = []

    for coin in coins:
        coin_id = coin["id"]
        subreddit = reddit.subreddit(coin["subreddit"])
        for question in questions:
            label = question["label"]
            question_id = question["id"]
            query = question["query"]
            full_query = f"{query} {coin['code']}"
            for post in subreddit.search(full_query, sort="new" if time_filter != "all" else "relevance", time_filter=time_filter, limit=limit):
                posts.append({
                    "coin": coin["code"],
                    "coin_id": coin_id,
                    "subreddit": subreddit.display_name,
                    "category": label,
                    "question_id": question_id,
=======
COIN_SUBREDDITS = {
    "BTC": "Bitcoin",
    "ETH": "ethereum",
    "USDT": "Tether+CryptoCurrency",
    "XRP": "Ripple",
    "BNB": "binance",
    "SOL": "solana",
    "USDC": "CryptoCurrency",
    "TRX": "Tronix",
    "DOGE": "dogecoin",
    "ADA": "cardano"
}

def fetch_reddit_posts(limit=10, time_filter="all"):
    posts = []
    queries = {
        "features": '"new features" OR "use cases"',
        "leadership": '"founder" OR "CEO" OR "leadership"',
        "security": '"hack" OR "security breach" OR "exploit"',
        "market": '"price prediction" OR "market trend"',
        "regulations": '"regulation" OR "government policy"',
        "community": '"adoption" OR "community sentiment"',
        "partnerships": '"partnership" OR "integration"',
        "staking": '"mining" OR "staking" OR "validator"'
    }

    for coin, subreddits in COIN_SUBREDDITS.items():
        subreddit = reddit.subreddit(subreddits)
        for label, query in queries.items():
            full_query = f"{query} {coin}"
            for post in subreddit.search(full_query, sort="new" if time_filter != "all" else "relevance", time_filter=time_filter, limit=limit):
                posts.append({
                    "coin": coin,
                    "subreddit": subreddit.display_name,
                    "category": label,
>>>>>>> dcb8661 (sec commit)
                    "title": post.title,
                    "text": post.selftext,
                    "timestamp": datetime.fromtimestamp(post.created_utc, tz=timezone.utc).isoformat(),
                    "author": post.author.name if post.author else "unknown",
                    "score": post.score,
                    "url": post.url,
<<<<<<< HEAD
                    "num_comments": post.num_comments,
                    'id': post.id
=======
                    "num_comments": post.num_comments
>>>>>>> dcb8661 (sec commit)
                })
    return posts