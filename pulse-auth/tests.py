import os
import sys
from unittest.mock import MagicMock

os.environ['FIREBASE_CREDS'] = '{}'

firebase_admin_mock = MagicMock()
auth_mock = MagicMock()
firestore_mock = MagicMock()

auth_mock.verify_id_token = MagicMock(return_value={
    'uid': 'testuid',
    'email': 'test@example.com'
})
auth_mock.create_custom_token = MagicMock(return_value=b'custom-token')

sys.modules['firebase_admin'] = firebase_admin_mock
sys.modules['firebase_admin.auth'] = auth_mock
sys.modules['firebase_admin.firestore'] = firestore_mock

from app import app as app
app.config['TESTING'] = True

import pytest
from unittest.mock import patch, MagicMock

@pytest.fixture
def client():
    with app.test_client() as client:
        yield client

def with_auth_token(f):
    def wrapper(*args, **kwargs):
        # Add authentication credentials to the test request
        kwargs['headers'] = {'Authorization': 'Bearer fake-token'}
        return f(*args, **kwargs)

    return wrapper

def test_auth_google_missing_token(client):
    response = client.post('/api/auth/google', json={})
    assert response.status_code == 400

@patch('app.auth')
def test_get_user_profile_success(mock_auth, client):
    mock_auth.verify_id_token.return_value = {'uid': 'testuid'}

    with patch('app.db.collection') as mock_collection:
        mock_user_ref = MagicMock()
        mock_user_doc = MagicMock()
        mock_user_doc.exists = True
        mock_user_doc.to_dict.return_value = {"name": "Test User", "email": "test@example.com"}
        mock_user_ref.get.return_value = mock_user_doc
        mock_collection.return_value.document.return_value = mock_user_ref

        headers = {'Authorization': 'Bearer fake-token'}
        response = client.get('/api/users/profile', headers=headers)

        assert response.status_code == 200
        assert response.get_json()["success"] is True
        assert response.get_json()["user"]["name"] == "Test User"

@patch('app.auth')
def test_update_user_profile_success(mock_auth, client):
    mock_auth.verify_id_token.return_value = {'uid': 'testuid'}

    with patch('app.db.collection') as mock_collection:
        mock_user_ref = MagicMock()
        mock_user_doc = MagicMock()
        mock_user_doc.exists = True
        mock_user_doc.to_dict.return_value = {"name": "Old Name"}
        mock_user_ref.get.return_value = mock_user_doc
        mock_collection.return_value.document.return_value = mock_user_ref

        headers = {'Authorization': 'Bearer fake-token'}
        response = client.patch('/api/users/profile', json={'name': 'New Name'}, headers=headers)

        assert response.status_code == 200
        assert response.get_json()["success"] is True

        mock_user_ref.update.assert_called_once_with({'name': 'New Name'})


@patch('app.auth')
def test_update_coins_success(mock_auth, client):
    # Configure auth mock
    mock_auth.verify_id_token.return_value = {'uid': 'testuid'}

    # Set up database mocks
    with patch('app.db.collection') as mock_collection:
        mock_user_ref = MagicMock()
        mock_user_doc = MagicMock()
        mock_user_doc.exists = True
        mock_user_doc.to_dict.return_value = {"coins": []}
        mock_user_ref.get.return_value = mock_user_doc
        mock_collection.return_value.document.return_value = mock_user_ref

        # Make the authenticated request
        headers = {'Authorization': 'Bearer fake-token'}
        response = client.post('/api/users/coins', json={'coins': ['BTC', 'ETH']}, headers=headers)

        # Verify response
        assert response.status_code == 200
        assert response.get_json()["success"] is True

        # Verify the database update was called correctly
        mock_user_ref.update.assert_called_once_with({'coins': ['BTC', 'ETH']})


# Test Add Question Success
@patch('app.auth')
def test_add_question_success(mock_auth, client):
    # Configure auth mock
    mock_auth.verify_id_token.return_value = {'uid': 'testuid'}

    # Set up database mocks
    with patch('app.db.collection') as mock_collection:
        mock_user_ref = MagicMock()
        mock_user_doc = MagicMock()
        mock_user_doc.exists = True
        mock_user_doc.to_dict.return_value = {"questions": []}  # Start with empty questions
        mock_user_ref.get.return_value = mock_user_doc
        mock_collection.return_value.document.return_value = mock_user_ref

        # Make the authenticated request
        headers = {'Authorization': 'Bearer fake-token'}
        response = client.post('/api/users/questions', json={'question': 'New Question'}, headers=headers)

        # Verify response
        assert response.status_code == 200
        assert response.get_json()["success"] is True

        # Verify a database update was performed (with array append logic)
        mock_user_ref.update.assert_called_once()


# Test Check Alerts
@patch('app.db.collection')
@patch('app.get_db_connection')
@patch('app.send_via_gmail')
def test_check_alerts_success(mock_send_mail, mock_get_db_conn, mock_collection, client):
    # Set up database mocks for subscription collection
    mock_sub = MagicMock()
    mock_sub.to_dict.return_value = {'coinId': 1, 'email': 'test@example.com', 'threshold': 0.5}
    mock_collection.return_value.stream.return_value = [mock_sub]

    # Set up database connection for price data
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = (0.7, "Bitcoin")  # current price and name
    mock_conn.cursor.return_value = mock_cursor
    mock_get_db_conn.return_value = mock_conn

    # Make request to check alerts endpoint
    response = client.get('/check-alerts')

    # Verify response
    assert response.status_code == 200
    assert response.get_json()["status"] == "processed"

    # Verify email was sent
    mock_send_mail.assert_called_once()