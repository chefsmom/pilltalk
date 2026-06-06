from flask import Flask, request, jsonify, send_from_directory
import os, json, urllib.request, urllib.error

app = Flask(__name__, static_folder='templates')
API_KEY = os.environ.get("GEMINI_API_KEY", "")

@app.route("/")
def landing():
    return send_from_directory('templates', 'landing.html')

@app.route("/app")
def index():
    return send_from_directory('templates', 'index.html')

@app.route("/mymeds")
def mymeds():
    return send_from_directory('templates', 'mymeds.html')

@app.route("/medcard")
def medcard():
    return send_from_directory('templates', 'medcard.html')

@app.route("/counsel", methods=["POST"])
def counsel():
    if not API_KEY:
        return jsonify({"error": "GEMINI_API_KEY not set."}), 500
    body = request.get_json()
    drug = body.get("drug", "").strip()
    level = body.get("level", "simple and clear language").strip()
    if not drug:
        return jsonify({"error": "No drug name provided."}), 400

    prompt = (
        'You are a clinical pharmacist. The user entered: "' + drug + '". '
        'This may be a brand name or generic name. Handle both. '
        'Use ' + level + ' for ALL text fields. '
        'Respond ONLY with valid JSON, no markdown, no backticks, using EXACTLY this schema with ALL fields present: '
        '{'
        '"drugName": "Generic name (Brand name) or just Generic if no brand",'
        '"isBrand": true or false,'
        '"brandNote": "If isBrand is true write: [Brand] is the brand name for [generic]. Otherwise empty string.",'
        '"condition": "1-2 sentences describing what condition or disease this drug treats",'
        '"what": "1-2 sentences on how this drug works in the body",'
        '"how": "2-3 bullet points on how to take it (timing, food, storage)",'
        '"missedDose": "2-3 sentences on what to do if a dose is missed",'
        '"foodAlcohol": "bullet points on food interactions, alcohol, and timing",'
        '"side": "3-4 bullet points of common side effects each prefixed with severity: [green] for mild, [yellow] for moderate, [red] for serious",'
        '"warn": "2-3 bullet points of serious warning signs requiring medical attention, each prefixed [red]",'
        '"injection": "if this is an injectable or biologic drug provide numbered step-by-step administration instructions, otherwise return empty string",'
        '"cost": "1-2 sentences on whether a generic is available and cost-saving options like GoodRx or manufacturer coupons",'
        '"teachback": ["patient question 1", "patient question 2", "patient question 3"],'
        '"caregiverTeachback": ["caregiver-specific question 1", "caregiver-specific question 2"],'
        '"caregiverTips": "2-3 sentences of practical overview advice specifically written for a caregiver helping someone take this medication",'
        '"caregiverMonitoring": "3-4 bullet points of specific things a caregiver should actively monitor in the patient: physical symptoms, behavioral changes, lab values if applicable",'
        '"caregiverAdmin": "3 bullet points on how a caregiver can help manage this medication day-to-day: storage tips, setting up reminders, what to do if the patient refuses or forgets",'
        '"caregiverWatchFor": "3 bullet points of specific warning signs a caregiver should watch for that mean call the doctor or call 911 right away"'
        '}'
    )

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 8192, "responseMimeType": "application/json"}
    }).encode()

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        text = text.strip().replace("```json", "").replace("```", "").strip()
        return jsonify(json.loads(text))
    except urllib.error.HTTPError as e:
        return jsonify({"error": json.loads(e.read()).get("error", {}).get("message", str(e))}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/interactions", methods=["POST"])
def interactions():
    if not API_KEY:
        return jsonify({"error": "GEMINI_API_KEY not set."}), 500
    body = request.get_json()
    drugs = body.get("drugs", [])
    level = body.get("level", "simple and clear language").strip()
    if len(drugs) < 2:
        return jsonify({"error": "Please add at least 2 medications to check interactions."}), 400

    prompt = (
        'You are a clinical pharmacist. The patient is taking: ' + ", ".join(drugs) + '. '
        'Check for drug-drug interactions, food-drug interactions, and therapeutic duplications. '
        'Use ' + level + ' reading level. '
        'Respond ONLY with valid JSON: '
        '{"summary": "1-2 sentence overall safety summary",'
        '"interactions": [{"drugs": "Drug A + Drug B", "severity": "green or yellow or red", "description": "plain language explanation", "action": "what to do"}],'
        '"duplications": ["any therapeutic duplications as plain strings"],'
        '"safe": true or false,'
        '"recommendation": "overall recommendation in plain language"}'
        'If no interactions found return empty interactions array and safe: true.'
    )

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 8192, "responseMimeType": "application/json"}
    }).encode()

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        text = text.strip().replace("```json", "").replace("```", "").strip()
        return jsonify(json.loads(text))
    except urllib.error.HTTPError as e:
        return jsonify({"error": json.loads(e.read()).get("error", {}).get("message", str(e))}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/translate", methods=["POST"])
def translate():
    if not API_KEY:
        return jsonify({"error": "GEMINI_API_KEY not set."}), 500
    body = request.get_json()
    data = body.get("data", {})
    prompt = (
        'Translate the following medication information from English to plain conversational Spanish. '
        'Preserve all medical accuracy. Keep bullet point formatting. '
        'Respond ONLY with valid JSON using the exact same schema, translating only the values not the keys: '
        + json.dumps(data)
    )
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 8192, "responseMimeType": "application/json"}
    }).encode()
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        text = text.strip().replace("```json", "").replace("```", "").strip()
        return jsonify(json.loads(text))
    except urllib.error.HTTPError as e:
        return jsonify({"error": json.loads(e.read()).get("error", {}).get("message", str(e))}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    if not API_KEY:
        print("GEMINI_API_KEY not set.")
    print("Pill Talk running at http://0.0.0.0:10000")
    app.run(host="0.0.0.0", port=10000, debug=False)
