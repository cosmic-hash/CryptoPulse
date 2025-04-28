import json
import psycopg2
from flask import Flask, request, jsonify, render_template
import firebase_admin
from firebase_admin import credentials, firestore, auth
from functools import wraps
from flask_cors import CORS
import os

from utils import send_via_gmail

app = Flask(__name__)
CORS(app)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "your-secret-key")


def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])


json_creds = json.loads(os.environ['FIREBASE_CREDS'])
cred = credentials.Certificate(json_creds)
firebase_app = firebase_admin.initialize_app(cred)
db = firestore.client()


# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        id_token = request.headers.get('Authorization')
        if not id_token:
            return jsonify({"error": "No authorization token provided"}), 401

        try:
            # Remove 'Bearer ' prefix if present
            if id_token.startswith('Bearer '):
                id_token = id_token[7:]

            # Verify Firebase ID token
            decoded_token = auth.verify_id_token(id_token)
            request.user = decoded_token
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": "Invalid authentication token", "details": str(e)}), 401

    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

# Route to handle Google Sign-In and user creation/update
@app.route('/api/auth/google', methods=['POST'])
def auth_google():
    data = request.json
    id_token = data.get('idToken')

    if not id_token:
        return jsonify({"error": "No ID token provided"}), 400

    try:
        # Verify the ID token with Firebase
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']

        # Get user info
        user_info = {
            'uid': uid,
            'name': decoded_token.get('name', ''),
            'email': decoded_token.get('email', ''),
            'picture': decoded_token.get('picture', ''),
            'last_login': firestore.SERVER_TIMESTAMP,
        }

        # Check if user already exists in Firestore
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()

        if user_doc.exists:
            # Update existing user
            user_ref.update({
                'last_login': firestore.SERVER_TIMESTAMP
            })
        else:
            # Create new user with initial data
            user_ref.set({
                **user_info,
                'coins': [],  # Initialize empty coins array
                'questions': [],  # Initialize empty questions array
                'created_at': firestore.SERVER_TIMESTAMP
            })

        # Get the updated user data
        user_data = user_ref.get().to_dict()

        # Create a custom session token
        custom_token = auth.create_custom_token(uid)

        return jsonify({
            "success": True,
            "message": "User authenticated successfully",
            "user": user_data,
            "token": custom_token.decode('utf-8')
        })

    except Exception as e:
        return jsonify({"error": "Authentication failed", "details": str(e)}), 401


# Get user's profile data
@app.route('/api/users/profile', methods=['GET'])
@login_required
def get_user_profile():
    uid = request.user['uid']

    try:
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()

        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "success": True,
            "user": user_doc.to_dict()
        })

    except Exception as e:
        return jsonify({"error": "Failed to retrieve user profile", "details": str(e)}), 500


# Update user's profile data
@app.route('/api/users/profile', methods=['PUT', 'PATCH'])
@login_required
def update_user_profile():
    uid = request.user['uid']
    data = request.json

    # Fields that can be updated
    allowed_fields = ['name', 'coins', 'questions']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}

    try:
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()

        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404

        # Update user document
        user_ref.update(update_data)

        # Get the updated user data
        updated_user = user_ref.get().to_dict()

        return jsonify({
            "success": True,
            "message": "Profile updated successfully",
            "user": updated_user
        })

    except Exception as e:
        return jsonify({"error": "Failed to update user profile", "details": str(e)}), 500


# Update coins to user's coins array
@app.route('/api/users/coins', methods=['POST'])
@login_required
def update_coins():
    uid = request.user['uid']
    data = request.json

    coins = data.get('coins')
    if not coins or not isinstance(coins, list):
        return jsonify({"error": "No coins array provided or invalid format"}), 400

    try:
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()

        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404

        # Overwrite the 'coins' field with the new array
        user_ref.update({
            'coins': coins
        })

        # Get the updated user data
        updated_user = user_ref.get().to_dict()

        return jsonify({
            "success": True,
            "message": "Coins updated successfully",
            "coins": updated_user.get('coins', [])
        })

    except Exception as e:
        return jsonify({"error": "Failed to update coins", "details": str(e)}), 500


# Add a question to user's questions array
@app.route('/api/users/questions', methods=['POST'])
@login_required
def add_question():
    uid = request.user['uid']
    data = request.json

    question_data = data.get('question')
    if not question_data:
        return jsonify({"error": "No question data provided"}), 400

    try:
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()

        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404

        # Add the question to the questions array
        user_ref.update({
            'questions': firestore.ArrayUnion([question_data])
        })

        # Get the updated user data
        updated_user = user_ref.get().to_dict()

        return jsonify({
            "success": True,
            "message": "Question added successfully",
            "questions": updated_user.get('questions', [])
        })

    except Exception as e:
        return jsonify({"error": "Failed to add question", "details": str(e)}), 500


@app.route('/check-alerts', methods=['GET'])
def check_alerts():
    subs = db.collection('alert_subscriptions').stream()

    pg_cur = get_db_connection().cursor()
    triggered = []

    for sub in subs:
        coin_id, email, threshold = (
            sub.to_dict().get('coinId'),
            sub.to_dict().get('email'),
            sub.to_dict().get('threshold', 0),
        )

        pg_cur.execute("""
                       SELECT s.sentiment_score, c.name
                       FROM aggregated_sentiments s
                                JOIN currency c
                                     ON s.coin_id = c.id
                       WHERE s.coin_id = %s
                       ORDER BY s.window_start DESC LIMIT 1
                       """, (coin_id,))
        row = pg_cur.fetchone()
        if not row:
            continue

        score, coin_name = row

        if (0 > threshold > score) or (0 <= threshold < score):
            try:
                subject = f'🚨 {coin_name} Sentiment Alert! | Score: {score}'
                body = (
                    f'Hey there,\n\n'
                    f'Your sentiment alert for **{coin_name}** just triggered! 📈\n\n'
                    f'🔹 **Current Sentiment Score:** {score}\n'
                    f'🔹 **Your Set Threshold:** {threshold}\n\n'
                    f'Stay sharp and make your move! 🚀✨\n\n'
                    f'– CryptoPulse Alerts'
                )
                send_via_gmail(subject, body, email)
                triggered.append({'coin_id': coin_id, 'email': email, 'score': score})
            except Exception as e:
                print(f"SMTP error sending to {email}: {e}")

    pg_cur.close()
    return jsonify({
        'status': 'processed',
        'alerts_sent': triggered
    }), 200


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=False, host='0.0.0.0', port=port)
