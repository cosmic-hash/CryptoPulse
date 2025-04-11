from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/', methods=['GET','POST'])
def index():
    data = "Hello World"
    return jsonify(data)

if __name__ == '__main__':
    app.run()