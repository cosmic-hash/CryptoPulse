# CryptoPulse 🚀
## Your Crypto-Invest Mate

## Introduction 🌟
Crypto markets move fast, but real-time public sentiment is scattered across Reddit, Twitter, and various news outlets.
CryptoPulse bridges this gap by fetching, analyzing, and visualizing crypto-related sentiment in real time, empowering investors with smarter insights.

## Key Features 🔥
- Fetch live crypto discussions from Reddit (Twitter limited due to new API costs )
- Analyze emotions behind the chatter using Vader and BERT AI models 
- Aggregate sentiments into a single score using a custom-built Go service
- Visualize it through a sleek React.js dashboard 
- Deploy seamlessly with Docker, GitHub Actions CI/CD, and Google Cloud Run 



## Architecture Overview 🛠
![image](https://github.com/user-attachments/assets/9b355d98-55f1-4b3e-b823-ec027d0ed6df)

## Roadblocks We Crushed 🤖
- API Limits: Designed smart retry and batching strategies to fetch large data volumes efficiently.
- Twitter Limitations: Shifted focus to Reddit, ensuring strong sentiment signals without extra costs.
- Live Topic Synthesis: Condensed real-time discussions to reveal the key drivers behind observed sentiment.
- Custom Sentiment Aggregator: Developed a custom algorithm that runs targeted search queries, aggregates fetched messages with unique logic, and calculates an overall sentiment score.
- Historical News Analysis: Open source news dump analysis on both VADER and BERT models for sentiment calculation and historical discrete data plotting.
-  Real-Time Alerts: Instantly notify users of sentiment changes for any coin.
- Crypto Slang: Used sentiment models tuned to social-media for better understanding crypto conversations.
- Data Bursts: Optimized database writes and handled bulk inserts without downtime.
- Deployment Complexity: Streamlined multi-service tests & deployments using Docker and CI/CD pipelines.


## Next Steps 💸
- Expand to support multi-language sentiment analysis.
- Add new sources like Telegram and Discord.
- Improve sarcasm, humor, and meme detection in AI models.
- Introduce country-specific sentiment tracking.
- Expand support to smaller cryptocurrencies.
- Implement real-time trend detection for new coins.

## Built With 🧑‍💻
- React.js - Frontend Framework
- Reddit | Twitter | News CryptoPanic dump - Data Collection
- Firebase Authentication - Login Authenticator 
- Go | Flask | OpenAI - Backend Aggregator Service
- VADER | BERT - Sentiment Analysis Models
- Docker - Containerization
- GitHub Actions - CI/CD Pipelines
- Google Cloud Run | Amazon Cloudfront - Deployment Platform





