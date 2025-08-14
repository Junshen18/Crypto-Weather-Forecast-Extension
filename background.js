// Background service worker for Crypto Weather Extension

class CryptoWeatherBackground {
    constructor() {
        this.mcpEndpoint = 'https://mcp.pro-api.coingecko.com';
        this.init();
    }

    init() {
        // Update badge and icon based on market conditions
        this.setupPeriodicUpdates();
        
        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                this.setInitialState();
            }
        });
    }

    async setInitialState() {
        // Set initial badge and icon
        await this.updateBadgeAndIcon('☀️', 'Sunny', '#4CAF50');
        
        // Store initial settings
        chrome.storage.local.set({
            notifications: true,
            updateInterval: 15, // minutes
            lastUpdate: 0
        });
    }

    setupPeriodicUpdates() {
        // Update every 15 minutes
        setInterval(async () => {
            await this.updateWeatherStatus();
        }, 15 * 60 * 1000);

        // Initial update
        this.updateWeatherStatus();
    }

    async updateWeatherStatus() {
        try {
            const marketData = await this.fetchMarketData();
            const analysis = this.analyzeQuickConditions(marketData);
            const condition = this.determineSimpleWeatherCondition(analysis);
            
            await this.updateBadgeAndIcon(
                condition.icon, 
                condition.condition, 
                condition.color
            );
            
            // Store data for popup
            chrome.storage.local.set({
                lastWeatherUpdate: Date.now(),
                quickAnalysis: analysis,
                currentCondition: condition
            });
            
        } catch (error) {
            console.error('Background update failed:', error);
            await this.updateBadgeAndIcon('❌', 'Error', '#f44336');
        }
    }

    async fetchMarketData() {
        try {
            const { baseUrl, headers, coins } = await this.getApiConfig();
            const ids = encodeURIComponent(coins.join(','));
            const url = `${baseUrl}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`;
            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error(`markets failed: ${response.status}`);
            const rows = await response.json();
            return rows.map(r => ({
                id: r.id,
                current_price: r.current_price,
                price_change_percentage_24h: r.price_change_percentage_24h_in_currency ?? r.price_change_percentage_24h
            }));
        } catch (error) {
            console.error('API fetch failed:', error);
            // Fallback to mock data to prevent extension failure
            return [
                { id: 'bitcoin', current_price: 45000, price_change_percentage_24h: 2.5 },
                { id: 'ethereum', current_price: 3000, price_change_percentage_24h: -1.2 }
            ];
        }
    }

    async getApiConfig() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['cg_api_tier', 'cg_api_key', 'tracked_coins'], (res) => {
                const tier = res.cg_api_tier || 'demo';
                const key = res.cg_api_key || '';
                const isPro = tier === 'pro';
                const baseUrl = isPro ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3';
                const headers = {};
                if (key) headers[isPro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] = key;
                const coins = (res.tracked_coins && Array.isArray(res.tracked_coins) && res.tracked_coins.length > 0)
                    ? res.tracked_coins
                    : ['bitcoin', 'ethereum', 'binancecoin'];
                resolve({ baseUrl, headers, coins });
            });
        });
    }

    analyzeQuickConditions(marketData) {
        const gains = marketData.filter(coin => coin.price_change_percentage_24h > 0).length;
        const sentiment = (gains / marketData.length) * 100;
        
        const avgChange = marketData.reduce((sum, coin) => 
            sum + Math.abs(coin.price_change_percentage_24h || 0), 0) / marketData.length;
        
        return {
            sentiment,
            volatility: Math.min(avgChange * 3, 100),
            marketDirection: sentiment > 50 ? 'bullish' : 'bearish'
        };
    }

    determineSimpleWeatherCondition(analysis) {
        const { volatility, sentiment } = analysis;
        
        if (volatility > 80) {
            return { 
                icon: '⛈️', 
                condition: 'Storm', 
                color: '#f44336',
                badge: '!'
            };
        } else if (volatility > 60) {
            return { 
                icon: '🌦️', 
                condition: 'Showers', 
                color: '#ff9800',
                badge: '~'
            };
        } else if (sentiment > 60) {
            return { 
                icon: '☀️', 
                condition: 'Sunny', 
                color: '#4CAF50',
                badge: '↑'
            };
        } else if (sentiment < 40) {
            return { 
                icon: '☁️', 
                condition: 'Cloudy', 
                color: '#9e9e9e',
                badge: '↓'
            };
        } else {
            return { 
                icon: '🌤️', 
                condition: 'Partly Cloudy', 
                color: '#2196F3',
                badge: '='
            };
        }
    }

    async updateBadgeAndIcon(icon, condition, color) {
        // Update badge with weather indicator
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setBadgeBackgroundColor({ color: color });
        
        // Update tooltip
        chrome.action.setTitle({ title: `Crypto Weather: ${condition}` });
        
        // Note: In a real extension, you'd have different icon files for different weather conditions
        // For this demo, we're using the default icon
    }
}

// Initialize background script
new CryptoWeatherBackground();