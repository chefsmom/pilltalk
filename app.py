from flask import Flask, request, jsonify, send_from_directory
import os, json, urllib.request, urllib.error

app = Flask(__name__, static_folder='templates')
API_KEY = os.environ.get("GEMINI_API_KEY", "")

@app.route("/")
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
        'This may be a brand name (e.g. Lipitor) or generic (e.g. atorvastatin). Handle both. '
        'Respond ONLY with valid JSON using exactly this schema, no markdown, no backticks: '
        '{"drugName": "Generic (Brand)", "isBrand": true or false, "brandNote": "brand note or empty string", '
        '"what": "1-2 sentences at ' + level + ' reading level", '
        '"how": "bullet points on how to take it at ' + level + ' reading level", '
        '"side": "bullet points of 3-4 common side effects at ' + level + ' reading level", '
        '"warn": "bullet points of 2-3 warning signs at ' + level + ' reading level", '
        '"teachback": ["question 1", "question 2", "question 3"]}'
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
