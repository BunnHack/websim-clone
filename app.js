import { initializeUI } from './ui-manager.js';
import { initializeSidebar, showHome } from './sidebar-manager.js';
import { initializeHome } from './home-manager.js';
import { initializeProjects } from './project-manager.js';
import { initializeChat } from './chat-manager.js';
import { initializePlugins } from './plugin-manager.js';
import { initializeErrorTracking } from './error-manager.js';
import { renderAssets, updatePreview } from './renderer.js';

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();

    initializeUI();
    initializeSidebar();
    initializeHome();
    initializeProjects();
    initializeChat();
    initializePlugins();
    initializeErrorTracking();

    import('./assets-renderer.js').then(m => m.initAssetActions());

    showHome(true);
    renderAssets();
    updatePreview(`
        <div style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; color: #666;">
            <p>Type a prompt in the chat to generate a site.</p>
        </div>
    `);
});