from flask import Flask, request, jsonify, send_from_directory
import os, json, urllib.request, urllib.error

app = Flask(__name__, static_folder='templates')
API_KEY = os.environ.get("GEMINI_API_KEY", "")

@app.route("/")
def landing():
    from flask import redirect
    return redirect("/app")

@app.route("/landing")
def landing_page():
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

@app.route("/pilltalk.js")
def pilltalkjs():
    return send_from_directory("templates", "pilltalk.js", mimetype="application/javascript")

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
    with urllib.request.urlopen(req, timeout=30) as resp:
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

    prompt = """You are a clinical pharmacist AI assistant built into Pill Talk, a plain-language medication education app.
The user entered: "{drug}". This may be a brand name, generic name, plain language description (e.g. "water pill", "blood thinner"), abbreviation, or may contain misspellings. Use your best clinical judgment to identify the intended medication.
Use {level} for ALL explanatory text fields. Be thorough, accurate, and patient-centered.
Respond ONLY with a single valid JSON object. No markdown, no explanation, just JSON with EXACTLY this schema:
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
  "caregiverWatchFor": "3 bullet points of warning signs a caregiver should watch for requiring doctor or 911",
  "financialResources": "3-5 bullet points of financial help specific to this drug: 1) Manufacturer patient assistance program - name, eligibility (income-based), website. 2) GoodRx estimated price range and tip. 3) Any specialty pharmacy programs, copay cards, or foundations. Be specific to this exact medication.",
  "alternatives": "1-2 sentences on therapeutic alternatives or generic availability if relevant",
  "pregnancyWarning": "If this medication has known risks during pregnancy or breastfeeding, provide a 1-2 sentence plain language warning and recommend consulting a doctor or calling MotherToBaby at 1-866-626-6847. If generally considered safe or low risk, say so briefly. Never leave this empty."
}}""".format(drug=drug, level=level)

    try:
        raw = gemini(prompt)
        result = json.loads(raw)
        # Ensure all required fields exist
        defaults = {"drugName": drug, "isBrand": False, "brandNote": "", "condition": "",
                   "what": "", "how": "", "missedDose": "", "foodAlcohol": "", "side": "",
                   "warn": "", "injection": "", "injectionSteps": [], "injectionType": "",
                   "injectionSite": "", "cost": "", "teachback": [], "caregiverTeachback": [],
                   "caregiverTips": "", "caregiverMonitoring": "", "caregiverAdmin": "",
                   "caregiverWatchFor": "", "financialResources": "", "alternatives": ""}
        for k, v in defaults.items():
            if k not in result:
                result[k] = v
        return jsonify(result)
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read()).get("error", {}).get("message", str(e))
        except:
            msg = str(e)
        return jsonify({"error": f"AI service error: {msg}"}), 502
    except json.JSONDecodeError as e:
        return jsonify({"error": "Could not parse AI response. Please try again."}), 500
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
        raw = gemini(prompt)
        result = json.loads(raw)
        return jsonify(result)
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read()).get("error", {}).get("message", str(e))
        except:
            msg = str(e)
        return jsonify({"error": f"AI service error: {msg}"}), 502
    except json.JSONDecodeError as e:
        return jsonify({"error": "Could not parse AI response. Please try again."}), 500
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
    text = body.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    prompt = ("Translate the following medication information from English to plain conversational Spanish. "
              "Preserve medical accuracy. Respond ONLY with the translated text and nothing else: "
              + text)
    try:
        translated = gemini(prompt)
        return jsonify({"translated_text": translated})
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read()).get("error", {}).get("message", str(e))
        except:
            msg = str(e)
        return jsonify({"error": f"AI service error: {msg}"}), 502
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


PLAIN_LANGUAGE_MAP = {
    "water pill": ["furosemide", "Lasix", "hydrochlorothiazide", "HCTZ", "chlorthalidone", "torsemide", "bumetanide", "indapamide", "metolazone", "spironolactone"],
    "blood thinner": ["warfarin", "Coumadin", "apixaban", "Eliquis", "rivaroxaban", "Xarelto", "dabigatran", "Pradaxa", "clopidogrel", "Plavix", "aspirin", "enoxaparin", "Lovenox"],
    "blood pressure pill": ["lisinopril", "amlodipine", "metoprolol", "losartan", "hydrochlorothiazide", "atenolol", "carvedilol", "valsartan", "ramipril", "benazepril"],
    "heart pill": ["metoprolol", "carvedilol", "lisinopril", "digoxin", "amiodarone", "warfarin", "furosemide", "spironolactone", "atorvastatin", "aspirin"],
    "cholesterol pill": ["atorvastatin", "Lipitor", "rosuvastatin", "Crestor", "simvastatin", "Zocor", "pravastatin", "lovastatin", "ezetimibe", "Zetia"],
    "statin": ["atorvastatin", "Lipitor", "rosuvastatin", "Crestor", "simvastatin", "Zocor", "pravastatin", "lovastatin", "pitavastatin", "fluvastatin"],
    "sugar pill": ["metformin", "Glucophage", "glipizide", "glimepiride", "sitagliptin", "Januvia", "empagliflozin", "Jardiance", "semaglutide", "Ozempic"],
    "diabetes pill": ["metformin", "Glucophage", "glipizide", "glimepiride", "sitagliptin", "Januvia", "empagliflozin", "Jardiance", "dapagliflozin", "Farxiga"],
    "diabetes injection": ["semaglutide", "Ozempic", "Wegovy", "liraglutide", "Victoza", "dulaglutide", "Trulicity", "tirzepatide", "Mounjaro", "insulin glargine", "Lantus"],
    "weight loss injection": ["semaglutide", "Ozempic", "Wegovy", "tirzepatide", "Mounjaro", "Zepbound", "liraglutide", "Saxenda"],
    "weight loss pill": ["orlistat", "Xenical", "phentermine", "topiramate", "naltrexone bupropion", "Contrave"],
    "thyroid pill": ["levothyroxine", "Synthroid", "Levoxyl", "Tirosint", "liothyronine", "Cytomel", "Armour Thyroid"],
    "sleeping pill": ["zolpidem", "Ambien", "eszopiclone", "Lunesta", "zaleplon", "Sonata", "trazodone", "melatonin", "diphenhydramine", "suvorexant", "Belsomra"],
    "anxiety pill": ["alprazolam", "Xanax", "lorazepam", "Ativan", "clonazepam", "Klonopin", "buspirone", "sertraline", "Zoloft", "escitalopram", "Lexapro"],
    "depression pill": ["sertraline", "Zoloft", "escitalopram", "Lexapro", "fluoxetine", "Prozac", "bupropion", "Wellbutrin", "duloxetine", "Cymbalta", "venlafaxine", "Effexor"],
    "antidepressant": ["sertraline", "Zoloft", "escitalopram", "Lexapro", "fluoxetine", "Prozac", "bupropion", "Wellbutrin", "duloxetine", "Cymbalta", "mirtazapine", "Remeron"],
    "nerve pill": ["gabapentin", "Neurontin", "pregabalin", "Lyrica", "duloxetine", "Cymbalta", "amitriptyline", "carbamazepine", "Tegretol"],
    "seizure pill": ["levetiracetam", "Keppra", "lamotrigine", "Lamictal", "phenytoin", "Dilantin", "valproate", "Depakote", "carbamazepine", "Tegretol", "topiramate", "Topamax"],
    "pain pill": ["ibuprofen", "Advil", "acetaminophen", "Tylenol", "naproxen", "Aleve", "oxycodone", "hydrocodone", "tramadol", "gabapentin", "Neurontin"],
    "allergy pill": ["cetirizine", "Zyrtec", "loratadine", "Claritin", "fexofenadine", "Allegra", "diphenhydramine", "Benadryl", "levocetirizine", "Xyzal"],
    "stomach acid pill": ["omeprazole", "Prilosec", "esomeprazole", "Nexium", "pantoprazole", "Protonix", "lansoprazole", "Prevacid", "famotidine", "Pepcid"],
    "acid reflux pill": ["omeprazole", "Prilosec", "esomeprazole", "Nexium", "pantoprazole", "Protonix", "lansoprazole", "Prevacid", "famotidine", "Pepcid"],
    "heartburn pill": ["omeprazole", "Prilosec", "esomeprazole", "Nexium", "famotidine", "Pepcid", "calcium carbonate", "Tums", "ranitidine"],
    "steroid pill": ["prednisone", "prednisolone", "dexamethasone", "methylprednisolone", "Medrol", "hydrocortisone"],
    "antibiotic pill": ["amoxicillin", "azithromycin", "Zithromax", "doxycycline", "cephalexin", "Keflex", "ciprofloxacin", "Cipro", "trimethoprim sulfamethoxazole", "Bactrim"],
    "inhaler": ["albuterol", "ProAir", "Ventolin", "fluticasone", "Flovent", "budesonide", "Pulmicort", "Advair", "Symbicort", "Breo", "Spiriva", "tiotropium"],
    "rescue inhaler": ["albuterol", "ProAir HFA", "Ventolin HFA", "Proventil", "levalbuterol", "Xopenex"],
    "mood stabilizer": ["lithium", "Lithobid", "valproate", "Depakote", "lamotrigine", "Lamictal", "carbamazepine", "Tegretol", "quetiapine", "Seroquel"],
    "antipsychotic": ["quetiapine", "Seroquel", "aripiprazole", "Abilify", "olanzapine", "Zyprexa", "risperidone", "Risperdal", "lurasidone", "Latuda"],
    "adhd pill": ["methylphenidate", "Ritalin", "Concerta", "amphetamine", "Adderall", "lisdexamfetamine", "Vyvanse", "atomoxetine", "Strattera"],
    "birth control pill": ["norethindrone", "levonorgestrel", "Yaz", "Yasmin", "Lo Loestrin", "Junel", "Ortho Tri-Cyclen", "Sprintec"],
    "purple pill": ["esomeprazole", "Nexium"],
    "little white pill": ["lisinopril", "metformin", "atorvastatin", "levothyroxine", "metoprolol"],
    "blood sugar medicine": ["metformin", "Glucophage", "insulin", "glipizide", "sitagliptin", "Januvia", "empagliflozin", "Jardiance"],
    "gout pill": ["allopurinol", "Zyloprim", "febuxostat", "Uloric", "colchicine", "Colcrys", "indomethacin"],
    "arthritis pill": ["methotrexate", "hydroxychloroquine", "Plaquenil", "sulfasalazine", "leflunomide", "Arava", "adalimumab", "Humira", "etanercept", "Enbrel"],
    "osteoporosis pill": ["alendronate", "Fosamax", "risedronate", "Actonel", "ibandronate", "Boniva", "denosumab", "Prolia"],
    "migraine pill": ["sumatriptan", "Imitrex", "rizatriptan", "Maxalt", "topiramate", "Topamax", "propranolol", "amitriptyline", "ubrogepant", "Ubrelvy"],
    "diuretic": ["furosemide", "Lasix", "hydrochlorothiazide", "HCTZ", "chlorthalidone", "spironolactone", "torsemide", "bumetanide"],
    "beta blocker": ["metoprolol", "atenolol", "carvedilol", "bisoprolol", "propranolol", "nebivolol", "labetalol"],
    "ace inhibitor": ["lisinopril", "enalapril", "ramipril", "benazepril", "captopril", "fosinopril", "quinapril"],
    "arb": ["losartan", "valsartan", "irbesartan", "olmesartan", "candesartan", "telmisartan", "azilsartan"],
    "ssri": ["sertraline", "Zoloft", "fluoxetine", "Prozac", "escitalopram", "Lexapro", "paroxetine", "Paxil", "citalopram", "Celexa"],
    "snri": ["venlafaxine", "Effexor", "duloxetine", "Cymbalta", "desvenlafaxine", "Pristiq", "levomilnacipran", "Fetzima"],
    "glp-1": ["semaglutide", "Ozempic", "Wegovy", "liraglutide", "Victoza", "dulaglutide", "Trulicity", "exenatide", "Byetta", "tirzepatide", "Mounjaro"],
    "ppi": ["omeprazole", "Prilosec", "esomeprazole", "Nexium", "pantoprazole", "Protonix", "lansoprazole", "Prevacid", "rabeprazole", "Aciphex"],
    "blood clot medicine": ["warfarin", "Coumadin", "apixaban", "Eliquis", "rivaroxaban", "Xarelto", "enoxaparin", "Lovenox", "heparin"],
    "nausea pill": ["ondansetron", "Zofran", "promethazine", "Phenergan", "metoclopramide", "Reglan", "prochlorperazine", "Compazine"],
    "constipation pill": ["polyethylene glycol", "MiraLax", "bisacodyl", "Dulcolax", "docusate", "Colace", "psyllium", "Metamucil", "lactulose"],
    "diarrhea pill": ["loperamide", "Imodium", "bismuth subsalicylate", "Pepto-Bismol", "diphenoxylate", "Lomotil"],
    "infection pill": ["amoxicillin", "azithromycin", "doxycycline", "cephalexin", "ciprofloxacin", "trimethoprim sulfamethoxazole", "Bactrim", "metronidazole", "Flagyl"],
}

@app.route("/autocomplete")
def autocomplete():
    query = request.args.get("q", "").lower().strip()
    if not query or len(query) < 2:
        return json.dumps([])
    
    # Check plain language map first
    for term, drugs in PLAIN_LANGUAGE_MAP.items():
        if query in term or term in query or term.startswith(query):
            return json.dumps(drugs[:10])
    
    # Fall back to regular name matching
    with open(os.path.join(os.path.dirname(__file__), "drug_names.json")) as f:
        names = json.load(f)
    results = [n for n in names if query in n.lower()]
    return json.dumps(results[:10])

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
