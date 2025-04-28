import sys

import pytest
from unittest.mock import patch, MagicMock
import torch

transformers_mock = MagicMock()
torch_mock = MagicMock()

# Properly mock torch.no_grad as a context manager
class DummyContextManager:
    def __enter__(self): return None
    def __exit__(self, *args): return None

torch_mock.no_grad.return_value = DummyContextManager()

# Now also mock torch.argmax to return fake predictions
prediction_mock_1 = MagicMock()
prediction_mock_1.item.return_value = 3

prediction_mock_2 = MagicMock()
prediction_mock_2.item.return_value = 2

torch_mock.argmax.return_value = [prediction_mock_1, prediction_mock_2]

sys.modules['transformers'] = transformers_mock
sys.modules['torch'] = torch_mock

from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# 1. Test index route
def test_index(client):
    response = client.get('/')
    assert response.status_code == 200
    assert response.get_json() == "Hello World"

# 2. Test para_sentiment_analyze success
@patch('app.get_para_sentiments')
def test_para_sentiment_analyze_success(mock_get_para_sentiments, client):
    mock_get_para_sentiments.return_value = [0.5, 0.8]

    response = client.post('/para-sentiment-analyze', json=["text1", "text2"])
    assert response.status_code == 200
    data = response.get_json()
    assert data == [0.5, 0.8]

# 3. Test para_sentiment_analyze invalid input
def test_para_sentiment_analyze_invalid_input(client):
    response = client.post('/para-sentiment-analyze', json={"text": "not a list"})
    assert response.status_code == 400
    assert response.get_json()["error"] == "Input must be a list of strings"

# 4. Test sentence_sentiment_analyze success
@patch('app.get_sentence_sentiments')
def test_sentence_sentiment_analyze_success(mock_get_sentence_sentiments, client):
    mock_get_sentence_sentiments.return_value = [0.2, 0.7]

    response = client.post('/sentence-sentiment-analyze', json=["sentence1", "sentence2"])
    assert response.status_code == 200
    data = response.get_json()
    assert data == [0.2, 0.7]

# 5. Test sentence_sentiment_analyze invalid input
def test_sentence_sentiment_analyze_invalid_input(client):
    response = client.post('/sentence-sentiment-analyze', json="this is a string")
    assert response.status_code == 400
    assert response.get_json()["error"] == "Input must be a list of strings"

# 6. Test predict_sentiment success
@patch('app.tokenizer')
@patch('app.model')
def test_predict_sentiment_success(mock_model, mock_tokenizer, client):
    # Mock tokenizer output properly
    mock_input_ids = MagicMock()
    mock_attention_mask = MagicMock()
    mock_input_ids.to.return_value = mock_input_ids
    mock_attention_mask.to.return_value = mock_attention_mask

    mock_tokenizer.return_value = {
        "input_ids": mock_input_ids,
        "attention_mask": mock_attention_mask
    }

    # Mock model output
    mock_outputs = MagicMock()
    mock_outputs.logits = MagicMock()
    mock_model.return_value = mock_outputs

    response = client.post('/predict_sentiment', json=["This is good.", "Could be better."])
    assert response.status_code == 200
    scores = response.get_json()
    assert isinstance(scores, list)
    assert len(scores) == 2

# 7. Test predict_sentiment invalid input
def test_predict_sentiment_invalid_input(client):
    response = client.post('/predict_sentiment', json={"text": "this should be a list"})
    assert response.status_code == 400
    assert "Please provide a plain array" in response.get_json()["error"]
