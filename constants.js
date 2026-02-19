export const SUPABASE_CONFIG = {
    url: 'https://gxmkrzjwkmxiwiiavtzb.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bWtyemp3a214aXdpaWF2dHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0Mzc5NDEsImV4cCI6MjA4NjAxMzk0MX0.Ajqk9YiheexXttKnsejf9sCUK8VWhHhI12oESx-h5Mk'
};

export const PROVIDERS = {
    megallm: {
        name: 'MegaLLM',
        baseUrl: 'https://ai.megallm.io/v1',
        apiKey: 'sk-mega-31b6b7596cdbc34b57ec8251f99d32ef22d0b3aeacf137d57bccacd1240e7a49',
        models: [
            { id: 'openai-gpt-oss-20b', name: 'Gemini 3 Flash' }
        ]
    },
    poe: {
        name: 'Poe',
        baseUrl: 'https://api.poe.com/v1',
        apiKey: 'gLA0qkMa_ymBHnSTcZDIokN0j8KAS5RaVEbU9xtUiT0',
        models: [
            { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'claude-3-opus', name: 'Claude 3 Opus' }
        ]
    }
};

export const INITIAL_ASSETS = [];