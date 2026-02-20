# Cloudflare Worker AI Proxy

This folder contains the Cloudflare Worker that proxies AI requests to hide your API key from the frontend.

## Setup Instructions

### 1. Deploy the Worker to Cloudflare

#### Option A: Via Cloudflare Dashboard (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) and sign in
2. Navigate to **Workers & Pages** > **Create application** > **Create Worker**
3. Name your worker (e.g., `websim-ai-proxy`)
4. Click **Deploy**
5. After creation, click **Edit code**
6. Copy the contents of `ai-proxy.js` and paste it into the editor
7. Click **Save and Deploy**

#### Option B: Via Wrangler CLI

```bash
# Install wrangler if not already installed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Navigate to this folder
cd websim_clone_by_Bunn/worker

# Deploy
wrangler deploy
```

### 2. Set Environment Variables

1. Go to your worker in the Cloudflare Dashboard
2. Click **Settings** > **Variables**
3. Add the following **Secret** variables:
   - `MEGALLM_API_KEY`: Your MegaLLM API key (required)
   - `MEGALLM_BASE_URL`: The base URL for the AI API (optional, defaults to `https://ai.megallm.io/v1`)

### 3. Get Your Worker URL

After deployment, your worker will be available at:
```
https://websim-ai-proxy.<your-subdomain>.workers.dev
```

### 4. Update Frontend Configuration

Edit `api.js` in the root folder and update the configuration:

```javascript
const CONFIG = {
    USE_PROXY: true,  // Enable the proxy
    PROXY_URL: 'https://websim-ai-proxy.<your-subdomain>.workers.dev',  // Your Cloudflare Worker URL
};
```

### 5. Deploy Frontend to Netlify

Deploy the updated `websim_clone_by_Bunn` folder to Netlify.

## How It Works

1. **Frontend** sends requests to your Cloudflare Worker (no API key included)
2. **Worker** adds the API key from environment secrets
3. **Worker** forwards the request to the AI provider
4. **Worker** streams the response back to the frontend

This keeps your API key hidden from the browser's developer tools and source code.

## Files

- `ai-proxy.js` - The Cloudflare Worker script
- `wrangler.toml` - Wrangler configuration file (for CLI deployment)

## Local Development

To test the worker locally:

```bash
cd websim_clone_by_Bunn/worker
wrangler dev
```

Then set the `PROXY_URL` in your frontend to `http://localhost:8787`.
