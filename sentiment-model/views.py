from vader.vaderSentiment import SentimentIntensityAnalyzer
analyzer = SentimentIntensityAnalyzer()

def get_sentence_sentiments(sentences):
    sentence_sentiments = []

    for sentence in sentences:
        vs = analyzer.polarity_scores(sentence)
        sentence_sentiments.append(vs["compound"])

    return sentence_sentiments

def get_para_sentiments(paragraphs):
    from nltk import tokenize

    para_sentiments = []

    for paragraph in paragraphs:
        sentence_list = tokenize.sent_tokenize(paragraph)
        para_sentiment = 0.0

        for sentence in sentence_list:
            vs = analyzer.polarity_scores(sentence)
            para_sentiment += vs["compound"]

        avg_para_sentiment = round(para_sentiment / len(sentence_list), 4)
        para_sentiments.append(avg_para_sentiment)

    return para_sentiments
<<<<<<< HEAD
=======



#HEERA MENON 
import requests

def get_hfbert_sentiment(text):
    response = requests.post('http://localhost:5000/api/hfbert/sentiment', json={'text': text})
    return response.json()
>>>>>>> dcb8661 (sec commit)
