# CryptoPulse 🚀
## Your Crypto-Invest Mate

## Introduction ☁️
Crypto markets move fast, but real-time public sentiment is scattered across Reddit, Twitter, and various news outlets.
CryptoPulse bridges this gap by fetching, analyzing, and visualizing crypto-related sentiment in real time, empowering investors with smarter insights.

## Key Features 💸
- Fetch live crypto discussions from Reddit (Twitter limited due to new API costs )
- Analyze emotions behind the chatter using Vader and BERT AI models 
- Aggregate sentiments into a single score using a custom-built Go service
- Visualize it through a sleek React.js dashboard 
- Deploy seamlessly with Docker, GitHub Actions CI/CD, and Google Cloud Run 



## Architecture Overview 🎨
![image](https://github.com/user-attachments/assets/9b355d98-55f1-4b3e-b823-ec027d0ed6df)

## Roadblocks We Crushed 🤖
- API Rate Limits: Smart retry and batching strategies for efficient data fetching.
- Twitter API Costs: Pivoted focus to Reddit for consistent and rich sentiment signals.
- Real-Time Topic Synthesis: Summarized massive data streams into actionable topics.
- Custom Aggregator: Created a search-query-driven sentiment aggregation system.
- Instant Alerts: Real-time notifications for major sentiment shifts.
- Crypto Slang Understanding: Adapted AI models to better handle crypto slang, sarcasm, and memes.
- Database Optimization: Engineered for high-volume, low-latency data bursts.
- CI/CD Excellence: Streamlined multi-service deployments using Docker and GitHub Actions.

## Next Steps 💸
- Expand to support multi-language sentiment analysis.
- Add new sources like Telegram and Discord.
- Improve sarcasm, humor, and meme detection in AI models.
- Introduce country-specific sentiment tracking.
- Expand support to smaller cryptocurrencies.
- Implement real-time trend detection for new coins.

## Built With ☁️
- React.js - Frontend Framework
- Reddit & Twitter - Data Collection
- Firebase Authentication - Login Authenticator 
- Go & OpenAI - Backend Aggregator Service
- VADER & BERT - Sentiment Analysis Models
- Docker - Containerization
- GitHub Actions - CI/CD Pipelines
- Google Cloud Run - Deployment Platform





