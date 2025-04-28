import os
from flask import Flask, jsonify, request
from views import get_para_sentiments, get_sentence_sentiments
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

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

# Load model and tokenizer once
model_name = "nlptown/bert-base-multilingual-uncased-sentiment"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

model.eval()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

@app.route('/predict_sentiment', methods=['POST'])
def predict_sentiment():
    try:
        paragraphs = request.get_json()

        if not paragraphs or not isinstance(paragraphs, list):
            return jsonify({"error": "Please provide a plain array of paragraphs"}), 400

        # Batch tokenize
        inputs = tokenizer(paragraphs, return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            predictions = torch.argmax(logits, dim=1)

        # Map predictions to scores between -1.0 and 1.0
        scores = [round(((pred.item() + 1) - 3) / 2, 3) for pred in predictions]

        return jsonify(scores)

    except Exception as e:
        return jsonify({"error": "Prediction failed", "details": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=False, host='0.0.0.0', port=port)