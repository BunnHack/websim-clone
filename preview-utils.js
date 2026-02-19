import { elements } from './dom.js';
import { state } from './state.js';

const assetBlobUrls = new Map();

export function updatePreview(overrideCode) {
    const { browserFrame } = elements;
    if (!browserFrame) return;

    // 1. Clean up old blob URLs to prevent memory leaks
    assetBlobUrls.forEach(url => URL.revokeObjectURL(url));
    assetBlobUrls.clear();

    const assets = state.assets.filter(a => a.type !== 'folder');
    const finalBlobUrls = new Map();

    const getBlobType = (name) => {
        const ext = name.split('.').pop().toLowerCase();
        if (ext === 'js') return 'application/javascript';
        if (ext === 'css') return 'text/css';
        if (ext === 'html') return 'text/html';
        if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)) return `image/${ext === 'svg' ? 'svg+xml' : ext}`;
        return 'text/plain';
    };

    // Helper to replace references in text content
    const replaceRefs = (content) => {
        if (typeof content !== 'string') return content;
        let updated = content;
        finalBlobUrls.forEach((url, name) => {
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Matches src="...", href="...", url("...") with or without quotes/paths
            const regex = new RegExp(`(src|href|url)\\s*([=(])\\s*["']?\\s*\\.?\\/?${escapedName}\\s*["']?\\s*([)]?)`, 'gi');
            updated = updated.replace(regex, (match, p1, p2, p3) => {
                if (p1.toLowerCase() === 'url') return `url("${url}"${p3}`;
                return `${p1}${p2}"${url}"${p3}`;
            });
        });
        return updated;
    };

    // 2. Sequential linking to handle dependencies
    const nonText = assets.filter(a => !['js', 'css', 'html'].includes(a.type));
    const css = assets.filter(a => a.type === 'css');
    const js = assets.filter(a => a.type === 'js');
    const html = assets.filter(a => a.type === 'html' && a.name !== 'index.html');

    // Create blobs for binary/images first
    nonText.forEach(a => {
        const url = URL.createObjectURL(new Blob([a.content], { type: getBlobType(a.name) }));
        finalBlobUrls.set(a.name, url);
        assetBlobUrls.set(a.name, url);
    });

    // Then CSS (can refer to images)
    css.forEach(a => {
        const linked = replaceRefs(a.content);
        const url = URL.createObjectURL(new Blob([linked], { type: 'text/css' }));
        finalBlobUrls.set(a.name, url);
        assetBlobUrls.set(a.name, url);
    });

    // Then JS (can refer to CSS/images)
    js.forEach(a => {
        const linked = replaceRefs(a.content);
        const url = URL.createObjectURL(new Blob([linked], { type: 'application/javascript' }));
        finalBlobUrls.set(a.name, url);
        assetBlobUrls.set(a.name, url);
    });

    // Then other HTML
    html.forEach(a => {
        const linked = replaceRefs(a.content);
        const url = URL.createObjectURL(new Blob([linked], { type: 'text/html' }));
        finalBlobUrls.set(a.name, url);
        assetBlobUrls.set(a.name, url);
    });

    // Finally, index.html
    const indexAsset = assets.find(a => a.name === 'index.html');
    let indexHtml = overrideCode || indexAsset?.content || "";
    let linkedCode = replaceRefs(indexHtml);

    // 3. Inject Runtime and Active Plugins
    const activePlugins = state.plugins.filter(p => p.enabled);
    const runtimeScript = `
        <script>
            (function() {
                // Runtime Error Handling (Always active)
                window.addEventListener('error', (event) => {
                    window.parent.postMessage({ 
                        type: 'preview-error', 
                        message: event.message, 
                        filename: event.filename, 
                        lineno: event.lineno 
                    }, '*');
                });

                // Plugin System
                window.__WEBSIM_PLUGINS__ = window.__WEBSIM_PLUGINS__ || {};
                const plugins = ${JSON.stringify(activePlugins)};
                
                const showError = (pluginName, error) => {
                    console.error('[WebSim Plugin Error] ' + pluginName + ':', error);
                    if (!document.getElementById('websim-plugin-error-style')) {
                        const style = document.createElement('style');
                        style.id = 'websim-plugin-error-style';
                        style.textContent = '@keyframes websimSlideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }';
                        document.head.appendChild(style);
                    }
                    const errorBox = document.createElement('div');
                    errorBox.style.cssText = "position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1a1a1a; color: #ff5f56; padding: 12px 16px; border: 1px solid rgba(255,95,86,0.3); border-radius: 12px; font-family: system-ui, -apple-system, sans-serif; font-size: 12px; z-index: 999999; box-shadow: 0 8px 32px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 4px; animation: websimSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer; min-width: 280px; max-width: 90vw; pointer-events: auto;";
                    errorBox.innerHTML = '<div style="font-weight: 700; display: flex; align-items: center; gap: 8px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Plugin Error: ' + pluginName + '</span></div><div style="opacity: 0.8; font-family: monospace; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-left: 22px;">' + (error.message || error) + '</div>';
                    errorBox.onclick = () => errorBox.remove();
                    document.body.appendChild(errorBox);
                    setTimeout(() => { if (errorBox.parentElement) errorBox.remove(); }, 6000);
                };

                const api = {
                    version: "1.0",
                    dom: {
                        query: (s) => document.querySelector(s),
                        queryAll: (s) => document.querySelectorAll(s),
                        create: (t, props = {}) => {
                            const el = document.createElement(t);
                            Object.assign(el, props);
                            return el;
                        }
                    },
                    events: {
                        emit: (e, d) => window.dispatchEvent(new CustomEvent('websim:' + e, { detail: d })),
                        on: (e, cb) => {
                            const handler = (ev) => cb(ev.detail);
                            window.addEventListener('websim:' + e, handler);
                            return () => window.removeEventListener('websim:' + e, handler);
                        }
                    }
                };

                const initPlugins = () => {
                    if (plugins.length === 0) return;
                    console.log("[WebSim] Initializing Plugin System...");
                    plugins.forEach(p => {
                        try {
                            if (p.assets.css) {
                                const style = document.createElement('style');
                                style.id = 'plugin-css-' + p.metadata.id;
                                style.textContent = p.assets.css;
                                document.head.appendChild(style);
                            }
                            let pluginModule = new Function('return (' + p.assets.js + ')')();
                            window.__WEBSIM_PLUGINS__[p.metadata.id] = pluginModule;
                            if (pluginModule && pluginModule.hooks) {
                                if (typeof pluginModule.hooks.onInit === 'function') {
                                    pluginModule.hooks.onInit(api);
                                }
                            }
                        } catch (err) { showError(p.metadata.name, err); }
                    });
                    
                    // Centralized Tick System
                    let lastTime = performance.now();
                    const tick = (now) => {
                        const deltaTime = (now - lastTime) / 1000;
                        lastTime = now;
                        
                        plugins.forEach(p => {
                            const mod = window.__WEBSIM_PLUGINS__[p.metadata.id];
                            if (mod && mod.hooks && typeof mod.hooks.onRender === 'function') {
                                try {
                                    mod.hooks.onRender(api, { now, deltaTime });
                                } catch (renderErr) {
                                    showError(p.metadata.name, renderErr);
                                    delete window.__WEBSIM_PLUGINS__[p.metadata.id];
                                }
                            }
                        });
                        requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                };

                if (document.readyState === 'complete' || document.readyState === 'interactive') initPlugins();
                else window.addEventListener('DOMContentLoaded', initPlugins);

                window.addEventListener('beforeunload', () => {
                    plugins.forEach(p => {
                        const mod = window.__WEBSIM_PLUGINS__[p.metadata.id];
                        if (mod && mod.hooks && typeof mod.hooks.onDestroy === 'function') {
                            try { mod.hooks.onDestroy(api); } catch (e) {}
                        }
                    });
                });
            })();
        </script>
    `;

    if (linkedCode.includes('<head>')) {
        linkedCode = linkedCode.replace('<head>', `<head>${runtimeScript}`);
    } else if (linkedCode.includes('<body>')) {
        linkedCode = linkedCode.replace('<body>', `<body>${runtimeScript}`);
    } else {
        linkedCode = runtimeScript + linkedCode;
    }

    const finalBlob = new Blob([linkedCode], { type: 'text/html' });
    const finalUrl = URL.createObjectURL(finalBlob);
    browserFrame.src = finalUrl;
}