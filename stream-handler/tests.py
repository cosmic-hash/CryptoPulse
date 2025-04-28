from datetime import datetime, timezone
import pytest
from unittest.mock import patch, MagicMock

@pytest.fixture(autouse=True)
def mock_reddit():
    with patch('fetch_posts.praw.Reddit') as mock_reddit_class:
        mock_reddit_instance = MagicMock()
        mock_reddit_instance.user.me.return_value = "mock_user"
        mock_reddit_class.return_value = mock_reddit_instance
        yield

from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@patch('app.get_coins')
@patch('app.fetch_reddit_posts')
def test_reddit_posts_success(mock_fetch_posts, mock_get_coins, client):
    mock_get_coins.return_value = ['BTC', 'ETH']
    mock_fetch_posts.return_value = [{"id": 1, "title": "Post 1"}, {"id": 2, "title": "Post 2"}]

    response = client.post('/reddit_posts', json={"limit": 2})
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) == 2

def test_reddit_posts_invalid_limit(client):
    response = client.post('/reddit_posts', json={"limit": 200})
    assert response.status_code == 400
    assert response.get_json()["status"] == "error"

@patch('app.reddit.user.me')
def test_reddit_status_success(mock_me, client):
    mock_me.return_value = "test_user"
    response = client.get('/reddit_status')
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"

@patch('app.reddit.user.me', side_effect=Exception("Invalid Auth"))
def test_reddit_status_failure(mock_me, client):
    response = client.get('/reddit_status')
    assert response.status_code == 401
    assert response.get_json()["status"] == "error"

@patch('app.get_db_connection')
def test_get_filtered_news_success(mock_db_conn, client):
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchall.return_value = [{
        "id": 1,
        "title": "News Title",
        "url": "http://example.com",
        "score": 0.5,
        "newsdatetime": datetime.now(),
        "currency_code": "BTC"
    }]
    mock_db_conn.return_value = mock_conn

    response = client.post('/news', json={
        "start_date": "2023-01-01",
        "end_date": "2023-12-31",
        "currency_codes": ["BTC"]
    })
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert data[0]["currency_code"] == "BTC"

def test_get_filtered_news_invalid_date(client):
    response = client.post('/news', json={
        "start_date": "invalid-date"
    })
    assert response.status_code == 400
    assert response.get_json()["error"] == "Invalid ISO format for start_date or end_date"

@patch('app.get_coins')
@patch('app.fetch_reddit_posts')
@patch('app.get_db_connection')
@patch('app.get_sentiment_score')
def test_reddit_db_dump_success(mock_sentiment, mock_db_conn, mock_fetch_posts, mock_get_coins, client):
    mock_get_coins.return_value = ['BTC']
    mock_fetch_posts.return_value = [{
        "id": "123",
        "title": "Reddit post title",
        "text": "Post body",
        "question_id": 1,
        "coin_id": 1,
        "author": "author_name",
        "timestamp": datetime.now(timezone.utc),
        "score": 5,
        "num_comments": 10,
        "coin": "BTC"
    }]
    mock_sentiment.return_value = 0.8
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_db_conn.return_value = mock_conn

    response = client.post('/reddit_db_dump', json={"limit": 1, "time_filter": "day"})
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"

@patch('app.get_db_connection')
@patch('app.get_sentiment_score')
def test_test_insert_success(mock_sentiment, mock_db_conn, client):
    mock_sentiment.return_value = 0.5
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_db_conn.return_value = mock_conn

    response = client.post('/test_insert')
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"