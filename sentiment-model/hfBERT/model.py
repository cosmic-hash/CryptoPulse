import torch
from transformers import BertTokenizer, BertForSequenceClassification

class HFBertSentimentAnalyzer:
    def __init__(self):
        self.tokenizer = BertTokenizer.from_pretrained('nlptown/bert-base-multilingual-uncased-sentiment')
        self.model = BertForSequenceClassification.from_pretrained('nlptown/bert-base-multilingual-uncased-sentiment')

    def analyze_sentiment(self, texts):
        inputs = self.tokenizer(texts, return_tensors='pt', truncation=True, padding=True)
        with torch.no_grad():
            outputs = self.model(**inputs)
        predictions = torch.argmax(outputs.logits, dim=-1)
        
        # Convert class indices to sentiment scores
        sentiment_scores = [self.map_class_to_score(pred.item()) for pred in predictions]
        return sentiment_scores

    def map_class_to_score(self, class_index):
        # Map class indices to sentiment scores
        mapping = {
            0: -1.0,  # Very Negative
            1: -0.5,  # Negative
            2: 0.0,   # Neutral
            3: 0.5,   # Positive
            4: 1.0    # Very Positive
        }
        return mapping.get(class_index, 0.0)  # Default to 0.0 if not found