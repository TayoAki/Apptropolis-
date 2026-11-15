#!/usr/bin/env python3
"""Generates one AI food image per Five Dinners recipe with OpenRouter (Gemini 3.1 Flash Image).

Every billed call is counted (OpenRouter returns usage.cost even when the image is missing), there
is at most ONE retry per recipe, and the run stops when the spend reaches CAP_USD.
Usage: python3 gen.py [recipe ids...]   (no ids = all missing)
"""
import base64, json, os, re, sys, urllib.request

MODEL = "google/gemini-3.1-flash-image"
CAP_USD = 3.0
OUT = os.path.dirname(os.path.abspath(__file__))
SCHEMA = "/home/user/Apptropolis-/five-dinners/data/schema.ts"

src = open(SCHEMA).read()
names = {m.group(1): m.group(2) for m in re.finditer(r'key: "(\w+)", name: "([^"]+)"', src)}
recipes = []
for m in re.finditer(r'id: "(r\d+)", name: "([^"]+)".*?blurb: "([^"]+)",\s*ingredients: \[(.*?)\],\s*steps', src, re.S):
    keys = re.findall(r'\["(\w+)"', m.group(4))
    recipes.append(dict(id=m.group(1), name=m.group(2), blurb=m.group(3), ingredients=[names.get(k, k) for k in keys]))

STAPLES = {"Olive oil", "Salt", "Garlic", "Vegetable stock", "Soy sauce", "Paprika", "Ground cumin", "Chili powder"}

def prompt(r):
    shown = [i for i in r["ingredients"] if i not in STAPLES]
    return (
        f"A realistic, appetizing photograph of a home-cooked dinner: {r['name']}. {r['blurb']} "
        f"Visible ingredients: {', '.join(shown)}. "
        "Served for a family dinner the way a home cook would, in a simple ceramic bowl or plate, or in the pan "
        "or sheet tray it was cooked in, on a warm wooden kitchen table. Soft natural window light, three-quarter "
        "overhead angle, shallow depth of field, true-to-life colours. Ordinary home cooking, not restaurant plating. "
        "Show only this dish: no bread, no side dishes, and no cheese, herbs or garnish that are not in the "
        "ingredients. No people, no hands, no text, no labels, no logos, no packaging. Landscape 4:3."
    )

def generate(r):
    body = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt(r)}],
        "modalities": ["image", "text"],
        "image_config": {"aspect_ratio": "4:3"},
    }
    req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": "Bearer sk-or-dummy"})
    res = json.load(urllib.request.urlopen(req, timeout=180))
    cost = float(res.get("usage", {}).get("cost") or 0)
    images = res["choices"][0]["message"].get("images") or []
    data = None
    if images:
        url = images[0]["image_url"]["url"]
        data = base64.b64decode(url.split(",", 1)[1])
    return data, cost

ledger_path = f"{OUT}/ledger.json"
ledger = json.load(open(ledger_path)) if os.path.exists(ledger_path) else {"spent": 0.0, "calls": []}
import threading, concurrent.futures as cf
lock = threading.Lock()
want = set(sys.argv[1:])

def run(r):
    path = f"{OUT}/{r['id']}.png"
    for attempt in (1, 2):
        with lock:
            if ledger["spent"] >= CAP_USD:
                print("cap reached", ledger["spent"]); return
        try:
            data, cost = generate(r)
        except Exception as e:  # network or API error: not billed when the request fails outright
            print(r["id"], "error", str(e)[:120]); data, cost = None, 0.0
        with lock:
            ledger["spent"] += cost
            ledger["calls"].append({"id": r["id"], "attempt": attempt, "cost": cost, "ok": bool(data)})
            json.dump(ledger, open(ledger_path, "w"), indent=1)
        if data:
            open(path, "wb").write(data)
            print(r["id"], r["name"], f"${cost:.4f}", f"total ${ledger['spent']:.4f}", flush=True)
            return

todo = [r for r in recipes if (r["id"] in want) if want] if want else [r for r in recipes if not os.path.exists(f"{OUT}/{r['id']}.png")]
with cf.ThreadPoolExecutor(4) as ex:
    list(ex.map(run, todo))
print("spent", round(ledger["spent"], 4), "USD over", len(ledger["calls"]), "calls")
