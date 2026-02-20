/**
 * WebSim AI Proxy - Cloudflare Worker
 * 
 * This worker acts as a proxy between the frontend and the AI provider,
 * keeping the API key hidden from the client-side code.
 * 
 * Environment Variables (set in Cloudflare Dashboard):
 * - MEGALLM_API_KEY: The API key for MegaLLM
 * - MEGALLM_BASE_URL: The base URL for the AI API (default: https://ai.megallm.io/v1)
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Get configuration from environment variables
    const apiKey = env.MEGALLM_API_KEY || "";
    const baseUrl = env.MEGALLM_BASE_URL || "https://ai.megallm.io/v1";

    // Check if API key is configured
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured on server" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    try {
      // Parse the request body
      const body = await request.json();
      const { messages, model } = body;

      // Forward the request to the AI provider
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || "openai-gpt-oss-20b",
          messages: messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ error: `AI API error: ${response.status} - ${errorText}` }), {
          status: response.status,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // Create a streaming response
      const { readable, writable } = new TransformStream();
      
      // Stream the response in the background
      ctx.waitUntil(
        (async () => {
          const writer = writable.getWriter();
          const reader = response.body.getReader();
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              await writer.write(value);
            }
          } catch (error) {
            console.error("Stream error:", error);
          } finally {
            await writer.close();
          }
        })()
      );

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    } catch (error) {
      console.error("Proxy error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
