import os

from flask import Flask, jsonify, request

from views import get_para_sentiments, get_sentence_sentiments

#BERT header
from hfBERT.model import HFBertSentimentAnalyzer

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    data = "Hello World"
    return jsonify(data)

@app.route('/para-sentiment-analyze', methods=['POST'])
def para_sentiment_analyze():
    try:
        data = request.get_json()
        if not isinstance(data, list) or not all(isinstance(item, str) for item in data):
            return jsonify({"error": "Input must be a list of strings"}), 400

        sentiments = get_para_sentiments(data)
        return jsonify(sentiments)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sentence-sentiment-analyze', methods=['POST'])
def sentence_sentiment_analyze():
    try:
        data = request.get_json()
        if not isinstance(data, list) or not all(isinstance(item, str) for item in data):
            return jsonify({"error": "Input must be a list of strings"}), 400

        sentiments = get_sentence_sentiments(data)
        return jsonify(sentiments)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


#HEERA MENON 
hf_bert_analyzer = HFBertSentimentAnalyzer()

@app.route('/api/hfbert/sentiment', methods=['POST'])
def hfbert_sentiment():
    try:
        data = request.json
        text = data.get('text', '')
        if not text:
            return jsonify({"error": "Input must be a non-empty string"}), 400
        
        sentiment_class = hf_bert_analyzer.analyze_sentiment(text)
        return jsonify({'sentiment_class': sentiment_class})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=True, host='0.0.0.0', port=port)




