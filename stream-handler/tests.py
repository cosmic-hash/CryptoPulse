from datetime import datetime, timezone
import pytest
import sys
from unittest.mock import patch, MagicMock


praw_mock = MagicMock()
praw_reddit_mock = MagicMock()
praw_reddit_mock.user.me.return_value = "mock_user"
praw_mock.Reddit.return_value = praw_reddit_mock

sys.modules['praw'] = praw_mock

@pytest.fixture(autouse=True)
def mock_db_connection():
    with patch('app.get_db_connection') as mock_get_db_conn:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_get_db_conn.return_value = mock_conn
        yield

from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# 1. Test /reddit_posts success
def test_reddit_posts_success(client, mocker):
    mocker.patch('app.get_coins', return_value=['BTC', 'ETH'])
    mocker.patch('app.fetch_reddit_posts', return_value=[{"id": 1, "title": "Post 1"}, {"id": 2, "title": "Post 2"}])

    response = client.post('/reddit_posts', json={"limit": 2})
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) == 2

# 2. Test /reddit_posts invalid limit
def test_reddit_posts_invalid_limit(client):
    response = client.post('/reddit_posts', json={"limit": 200})
    assert response.status_code == 400
    assert response.get_json()["status"] == "error"

# 3. Test /reddit_status success
def test_reddit_status_success(client, mocker):
    mocker.patch('app.reddit.user.me', return_value="test_user")

    response = client.get('/reddit_status')
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"

# 4. Test /reddit_status failure
def test_reddit_status_failure(client, mocker):
    mocker.patch('app.reddit.user.me', side_effect=Exception("Invalid Auth"))

    response = client.get('/reddit_status')
    assert response.status_code == 401
    assert response.get_json()["status"] == "error"

# 5. Test /news fetch success
def test_get_filtered_news_success(client, mocker):
    fake_cursor = MagicMock()
    fake_cursor.fetchall.return_value = [{
        "id": 1,
        "title": "News Title",
        "url": "http://example.com",
        "score": 0.5,
        "newsdatetime": datetime.now(),
        "currency_code": "BTC"
    }]

    mock_conn = MagicMock()
    mock_conn.cursor.return_value = fake_cursor
    mocker.patch('app.get_db_connection', return_value=mock_conn)

    response = client.post('/news', json={
        "start_date": "2023-01-01",
        "end_date": "2023-12-31",
        "currency_codes": ["BTC"]
    })

    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert data[0]["currency_code"] == "BTC"

# 6. Test /news with invalid date
def test_get_filtered_news_invalid_date(client):
    response = client.post('/news', json={
        "start_date": "invalid-date"
    })
    assert response.status_code == 400
    assert response.get_json()["error"] == "Invalid ISO format for start_date or end_date"

# 7. Test /reddit_db_dump success
def test_reddit_db_dump_success(client, mocker):
    mocker.patch('app.get_coins', return_value=['BTC'])
    mocker.patch('app.fetch_reddit_posts', return_value=[{
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
    }])
    mocker.patch('app.get_sentiment_score', return_value=0.8)

    response = client.post('/reddit_db_dump', json={"limit": 1, "time_filter": "day"})
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"

# 8. Test /test_insert success
def test_test_insert_success(client, mocker):
    mocker.patch('app.get_sentiment_score', return_value=0.5)

    response = client.post('/test_insert')
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"