import { PROVIDERS } from './constants.js';
import { state } from './state.js';

// Configuration for the AI proxy
// Set USE_PROXY to true and provide your Cloudflare Worker URL
// to hide API keys from the frontend
const CONFIG = {
    USE_PROXY: true,  // Set to true when you have deployed the Cloudflare Worker
    PROXY_URL: 'https://letsim-backend.susbontan.workers.dev',  // Replace with your Cloudflare Worker URL
};

export async function* generateAIContentStream(promptText, history) {
    const provider = PROVIDERS[state.selectedProviderId] || PROVIDERS.megallm;
    const apiKey = provider.apiKey;
    const modelId = state.selectedModelId;

    let apiUrl;
    let headers;

    if (CONFIG.USE_PROXY) {
        // Use the Cloudflare Worker (API key hidden)
        apiUrl = CONFIG.PROXY_URL;
        headers = {
            'Content-Type': 'application/json',
        };
    } else {
        // Direct API call (API key exposed in frontend)
        apiUrl = `${provider.baseUrl}/chat/completions`;
        headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
    }

    const messages = [
        { 
            role: 'system', 
            content: `You are an expert web developer. You can return multiple files in a single response.
            You are encouraged to provide a detailed explanation of your changes. 
            
            To ensure the system can extract your files correctly, please use one of these two methods:
            1. Custom tags: Wrap the filename in [FILENAME]filename.ext[/FILENAME] tags, followed by the file content.
            2. Markdown: Use standard markdown code blocks and optionally specify the filename on the first line or in a comment.
            
            Always include an 'index.html' file as the entry point for the application.` 
        },
        ...history.map(v => ({ 
            role: 'assistant', 
            content: v.rawResponse || (v.code.includes('[FILENAME]') ? v.code : `[FILENAME]index.html[/FILENAME]\n${v.code}`)
        })),
        { role: 'user', content: promptText }
    ];

    const requestBody = CONFIG.USE_PROXY 
        ? { messages, model: modelId }
        : { model: modelId, messages: messages };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) throw new Error('API request failed');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') continue;
                try {
                    const data = JSON.parse(dataStr);
                    const delta = data.choices[0].delta.content;
                    if (delta) {
                        fullContent += delta;
                        yield fullContent;
                    }
                } catch (e) {
                    // Ignore malformed JSON
                }
            }
        }
    }
}

export function parseAIResponse(rawContent) {
    let reasoning = "";
    const files = [];

    // 1. Reasoning extraction
    const reasoningMatch = rawContent.match(/\[REASONING\]([\s\S]*?)\[\/REASONING\]/i);
    if (reasoningMatch) {
        reasoning = reasoningMatch[1].trim();
    } else {
        const firstMarker = rawContent.search(/\[FILENAME\]|```/);
        if (firstMarker > 0) reasoning = rawContent.substring(0, firstMarker).trim();
        else if (firstMarker === -1) reasoning = rawContent.trim();
    }

    // 2. Custom Tags [FILENAME]...[/FILENAME]
    const tagRegex = /\[FILENAME\]\s*([\w\.\-\/]+)\s*\[\/FILENAME\]\s*([\s\S]*?)(?=\[FILENAME\]|```|$)/gi;
    let match;
    while ((match = tagRegex.exec(rawContent)) !== null) {
        files.push({ name: match[1].trim(), content: match[2].trim() });
    }

    // 3. Markdown Blocks with optional filename
    const mdRegex = /```(\w+)?(?:\s+([\w\.\-\/]+))?\s*\n([\s\S]*?)```/g;
    while ((match = mdRegex.exec(rawContent)) !== null) {
        const lang = (match[1] || '').toLowerCase();
        let name = (match[2] || '').trim();
        const content = match[3].trim();

        if (!name) {
            if (lang === 'html' && !files.some(f => f.name === 'index.html')) name = 'index.html';
            else if (lang === 'css' && !files.some(f => f.name === 'style.css')) name = 'style.css';
            else if (['js', 'javascript'].includes(lang) && !files.some(f => f.name === 'script.js')) name = 'script.js';
        }

        if (name && !files.some(f => f.name === name)) {
            files.push({ name, content });
        }
    }

    // 4. Fallback for raw [FILENAME] without closing tag
    if (files.length === 0) {
        const openTagRegex = /\[FILENAME\]\s*([\w\.\-\/]+)\s*\n([\s\S]*?)(?=\[FILENAME\]|```|$)/gi;
        while ((match = openTagRegex.exec(rawContent)) !== null) {
            files.push({ name: match[1].trim(), content: match[2].trim() });
        }
    }

    if (files.length === 0 && rawContent.toLowerCase().includes('<html')) {
        files.push({ name: 'index.html', content: rawContent });
    }

    return { reasoning, files };
}

export async function generateAIContent(promptText, history) {
    // Legacy support wrapper
    let finalContent = "";
    for await (const chunk of generateAIContentStream(promptText, history)) {
        finalContent = chunk;
    }
    return parseAIResponse(finalContent).files;
}

// Export configuration for easy access
export const PROXY_CONFIG = CONFIG;
