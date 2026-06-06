from flask import Flask, request, jsonify, send_from_directory
import os, json, urllib.request, urllib.error

app = Flask(__name__, static_folder='templates')
API_KEY = os.environ.get("GEMINI_API_KEY", "")

@app.route("/")
def landing():
    return send_from_directory("templates", "landing.html")

@app.route("/app")
def index():
    return send_from_directory("templates", "index.html")

@app.route("/mymeds")
def mymeds():
    return send_from_directory("templates", "mymeds.html")

@app.route("/medcard")
def medcard():
    return send_from_directory("templates", "medcard.html")

@app.route("/symptoms")
def symptoms():
    return send_from_directory("templates", "symptoms.html")

@app.route("/tracker")
def tracker():
    return send_from_directory("templates", "tracker.html")

@app.route("/app.js")
def appjs():
    return send_from_directory("templates", "app.js", mimetype="application/javascript")

@app.route("/icon.svg")
def icon():
    return send_from_directory("templates", "icon.svg", mimetype="image/svg+xml")

def gemini(prompt, max_tokens=8192):
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": max_tokens,
            "responseMimeType": "application/json"
        }
    }).encode()
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    return text.strip().replace("```json", "").replace("```", "").strip()

@app.route("/counsel", methods=["POST"])
def counsel():
    if not API_KEY:
        return jsonify({"error": "GEMINI_API_KEY not set."}), 500
    body = request.get_json()
    drug = body.get("drug", "").strip()
    level = body.get("level", "simple and clear language").strip()
    if not drug:
        return jsonify({"error": "No drug name provided."}), 400

    prompt = """You are a clinical pharmacist. The user entered: "{drug}". This may be a brand or generic name, and may contain misspellings or typos. Use your best clinical judgment to identify the intended medication. Handle both brand and generic names.
Use {level} for ALL text fields.
Respond ONLY with valid JSON using EXACTLY this schema with ALL fields present:
{{
  "drugName": "Generic (Brand) or just Generic",
  "isBrand": true or false,
  "brandNote": "If isBrand: Brand X is the brand name for generic Y. Else empty string.",
  "condition": "1-2 sentences on what condition this treats",
  "what": "1-2 sentences on how this drug works in the body",
  "how": "2-3 bullet points on how to take it",
  "missedDose": "2-3 sentences on what to do if a dose is missed",
  "foodAlcohol": "bullet points on food, alcohol, and timing interactions",
  "side": "3-4 bullet points of common side effects each prefixed [green] [yellow] or [red]",
  "warn": "2-3 bullet points of serious warning signs each prefixed [red]",
  "injection": "if injectable/biologic: brief plain text summary of administration. Else empty string.",
  "injectionSteps": "if injectable: array of 6-12 step strings like [\\"Wash hands thoroughly\\", \\"Remove from fridge 30 min before use\\"]. Else empty array [].",
  "injectionType": "pen, syringe, autoinjector, IV, inhaler, or patch. Empty string if not injectable.",
  "injectionSite": "if injectable: 1-2 sentences on rotation sites. Else empty string.",
  "cost": "1-2 sentences on generic availability and cost-saving tips like GoodRx",
  "teachback": ["patient question 1", "patient question 2", "patient question 3"],
  "caregiverTeachback": ["caregiver question 1", "caregiver question 2"],
  "caregiverTips": "2-3 sentences of practical advice for a caregiver helping someone take this medication",
  "caregiverMonitoring": "3-4 bullet points of things a caregiver should actively monitor in the patient",
  "caregiverAdmin": "3 bullet points on how a caregiver can help manage this medication day-to-day",
  "caregiverWatchFor": "3 bullet points of warning signs a caregiver should watch for requiring doctor or 911"
}}""".format(drug=drug, level=level)

    try:
        result = json.loads(gemini(prompt))
        return jsonify(result)
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

    prompt = """You are a clinical pharmacist. The patient is taking: {drugs}.
Check for drug-drug interactions, food-drug interactions, and therapeutic duplications.
Use {level} reading level.
Respond ONLY with valid JSON:
{{
  "summary": "1-2 sentence overall safety summary",
  "interactions": [{{"drugs": "Drug A + Drug B", "severity": "green or yellow or red", "description": "plain language explanation", "action": "what to do"}}],
  "duplications": ["any therapeutic duplications"],
  "safe": true or false,
  "recommendation": "overall recommendation in plain language"
}}
If no interactions found return empty interactions array and safe: true.""".format(
        drugs=", ".join(drugs), level=level)

    try:
        result = json.loads(gemini(prompt))
        return jsonify(result)
    except urllib.error.HTTPError as e:
        return jsonify({"error": json.loads(e.read()).get("error", {}).get("message", str(e))}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/check-symptoms", methods=["POST"])
def check_symptoms():
    if not API_KEY:
        return jsonify({"error": "GEMINI_API_KEY not set."}), 500
    body = request.get_json()
    drugs = body.get("drugs", [])
    syms = body.get("symptoms", "").strip()
    level = body.get("level", "simple and clear language").strip()
    if not syms:
        return jsonify({"error": "Please describe your symptoms."}), 400

    prompt = """You are a clinical pharmacist. A patient is taking: {drugs}.
They are experiencing: "{syms}".
Analyze whether each symptom is a known drug side effect, possible drug interaction, or requires medical attention.
Use {level} reading level.
Respond ONLY with valid JSON:
{{
  "overallRisk": "low, moderate, or high",
  "overallSummary": "1-2 sentence plain language summary",
  "findings": [
    {{
      "symptom": "symptom name",
      "severity": "green, yellow, or red",
      "category": "known side effect, possible interaction, unrelated, or seek care",
      "explanation": "plain language explanation",
      "action": "monitor at home, call your doctor, or go to ER now",
      "drug": "which drug is likely causing this or empty string"
    }}
  ],
  "urgentAction": "if any symptom is red: what to do immediately. Else empty string.",
  "disclaimer": "one sentence reminder to consult a healthcare provider"
}}""".format(
        drugs=", ".join(drugs) if drugs else "unknown medications",
        syms=syms, level=level)

    try:
        result = json.loads(gemini(prompt, max_tokens=4096))
        return jsonify(result)
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
    prompt = ("Translate the following medication information from English to plain conversational Spanish. "
              "Preserve medical accuracy. Keep bullet point formatting. "
              "Respond ONLY with valid JSON using the exact same schema, translating only the values not the keys: "
              + json.dumps(data))
    try:
        result = json.loads(gemini(prompt))
        return jsonify(result)
    except urllib.error.HTTPError as e:
        return jsonify({"error": json.loads(e.read()).get("error", {}).get("message", str(e))}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/manifest.json")
def manifest():
    return send_from_directory("templates", "manifest.json", mimetype="application/manifest+json")

@app.route("/sw.js")
def service_worker():
    response = send_from_directory("templates", "sw.js", mimetype="application/javascript")
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache"
    return response

@app.route("/offline")
def offline():
    return send_from_directory("templates", "404.html")

@app.route("/share/<drug>")
def share_drug(drug):
    from flask import redirect
    return redirect("/app?drug=" + drug)

@app.errorhandler(404)
def not_found(e):
    return send_from_directory("templates", "404.html"), 404

if __name__ == "__main__":
    if not API_KEY:
        print("GEMINI_API_KEY not set.")
    print("Pill Talk running at http://0.0.0.0:10000")
    app.run(host="0.0.0.0", port=10000, debug=False)
