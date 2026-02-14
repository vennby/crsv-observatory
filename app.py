from flask import Flask, render_template, jsonify
from dotenv import load_dotenv
import json

app = Flask(__name__)

load_dotenv()

with open("data/countries.json", encoding="utf-8") as f:
    COUNTRY_DATA = json.load(f)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/map")
def map_view():
    return render_template("world_map.html")

@app.route("/api/country/<name>")
def country_info(name):
    country = COUNTRY_DATA.get(name, {
        "name": name,
        "description": "No additional data available for this country."
    })
    return jsonify(country)

@app.route("/timeline")
def timeline():
    return render_template("timeline.html")

@app.route("/data/timeline.json")
def timeline_events():
    with open("data/timeline.json", encoding="utf-8") as f:
        timeline_data = json.load(f)
    return jsonify(timeline_data)

@app.route("/event/<event_id>")
def event_detail(event_id):
    try:
        with open(f"data/events/{event_id}.json", encoding="utf-8") as f:
            event_data = json.load(f)
        return render_template("event_detail.html", **event_data)
    except FileNotFoundError:
        return "Event not found", 404

if __name__ == '__main__':
    app.run()