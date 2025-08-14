# 🌤️ Crypto Weather Forecast Extension

A Chrome extension that presents cryptocurrency market conditions as intuitive weather forecasts. Get real-time "weather reports" for crypto markets with storms representing high volatility, sunny skies for stable bull markets, and everything in between.

## ✨ What’s new

- Moved all images to `public/` and switched UI to use image icons with emoji fallback
- Added header logo (`public/logo.png`) displayed on the popup home page
- Updated extension/action icons to `public/Crypto-Weather.png`
- Centered and highlighted the current weather card with a lighter gradient background

## 🎯 Features

- **Current Conditions** rendered as weather: ☀️ Sunny, 🌤️ Mostly Sunny, ⛅ Partly Cloudy, ☁️ Overcast, 🌦️ Showers, ⛈️ Storm, 🌫️ Foggy, 🌪️ Crypto Hurricane
- **5‑Day Forecast**
- **Market Temperature** (volatility), **Sentiment Winds**, **Fear & Greed**, **Trends**
- **Weather Alerts** for extreme conditions

## 🚀 Install (Load Unpacked)

1. Open `chrome://extensions/` and enable Developer mode
2. Click “Load unpacked” → select the project folder
3. Pin the extension and click the toolbar icon to open the popup

## 🔧 Configure

- Click Settings in the popup to set your CoinGecko API tier/key and tracked coins
- Theme toggle available in the header

## 🖼️ Assets (public/)

The extension loads images from `public/` via `chrome.runtime.getURL()`.

```
public/
├── Crypto-Weather.png          # used for action/icons (all sizes)
├── logo.png                    # shown at top of popup
├── icon-sunny.png
├── icon-mostly-sunny.png
├── icon-partly-cloudy.png
├── icon-cloudy.png
├── icon-showers.png
├── icon-storm.png
├── icon-fog.png
└── icon-hurricane.png
```

The UI prefers these images and falls back to emoji when unavailable.

## 📄 Manifest highlights

- `icons` and `action.default_icon` reference `public/Crypto-Weather.png`
- Background service worker: `background.js`
- Popup: `popup.html` / `popup.js`
- Options page: `options.html` / `options.js`

## 🔁 Live dev workflow

- Popup/UI edits (`popup.html`, `popup.js`, files in `public/`): reopen the popup, or right‑click popup → Inspect → Cmd+R
- Background edits (`background.js`): on `chrome://extensions/` click the “service worker” link then Cmd+R
- Manifest/icon changes: click “Update” on `chrome://extensions` or toggle the extension off/on

## 📁 Project structure

```
Crypto Weather Forecast Extension/
├── background.js
├── manifest.json
├── options.html
├── options.js
├── popup.html
├── popup.js
├── crypto_weather_readme.md
└── public/
    ├── Crypto-Weather.png
    ├── logo.png
    ├── icon-sunny.png
    ├── icon-mostly-sunny.png
    ├── icon-partly-cloudy.png
    ├── icon-cloudy.png
    ├── icon-showers.png
    ├── icon-storm.png
    ├── icon-fog.png
    └── icon-hurricane.png
```

## 🧭 Troubleshooting

- If an image doesn’t show, ensure the file exists under `public/` and paths are not relative but set with `chrome.runtime.getURL('public/...')`.
- After changing `manifest.json` or icons, click “Update” on `chrome://extensions/`.
