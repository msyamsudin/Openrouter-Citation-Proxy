const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const path = require('path');

// Load environment variables from the root .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const app = express();
const PORT = process.env.PORT || 3001;

const fs = require('fs');

// Path to store config
const CONFIG_PATH = path.join(__dirname, 'config.json');

const isValidKey = (key) => {
    return key && key.trim() !== '' && !key.includes('PLACEHOLDER');
};

const getApiKey = () => {
    // 1. Try config.json (persistent via UI)
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            if (isValidKey(config.apiKey)) return config.apiKey;
        } catch (e) {
            console.error("Error reading config.json", e);
        }
    }
    // 2. Fallback to .env.local
    const envKey = process.env.OPENROUTER_API_KEY;
    return isValidKey(envKey) ? envKey : null;
};

app.use(cors());
app.use(express.json());

// Endpoint to check key status
app.get('/api/config/status', (req, res) => {
    const apiKey = getApiKey();
    res.json({
        isConfigured: !!apiKey,
        source: fs.existsSync(CONFIG_PATH) ? 'json' : 'env'
    });
});

// Endpoint to save a new key
app.post('/api/config/key', async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: "API Key is required" });

    // 1. Verify with OpenRouter
    try {
        const verifyRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            },
        });

        const verifyData = await verifyRes.json();

        if (!verifyRes.ok) {
            let errorMessage = verifyData.error?.message || "Invalid API Key. Verification failed.";
            if (errorMessage.includes("User not found")) {
                errorMessage = "API Key tidak valid atau tidak ditemukan. Pastikan key benar.";
            }
            return res.status(401).json({
                error: errorMessage
            });
        }

        // 2. Save if valid
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ apiKey }, null, 2));
        res.json({ success: true, message: "API Key verified and saved successfully to server" });
    } catch (error) {
        console.error("Error verifying/saving API Key:", error);
        res.status(500).json({ error: "Failed to verify or save API Key on server" });
    }
});

// Endpoint to delete the key
app.delete('/api/config/key', (req, res) => {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            fs.unlinkSync(CONFIG_PATH);
        }
        res.json({ success: true, message: "API Key removed from server config" });
    } catch (error) {
        console.error("Error deleting API Key:", error);
        res.status(500).json({ error: "Failed to delete API Key on server" });
    }
});

app.post('/api/chat', async (req, res) => {
    const { model, messages, temperature } = req.body;
    const apiKey = getApiKey();

    if (!apiKey) {
        return res.status(500).json({
            error: { message: "OPENROUTER_API_KEY is not configured on the server. Please set it in Settings." }
        });
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Sonar Source Extractor Proxy",
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                stream: false,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).json({ error: { message: "Internal Server Error in Proxy" } });
    }
});

const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Backend proxy running at http://${HOST}:${PORT}`);
    console.log(`Accessible on local network via your IP address on port ${PORT}`);
});
