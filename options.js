document.addEventListener('DOMContentLoaded', async () => {
    const tierEl = document.getElementById('tier');
    const keyEl = document.getElementById('apiKey');
    const coinsEl = document.getElementById('coins');
    const okEl = document.getElementById('savedOk');

    // Load saved
    chrome.storage.local.get(['cg_api_tier', 'cg_api_key', 'tracked_coins'], (res) => {
        tierEl.value = res.cg_api_tier || 'demo';
        keyEl.value = res.cg_api_key || '';
        coinsEl.value = (res.tracked_coins && Array.isArray(res.tracked_coins))
            ? res.tracked_coins.join(',')
            : 'bitcoin,ethereum,binancecoin,cardano,solana,polkadot,avalanche-2,chainlink';
    });

    document.getElementById('saveBtn').addEventListener('click', async () => {
        const tier = tierEl.value;
        const key = keyEl.value.trim();
        const coins = coinsEl.value.split(',').map(s => s.trim()).filter(Boolean);

        await chrome.storage.local.set({
            cg_api_tier: tier,
            cg_api_key: key,
            tracked_coins: coins
        });

        okEl.style.display = 'inline';
        setTimeout(() => okEl.style.display = 'none', 1500);
    });

    document.getElementById('clearBtn').addEventListener('click', async () => {
        await chrome.storage.local.remove(['cg_api_tier', 'cg_api_key', 'tracked_coins']);
        tierEl.value = 'demo';
        keyEl.value = '';
        coinsEl.value = 'bitcoin,ethereum,binancecoin,cardano,solana,polkadot,avalanche-2,chainlink';
    });
});


