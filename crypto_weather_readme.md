# 🌤️ Crypto Weather Forecast Extension

A Chrome extension that presents cryptocurrency market conditions as intuitive weather forecasts. Get real-time "weather reports" for crypto markets with storms representing high volatility, sunny skies for stable bull markets, and everything in between.

## 🎯 Features

### Weather-Style Market Analysis
- **Current Conditions**: See market state as weather (☀️ Sunny, ⛈️ Stormy, 🌫️ Foggy, etc.)
- **5-Day Forecast**: Predicted market conditions based on trend analysis
- **Market Temperature**: Volatility levels presented as temperature readings
- **Weather Alerts**: Storm warnings for high volatility periods

### Real-Time Data
- Live data from CoinGecko API
- Monitors 8 major cryptocurrencies
- Updates every 15 minutes automatically
- Manual refresh option available

### Smart Indicators
- **Sentiment Winds**: Bullish/bearish market direction
- **Fear & Greed Index**: Market psychology indicator  
- **Volume Analysis**: Market activity levels
- **Trend Analysis**: Multi-timeframe market direction

## 🚀 Installation

### Method 1: Load as Unpacked Extension (Developer Mode)

1. **Download the extension files:**
   - Save all the provided files in a single folder
   - Create icon files (or use placeholder 16x16, 32x32, 48x48, 128x128 PNG images)

2. **Enable Developer Mode:**
   - Open Chrome and go to `chrome://extensions/`
   - Toggle "Developer Mode" ON (top-right corner)

3. **Load the extension:**
   - Click "Load unpacked" button
   - Select the folder containing your extension files
   - The extension should now appear in your extensions list

4. **Pin the extension:**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Crypto Weather Forecast" and click the pin icon
   - The weather icon should now appear in your toolbar

### Method 2: Create Icons (Required)

Since the extension references icon files, you'll need to create them:

```
icons/
├── sunny-16.png   (16x16 pixels)
├── sunny-32.png   (32x32 pixels)  
├── sunny-48.png   (48x48 pixels)
└── sunny-128.png  (128x128 pixels)
```

You can use any image editor or online icon generators to create these simple sunny weather icons.

## 📁 File Structure

```
crypto