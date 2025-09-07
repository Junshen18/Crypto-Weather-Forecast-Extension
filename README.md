# 🌤️ Froggy Crypto Weather Forecast Extension

A Chrome extension that presents cryptocurrency market conditions as intuitive weather forecasts. Get real-time "weather reports" for crypto markets with storms representing high volatility, sunny skies for stable bull markets, and everything in between.

## 🎯 Features

- **Current Conditions** rendered as weather: ☀️ Sunny, 🌤️ Mostly Sunny, ⛅ Partly Cloudy, ☁️ Overcast, 🌦️ Showers, ⛈️ Storm, 🌫️ Foggy, 🌪️ Crypto Hurricane
- **5‑Day Forecast** (AI‑enhanced via Gemini, with heuristic fallback)
- **Market Temperature** (volatility), **Sentiment Winds**, **Fear & Greed**, **Trends**
- **Weather Alerts** for extreme conditions

## ▶️ How to run the extension

1. Open `chrome://extensions/` and enable Developer mode.
2. Click “Load unpacked” and select the project folder.
3. Pin the extension and click the toolbar icon to open the popup.
4. Click “Settings” and configure:
   - API Tier: Demo or Pro (CoinGecko)
   - CoinGecko API Key
   - Tracked Coins (comma‑separated IDs)
   - Gemini API Key (from Google AI Studio)
5. Click “Save Settings”.
6. Back in the popup, press “Refresh” to fetch market data and generate the Gemini forecast.
7. Optional: Toggle the theme in the header.

## 🧰 Tech stack

- Chrome Extension MV3 (service worker background)
- JavaScript (vanilla), HTML, CSS
- CoinGecko MCP API (markets/global/trending)
- Google Gemini 1.5 Flash via Generative Language API
- `chrome.storage` for settings/state
- Fetch API for network requests
- Image assets in `public/` loaded via `chrome.runtime.getURL()`

## 📄 Manifest highlights

- `icons` and `action.default_icon` reference `public/Crypto-Weather.png`
- Background service worker: `background.js`
- Popup: `popup.html` / `popup.js`
- Options page: `options.html` / `options.js`
- Host permissions include `https://generativelanguage.googleapis.com/*` for Gemini

## 🔁 Live dev workflow

- Popup/UI edits (`popup.html`, `popup.js`, files in `public/`): reopen the popup, or right‑click popup → Inspect → Cmd+R
- Background edits (`background.js`): on `chrome://extensions/` click the “service worker” link then Cmd+R
- Manifest/icon changes: click “Update” on `chrome://extensions` or toggle the extension off/on

## 🧭 Troubleshooting

- If an image doesn’t show, ensure the file exists under `public/` and paths are not relative but set with `chrome.runtime.getURL('public/...')`.
- After changing `manifest.json` or icons, click “Update” on `chrome://extensions/`.
