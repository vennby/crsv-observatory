from flask import Flask, render_template, jsonify
from dotenv import load_dotenv
import json

app = Flask(__name__)

load_dotenv()

with open("data/countries.json", encoding="utf-8") as f:
    COUNTRY_DATA = json.load(f)

@app.route("/")
def index():
    return render_template("world_map.html")

@app.route("/api/country/<name>")
def country_info(name):
    country = COUNTRY_DATA.get(name, {
        "name": name,
        "description": "No additional data available for this country."
    })
    return jsonify(country)

if __name__ == '__main__':
    app.run()