from flask import Flask, render_template, jsonify
import json

app = Flask(__name__)

with open("data/countries.json", encoding="utf-8") as f:
    COUNTRY_DATA = json.load(f)

with open("data/country_codes.json", encoding="utf-8") as f:
    COUNTRY_CODES = json.load(f)

with open("data/timeline.json", encoding="utf-8") as f:
    TIMELINE_DATA = json.load(f)

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

@app.route("/country/<name>")
def country_detail(name):
    country_data = COUNTRY_DATA.get(name, {
        "name": name,
        "description": "No additional data available for this country."
    })
    
    # Get related events for this country
    country_event_map = {
        "Japan": ["comfort_women_wwii", "nanjing_massacre"],
        "China": ["nanjing_massacre"],
        "India": ["partition_india", "hyderabad_massacres"],
        "Pakistan": ["partition_india"],
        "Bangladesh": ["partition_india"]
    }
    
    related_event_ids = country_event_map.get(name, [])
    related_events = [e for e in TIMELINE_DATA if e["id"] in related_event_ids]
    
    return render_template("country_detail.html", 
                         country_name=name,
                         country_info=country_data,
                         related_events=related_events)

@app.route("/timeline")
def timeline():
    return render_template("timeline.html")

@app.route("/data/timeline.json")
def timeline_events():
    return jsonify(TIMELINE_DATA)

@app.route("/api/country-codes")
def get_country_codes():
    return jsonify(COUNTRY_CODES)

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