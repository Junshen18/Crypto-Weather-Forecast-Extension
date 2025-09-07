// Crypto Weather Extension - Popup Script

class CryptoWeatherApp {
    constructor() {
        this.mcpEndpoint = 'https://mcp.pro-api.coingecko.com';
        this.majorCoins = ['bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 'polkadot', 'avalanche-2', 'chainlink'];
        this.weatherData = null;
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadWeatherData();
        this.setupEventListeners();
        this.updateLastRefresh();
        // Set logo from public/
        const logoEl = document.getElementById('appLogo');
        if (logoEl) {
            logoEl.src = chrome.runtime.getURL('public/logo.png');
        }
        // Apply saved theme
        chrome.storage.local.get(['theme'], (res) => {
            if (res.theme) document.body.setAttribute('data-theme', res.theme);
        });
    }

    setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadWeatherData();
        });
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                chrome.runtime.openOptionsPage();
            });
        }
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const isLight = document.body.getAttribute('data-theme') === 'light';
                const next = isLight ? 'dark' : 'light';
                document.body.setAttribute('data-theme', next);
                chrome.storage.local.set({ theme: next });
                themeBtn.textContent = next === 'light' ? '🌙 Theme' : '☀️ Theme';
            });
        }
    }

    async loadWeatherData() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const mainContent = document.getElementById('mainContent');
        
        loadingIndicator.style.display = 'block';
        mainContent.style.display = 'none';

        try {
            // Prefer REST API with user key
            const marketData = await this.fetchMarketDataAPI();
            const globalData = await this.fetchGlobalDataAPI();
            const trendingData = await this.fetchTrendingDataAPI();
            
            // Analyze market conditions
            this.weatherData = this.analyzeMarketConditions(marketData, globalData, trendingData);
            
            // Update UI
            this.updateCurrentWeather();
            this.updateForecast();
            this.updateMarketConditions();
            this.updateAlerts();
            this.updateTrending();
            
            // Kick off Gemini forecast (non-blocking)
            this.loadGeminiForecast();
            
            loadingIndicator.style.display = 'none';
            mainContent.style.display = 'block';
            
            this.updateLastRefresh();
            
        } catch (error) {
            console.error('Error loading weather data:', error);
            this.showError();
        }
    }

    async callMCPTool(toolName, parameters = {}) {
        // Prefer REST API using stored key/tier. Keep MCP path as fallback/offline structure.
        const { baseUrl, headers } = await this.getApiConfig();
        const url = new URL(`${baseUrl}/mcp/${toolName}`);
        // Not a real endpoint; leave as placeholder if needed in future.
        const response = await fetch(url.toString(), { headers });
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        return await response.json();
    }

    async getApiConfig() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['cg_api_tier', 'cg_api_key'], (res) => {
                const tier = res.cg_api_tier || 'demo';
                const key = res.cg_api_key || '';
                const isPro = tier === 'pro';
                const baseUrl = isPro ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3';
                const headers = {};
                if (key) headers[isPro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] = key;
                resolve({ baseUrl, headers });
            });
        });
    }

    async fetchMarketDataAPI() {
        const { baseUrl, headers } = await this.getApiConfig();
        const ids = encodeURIComponent(this.majorCoins.join(','));
        const url = `${baseUrl}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h,7d`;
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`markets failed: ${response.status}`);
        const rows = await response.json();
        return rows.map(r => ({
            id: r.id,
            name: r.name,
            current_price: r.current_price,
            market_cap: r.market_cap,
            total_volume: r.total_volume,
            price_change_percentage_24h: r.price_change_percentage_24h_in_currency ?? r.price_change_percentage_24h,
            price_change_percentage_7d: r.price_change_percentage_7d_in_currency ?? r.price_change_percentage_7d,
            last_updated: r.last_updated
        }));
    }

    async fetchGlobalDataAPI() {
        try {
            const { baseUrl, headers } = await this.getApiConfig();
            const res = await fetch(`${baseUrl}/global`, { headers });
            if (!res.ok) throw new Error(`global failed: ${res.status}`);
            const json = await res.json();
            const d = json.data || {};
            const mcapPct = d.market_cap_percentage || {};
            return {
                market_cap_percentage: {
                    bitcoin: mcapPct.btc ?? mcapPct.bitcoin,
                    ethereum: mcapPct.eth ?? mcapPct.ethereum
                },
                total_market_cap: d.total_market_cap || {},
                total_volume: d.total_volume || {},
                market_cap_change_percentage_24h_usd: d.market_cap_change_percentage_24h_usd || 0
            };
        } catch (error) {
            console.warn('Failed to fetch global data:', error);
            return {
                market_cap_percentage: { bitcoin: 50, ethereum: 20 },
                total_market_cap: { usd: 1000000000000 },
                total_volume: { usd: 50000000000 },
                market_cap_change_percentage_24h_usd: 0
            };
        }
    }

    async fetchTrendingDataAPI() {
        try {
            const { baseUrl, headers } = await this.getApiConfig();
            const res = await fetch(`${baseUrl}/search/trending`, { headers });
            if (!res.ok) throw new Error(`trending failed: ${res.status}`);
            const json = await res.json();
            return json.coins || [];
        } catch (error) {
            console.warn('Failed to fetch trending data:', error);
            return [];
        }
    }

    analyzeMarketConditions(marketData, globalData, trendingData) {
        const analysis = {
            volatility: this.calculateVolatility(marketData),
            sentiment: this.calculateSentiment(marketData),
            dominance: globalData.market_cap_percentage,
            fearGreedIndex: this.calculateFearGreed(marketData, trendingData),
            volume: this.calculateVolumeAnalysis(marketData),
            trends: this.analyzeTrends(marketData),
            trending: trendingData
        };

        return {
            ...analysis,
            currentCondition: this.determineWeatherCondition(analysis),
            forecast: this.generateForecast(analysis),
            alerts: this.generateAlerts(analysis, marketData),
            totalMarketCapUsd: (globalData.total_market_cap && globalData.total_market_cap.usd) || undefined
        };
    }

    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['tracked_coins'], (res) => {
                if (res.tracked_coins && Array.isArray(res.tracked_coins) && res.tracked_coins.length > 0) {
                    this.majorCoins = res.tracked_coins;
                }
                resolve();
            });
        });
    }

    calculateVolatility(marketData) {
        if (!marketData || marketData.length === 0) return 50;
        
        const changes = marketData.map(coin => 
            Math.abs(coin.price_change_percentage_24h || 0)
        );

        const avgVolatility = changes.reduce((a, b) => a + b, 0) / changes.length;
        return Math.min(avgVolatility, 100); // Cap at 100
    }

    calculateSentiment(marketData) {
        const gains = marketData.filter(coin => coin.price_change_percentage_24h > 0).length;
        const total = marketData.length;
        return (gains / total) * 100;
    }

    calculateFearGreed(marketData, trendingData) {
        // Enhanced fear/greed calculation using market data + trending data
        if (!marketData || marketData.length === 0) return 50;
        
        const avgChange24h = marketData.reduce((sum, coin) => 
            sum + (coin.price_change_percentage_24h || 0), 0) / marketData.length;
        
        // Trending coins boost (more trending = more greed)
        const trendingBoost = (trendingData && trendingData.length > 5) ? 10 : 0;
        
        // Convert to 0-100 scale (50 = neutral)
        const fearGreed = Math.max(0, Math.min(100, 50 + avgChange24h * 2 + trendingBoost));
        
        return fearGreed;
    }

    calculateVolumeAnalysis(marketData) {
        const totalVolume = marketData.reduce((sum, coin) => sum + (coin.total_volume || 0), 0);
        const avgMarketCap = marketData.reduce((sum, coin) => sum + (coin.market_cap || 0), 0) / marketData.length;
        
        return {
            total: totalVolume,
            volumeToMcapRatio: totalVolume / avgMarketCap
        };
    }

    analyzeTrends(marketData) {
        const trends = {
            bullish: marketData.filter(coin => 
                coin.price_change_percentage_24h > 0 && 
                coin.price_change_percentage_7d > 0
            ).length,
            bearish: marketData.filter(coin => 
                coin.price_change_percentage_24h < 0 && 
                coin.price_change_percentage_7d < 0
            ).length,
            mixed: 0
        };
        
        trends.mixed = marketData.length - trends.bullish - trends.bearish;
        return trends;
    }

    determineWeatherCondition(analysis) {
        const { volatility, sentiment, fearGreedIndex } = analysis;
        
        if (volatility > 80) {
            if (sentiment > 70) return { icon: '🌪️', temp: '98°', condition: 'Crypto Hurricane', desc: 'Extreme bullish volatility' };
            else return { icon: '⛈️', temp: '32°', condition: 'Severe Storms', desc: 'High volatility, bearish' };
        } else if (volatility > 60) {
            if (sentiment > 60) return { icon: '🌦️', temp: '75°', condition: 'Scattered Showers', desc: 'Moderate volatility, mixed' };
            else return { icon: '⛅', temp: '55°', condition: 'Partly Cloudy', desc: 'Some uncertainty' };
        } else if (volatility > 40) {
            if (sentiment > 60) return { icon: '🌤️', temp: '78°', condition: 'Mostly Sunny', desc: 'Stable with upward bias' };
            else return { icon: '☁️', temp: '45°', condition: 'Overcast', desc: 'Stable but bearish' };
        } else {
            if (sentiment > 60) return { icon: '☀️', temp: '85°', condition: 'Clear Skies', desc: 'Low volatility, bullish' };
            else return { icon: '🌫️', temp: '40°', condition: 'Foggy', desc: 'Low volatility, unclear direction' };
        }
    }

    generateForecast(analysis) {
        const days = ['Today', 'Tomorrow', 'Wed', 'Thu', 'Fri'];
        const forecast = [];
        
        for (let i = 0; i < 5; i++) {
            const volatilityTrend = analysis.volatility + (Math.random() - 0.5) * 20;
            const sentimentTrend = analysis.sentiment + (Math.random() - 0.5) * 30;
            
            let condition;
            if (volatilityTrend > 70) {
                condition = { icon: '⛈️', desc: 'Stormy' };
            } else if (volatilityTrend > 50) {
                condition = { icon: '🌦️', desc: 'Showers' };
            } else if (volatilityTrend > 30) {
                condition = { icon: sentimentTrend > 50 ? '🌤️' : '☁️', desc: sentimentTrend > 50 ? 'Partly Sunny' : 'Cloudy' };
            } else {
                condition = { icon: sentimentTrend > 50 ? '☀️' : '🌫️', desc: sentimentTrend > 50 ? 'Sunny' : 'Foggy' };
            }
            
            forecast.push({
                day: days[i],
                ...condition
            });
        }
        
        return forecast;
    }

    generateAlerts(analysis, marketData) {
        const alerts = [];
        
        if (analysis.volatility > 80) {
            alerts.push('⚠️ STORM WARNING: Extreme volatility expected in next 4 hours');
        }
        
        if (analysis.sentiment < 30) {
            alerts.push('🔴 BEAR MARKET CONDITIONS: 70%+ of major coins declining');
        }
        
        const bigMovers = marketData.filter(coin => 
            Math.abs(coin.price_change_percentage_24h) > 15
        );
        
        if (bigMovers.length > 3) {
            alerts.push(`📈 HIGH ACTIVITY: ${bigMovers.length} coins moving >15% today`);
        }
        
        return alerts;
    }

    updateCurrentWeather() {
        const condition = this.weatherData.currentCondition;
        
		const emojiMap = {
			'Clear Skies': '☀️',
			'Mostly Sunny': '🌤️',
			'Partly Cloudy': '⛅',
			'Overcast': '☁️',
			'Scattered Showers': '🌦️',
			'Showers': '🌦️',
			'Storm': '⛈️',
			'Severe Storms': '⛈️',
			'Foggy': '🌫️',
			'Crypto Hurricane': '🌪️'
		};

		// Prefer image icons from /public, fallback to emoji
		const imageMap = {
			'Clear Skies': 'icon-sunny.png',
			'Mostly Sunny': 'icon-mostly-sunny.png',
			'Partly Cloudy': 'icon-partly-cloudy.png',
			'Overcast': 'icon-cloudy.png',
			'Scattered Showers': 'icon-showers.png',
			'Showers': 'icon-showers.png',
			'Storm': 'icon-storm.png',
			'Severe Storms': 'icon-storm.png',
			'Foggy': 'icon-fog.png',
			'Crypto Hurricane': 'icon-hurricane.png'
		};
		const imgFile = imageMap[condition.condition];
		if (imgFile) {
			const url = chrome.runtime.getURL(`public/${imgFile}`);
			document.getElementById('currentIcon').innerHTML = `<img src="${url}" alt="${condition.condition}" style="width:48px;height:48px;"/>`;
		} else {
			const icon = emojiMap[condition.condition] || '☁️';
			document.getElementById('currentIcon').textContent = icon;
		}
        document.getElementById('currentTemp').textContent = condition.temp;
        document.getElementById('currentCondition').textContent = condition.condition;
        const descEl = document.getElementById('currentDesc');
        if (descEl) descEl.textContent = condition.desc || '';

        // Dominance chips (BTC/ETH and total market cap if available)
        const chips = document.getElementById('dominanceChips');
        if (chips && this.weatherData.dominance) {
            const btc = Math.round((this.weatherData.dominance.bitcoin || 0) * 10) / 10;
            const eth = Math.round((this.weatherData.dominance.ethereum || 0) * 10) / 10;
            let extra = '';
            if (this.weatherData.totalMarketCapUsd) {
                const usd = this.weatherData.totalMarketCapUsd;
                extra = `<span class="chip">Mkt Cap: $${(usd/1e12>=1? (usd/1e12).toFixed(2)+'T' : (usd/1e9).toFixed(0)+'B')}</span>`;
            }
            chips.innerHTML = `
                <span class="chip">BTC Dom: ${btc}%</span>
                <span class="chip">ETH Dom: ${eth}%</span>
                ${extra}
            `;
        }
    }

    updateForecast() {
        const forecastGrid = document.getElementById('forecastGrid');
        forecastGrid.innerHTML = '';
        
		this.weatherData.forecast.forEach(day => {
            const item = document.createElement('div');
            item.className = 'forecast-item';
			const imageMap = {
				'Sunny': 'icon-sunny.png',
				'Partly Sunny': 'icon-mostly-sunny.png',
				'Cloudy': 'icon-cloudy.png',
				'Showers': 'icon-showers.png',
				'Stormy': 'icon-storm.png',
				'Foggy': 'icon-fog.png'
			};
			const imgFile = imageMap[day.desc];
			const iconHtml = imgFile
				? `<img src="${chrome.runtime.getURL(`public/${imgFile}`)}" alt="${day.desc}" style="width:28px;height:28px;"/>`
				: ( { 'Sunny': '☀️', 'Partly Sunny': '🌤️', 'Cloudy': '☁️', 'Showers': '🌦️', 'Stormy': '⛈️', 'Foggy': '🌫️' }[day.desc] || '☁️' );
            item.innerHTML = `
                <div class="forecast-day">${day.day}</div>
				<div class="forecast-icon">${iconHtml}</div>
                <div class="forecast-desc">${day.desc}</div>
            `;
            forecastGrid.appendChild(item);
        });
    }

    updateMarketConditions() {
        const container = document.getElementById('marketConditions');
        
        const conditions = [
            {
                icon: '🌡️',
                name: 'Market Temperature',
                value: `${Math.round(this.weatherData.volatility)}% volatility`,
                desc: 'How turbulent price moves are right now',
                progress: Math.min(100, Math.round(this.weatherData.volatility || 0))
            },
            {
                icon: '💨',
                name: 'Sentiment Winds',
                value: `${Math.round(this.weatherData.sentiment)}% bullish`,
                desc: 'Share of tracked coins up in the last 24h',
                progress: Math.min(100, Math.round(this.weatherData.sentiment || 0))
            },
            {
                icon: '🎯',
                name: 'Fear & Greed',
                value: `${Math.round(this.weatherData.fearGreedIndex)}/100`,
                desc: '50 = neutral. Higher = greed. Lower = fear.',
                progress: Math.min(100, Math.round(this.weatherData.fearGreedIndex || 0))
            },
            {
                icon: '📊',
                name: 'Market Trends',
                value: `${this.weatherData.trends.bullish}🟢 ${this.weatherData.trends.bearish}🔴`,
                desc: 'Count of bullish vs bearish among tracked assets'
            }
        ];
        
        container.innerHTML = '';
        conditions.forEach(condition => {
            const item = document.createElement('div');
            item.className = 'condition-item';
            const progressHtml = typeof condition.progress === 'number'
                ? `<div class="progress"><div class="progress-bar" style="width:${condition.progress}%;"></div></div>`
                : '';
            const descHtml = condition.desc ? `<div class="condition-desc">${condition.desc}</div>` : '';
            item.innerHTML = `
                <div class="condition-icon">${condition.icon}</div>
                <div class="condition-info">
                    <div class="condition-name">${condition.name}</div>
                    <div class="condition-value">${condition.value}</div>
                    ${progressHtml}
                    ${descHtml}
                </div>
            `;
            container.appendChild(item);
        });
    }

    updateAlerts() {
        const alertsContainer = document.getElementById('alertsContainer');
        
        if (this.weatherData.alerts.length > 0) {
            alertsContainer.style.display = 'block';
            alertsContainer.innerHTML = '<div class="section-title">⚠️ Weather Alerts</div>';
            
            this.weatherData.alerts.forEach(alert => {
                const item = document.createElement('div');
                item.className = 'alert-item';
                item.innerHTML = `<div class="alert-text">${alert}</div>`;
                alertsContainer.appendChild(item);
            });
        } else {
            alertsContainer.style.display = 'none';
        }
    }

    // Populate trending list
    updateTrending() {
        const list = document.getElementById('trendingList');
        if (!list) return;
        list.innerHTML = '';
        const top = (this.weatherData.trending || []).slice(0, 5);
        if (top.length === 0) {
            list.innerHTML = '<div class="condition-item" style="justify-content:center;">No trending data</div>';
            return;
        }
        top.forEach((entry) => {
            const item = document.createElement('div');
            item.className = 'condition-item';
            const symbol = (entry.item && entry.item.symbol) ? entry.item.symbol.toUpperCase() : '—';
            const name = (entry.item && entry.item.name) ? entry.item.name : 'Unknown';
            const thumb = (entry.item && entry.item.thumb) ? entry.item.thumb : '';
            const pct = (entry.item && typeof entry.item.data?.price_change_percentage_24h?.usd === 'number')
                ? entry.item.data.price_change_percentage_24h.usd
                : (entry.item && typeof entry.item.data?.price_change_percentage_24h === 'number')
                    ? entry.item.data.price_change_percentage_24h
                    : null;
            const pctStr = pct === null ? '' : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;
            const pctClass = pct === null ? '' : (pct >= 0 ? 'pct-up' : 'pct-down');
            const price = (entry.item && entry.item.data && entry.item.data.price) ? entry.item.data.price : null;
            const priceStr = price ? `$${Number(price).toLocaleString(undefined, { maximumFractionDigits: 8 })}` : '';
            item.innerHTML = `
                <div class="condition-icon" style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;">
                    ${thumb ? `<img src="${thumb}" alt="${symbol}" style="width:24px;height:24px;border-radius:50%;"/>` : '📈'}
                </div>
                <div class="condition-info">
                    <div class="condition-name">${name} <span style="opacity:.8;font-size:11px;">(${symbol})</span></div>
                    <div class="condition-value">Trending on CoinGecko</div>
                </div>
                <div class="trend-right">
                    <div class="trend-pct ${pctClass}">${pctStr}</div>
                    <div class="trend-price">${priceStr}</div>
                </div>
            `;
            list.appendChild(item);
        });
    }

    updateLastRefresh() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('lastUpdate').textContent = timeStr;
    }

    showError() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.innerHTML = `
            <div style="color: #ff6b6b;">
                ❌ Unable to fetch weather data<br>
                <small>Check your internet connection</small>
            </div>
        `;
    }

    // ===== Gemini Integration =====
    async loadGeminiForecast() {
        const container = document.getElementById('geminiForecastText');
        if (!container || !this.weatherData) return;
        container.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px;border-top-color:#fff;margin:0 8px 0 0;display:inline-block;vertical-align:middle;"></span>Generating AI forecast...`;

        try {
            const geminiKey = await new Promise((resolve) => {
                chrome.storage.local.get(['gemini_api_key'], (res) => resolve(res.gemini_api_key || ''));
            });
            if (!geminiKey) {
                container.textContent = 'Enable by adding a Gemini API key in Settings.';
                return;
            }

            const prompt = this.buildGeminiPrompt(this.weatherData);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: prompt }] }
                    ]
                })
            });
            if (!resp.ok) throw new Error(`Gemini HTTP ${resp.status}`);
            const data = await resp.json();
            const text = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';

            // Try to parse structured forecast and override UI
            const parsed = this.parseGeminiForecastText(text || '');
            if (parsed && Array.isArray(parsed.days) && parsed.days.length === 5) {
                const normalized = parsed.days.map((d, idx) => this.normalizeForecastEntry(d, idx));
                this.weatherData.forecast = normalized;
                this.updateForecast();
                container.textContent = 'AI forecast applied to 5-day outlook.';
                return;
            }

            // Fallback to showing raw text in the Gemini section
            if (text) {
                container.textContent = text.trim();
            } else {
                container.textContent = 'No AI forecast returned.';
            }
        } catch (e) {
            console.warn('Gemini forecast failed:', e);
            const msg = (e && e.message) ? e.message : 'Unknown error';
            container.innerHTML = `<span class="danger">Gemini error:</span> ${msg}`;
        }
    }

    buildGeminiPrompt(weather) {
        const trendingNames = (weather.trending || []).slice(0, 5).map(t => (t.item && t.item.name) ? t.item.name : '').filter(Boolean);
        const allowed = ['Sunny','Partly Sunny','Cloudy','Showers','Stormy','Foggy'];
        const lines = [
            `You are a crypto meteorologist. Using the metrics below, produce a STRICT JSON object only.`,
            `JSON schema: { "days": [ { "day": "Today|Tomorrow|<Weekday>", "desc": "${allowed.join('|')}", "reason": "short plain text" } x5 ] }`,
            `Rules: output ONLY JSON (no markdown/code fences). Use one of the allowed desc values exactly.`,
            `Metrics: volatility=${Math.round(weather.volatility)}%, sentiment=${Math.round(weather.sentiment)}%, fearGreed=${Math.round(weather.fearGreedIndex)}/100, trends: bullish=${weather.trends.bullish}, bearish=${weather.trends.bearish}, mixed=${weather.trends.mixed}.`,
            trendingNames.length ? `Trending: ${trendingNames.join(', ')}.` : ''
        ];
        return lines.filter(Boolean).join(' ');
    }

    parseGeminiForecastText(text) {
        try {
            // Direct JSON
            return JSON.parse(text);
        } catch (_) {}
        try {
            // Extract from code fence if present
            const m = text.match(/```(?:json)?\n([\s\S]*?)```/i);
            if (m && m[1]) return JSON.parse(m[1]);
        } catch (_) {}
        try {
            // Heuristic: find first { and last } and parse substring
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1 && end > start) {
                const sub = text.slice(start, end + 1);
                return JSON.parse(sub);
            }
        } catch (_) {}
        return null;
    }

    normalizeForecastEntry(entry, index) {
        const defaultLabels = ['Today', 'Tomorrow', 'Wed', 'Thu', 'Fri'];
        const day = (typeof entry.day === 'string' && entry.day.trim()) ? entry.day.trim() : defaultLabels[index] || `Day ${index+1}`;
        const raw = (entry.desc || '').toLowerCase();
        let desc = 'Cloudy';
        if (/sun|clear/.test(raw)) desc = 'Sunny';
        else if (/partly|mostly|interval|breaks/.test(raw)) desc = 'Partly Sunny';
        else if (/storm|thunder/.test(raw)) desc = 'Stormy';
        else if (/shower|rain/.test(raw)) desc = 'Showers';
        else if (/fog|haze|mist/.test(raw)) desc = 'Foggy';
        else if (/cloud/.test(raw)) desc = 'Cloudy';
        return { day, desc };
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CryptoWeatherApp();
});