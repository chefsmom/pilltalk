# Rx Counselor — Setup Guide

## First-time setup (2 minutes)

### 1. Get your Anthropic API key
Go to https://console.anthropic.com → API Keys → Create Key
Copy the key (starts with `sk-ant-...`)

### 2. Open Terminal and navigate to this folder
```
cd ~/rxcounselor
```

### 3. Set your API key
```
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 4. Run the app
```
python3 app.py
```

### 5. Open your browser
Go to: http://localhost:5000

---

## Every time after that

Just run these two commands:
```
export ANTHROPIC_API_KEY=sk-ant-your-key-here
python3 app.py
```

Then open http://localhost:5000

---

## To stop the app
Press Ctrl+C in Terminal

---

## Tip: Save your API key permanently
To avoid typing it every time, add it to your shell profile:
```
echo 'export ANTHROPIC_API_KEY=sk-ant-your-key-here' >> ~/.zshrc
source ~/.zshrc
```
After this, you only need to run `python3 app.py` to start.
