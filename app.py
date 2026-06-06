from flask import Flask, request, jsonify, send_from_directory
import os, json, urllib.request, urllib.error

app = Flask(__name__, static_folder='templates')
API_KEY = os.environ.get("GEMINI_API_KEY", "")

@app.route("/")
def landing():
    return send_from_directory('templates', 'landing.html')

@app.route("/mymeds")
def mymeds():
    return send_from_directory("templates", "mymeds.html")

@app.route("/app")
def index():
    return send_from_directory('templates', 'index.html')

@app.route("/counsel", methods=["POST"])
def counsel():
    if not API_KEY:
        return jsonify({"error": "GEMINI_API_KEY not set."}), 500

    body = request.get_json()
    drug = body.get("drug", "").strip()
    level = body.get("level", "6th grade").strip()

    if not drug:
        return jsonify({"error": "No drug name provided."}), 400

    prompt = (
        'You are a clinical pharmacist. The user entered: "' + drug + '". '
        'This may be a brand name or generic. Handle both. '
        'Reading level for ALL text fields: ' + level + '. '
        'Respond ONLY with valid JSON, no markdown, no backticks, using exactly this schema: '
        '{'
        '"drugName": "Generic (Brand) or just Generic if no brand",'
        '"isBrand": true or false,'
        '"brandNote": "If isBrand true: Brand X is the brand name for generic Y. Else empty string.",'
        '"condition": "1-2 sentences on what condition this treats",'
        '"what": "1-2 sentences on what this drug does in the body",'
        '"how": "2-3 bullet points on how to take it",'
        '"missedDose": "What to do if a dose is missed, 2-3 sentences",'
        '"foodAlcohol": "bullet points on food, alcohol, and timing interactions",'
        '"side": "bullet points of 3-4 common side effects, color-coded as green/yellow/red severity in format: [green] mild nausea",'
        '"warn": "bullet points of 2-3 serious warning signs that need medical attention, all marked [red]",'
        '"injection": "If this drug is an injectable or biologic, provide step-by-step injection/administration guidance. If not injectable, return empty string.",'
        '"cost": "1-2 sentences on generic availability and cost-saving tips like GoodRx",'
        '"teachback": ["question 1", "question 2", "question 3"],'
        '"caregiverTeachback": ["caregiver question 1", "caregiver question 2"]'
        '}'
    )

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json"
        }
    }).encode()

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        text = text.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
        return jsonify(result)
    except urllib.error.HTTPError as e:
        err = json.loads(e.read())
        return jsonify({"error": str(err)}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    if not API_KEY:
        print("GEMINI_API_KEY not set.")
    print("Pill Talk running at http://0.0.0.0:10000")
    app.run(host="0.0.0.0", port=10000, debug=False)

@app.route("/interactions", methods=["POST"])
def interactions():
    if not API_KEY:
        return jsonify({"error": "GEMINI_API_KEY not set."}), 500

    body = request.get_json()
    drugs = body.get("drugs", [])
    level = body.get("level", "simple and clear language").strip()

    if len(drugs) < 2:
        return jsonify({"error": "Please add at least 2 medications to check interactions."}), 400

    drug_list = ", ".join(drugs)

    prompt = (
        'You are a clinical pharmacist. The patient is taking these medications: ' + drug_list + '. '
        'Check for drug-drug interactions, food-drug interactions, and duplications of therapy. '
        'Use ' + level + ' reading level. '
        'Respond ONLY with valid JSON, no markdown, no backticks, using exactly this schema: '
        '{'
        '"summary": "1-2 sentence overall summary of safety",'
        '"interactions": ['
        '  {"drugs": "Drug A + Drug B", "severity": "green or yellow or red", "description": "plain language explanation", "action": "what to do about it"}'
        '],'
        '"duplications": ["any therapeutic duplications as plain strings"],'
        '"safe": true or false,'
        '"recommendation": "overall recommendation in plain language"'
        '}'
        'If no interactions found, return empty interactions array and safe: true.'
    )

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json"
        }
    }).encode()

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        text = text.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
        return jsonify(result)
    except urllib.error.HTTPError as e:
        err = json.loads(e.read())
        return jsonify({"error": str(err)}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500
