import { elements } from './dom.js';
import { state } from './state.js';
import { updatePreview } from './preview-utils.js';

export function renderPlugins() {
    const { pluginListContainer } = elements;
    if (!pluginListContainer) return;

    pluginListContainer.innerHTML = '';
    
    if (state.plugins.length === 0) {
        pluginListContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center opacity-40">
                <i data-lucide="puzzle" class="w-12 h-12 mb-3"></i>
                <p class="text-sm">No plugins installed.</p>
            </div>
        `;
    }

    state.plugins.forEach((plugin, index) => {
        const card = document.createElement('div');
        card.className = `bg-[#1c1e26] rounded-[24px] p-6 flex flex-col gap-6 shadow-xl border border-white/5 transition-all ${plugin.enabled ? 'opacity-100' : 'opacity-60 grayscale-[0.5]'}`;
        
        card.innerHTML = `
            <div class="flex gap-4">
                <div class="w-12 h-12 flex items-center justify-center shrink-0">
                    <div class="relative">
                        <i data-lucide="${plugin.icon || 'package'}" class="w-8 h-8 text-blue-500 fill-blue-500/20"></i>
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <h4 class="text-lg font-medium text-gray-100">${plugin.metadata.name}</h4>
                    <p class="text-[15px] text-gray-400 leading-relaxed">${plugin.metadata.description}</p>
                </div>
            </div>

            <div class="flex items-center justify-between pt-2">
                <div class="flex gap-3">
                    <button class="edit-plugin-btn px-5 py-2.5 rounded-full border border-blue-900/40 text-sm font-medium text-blue-400 hover:bg-blue-500/10 transition-colors">Edit</button>
                    <button class="delete-plugin-btn px-5 py-2.5 rounded-full border border-red-900/40 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">Remove</button>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" ${plugin.enabled ? 'checked' : ''} class="sr-only peer toggle-plugin-btn">
                    <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>
        `;

        card.querySelector('.toggle-plugin-btn').onchange = (e) => {
            plugin.enabled = e.target.checked;
            renderPlugins();
            updatePreview();
        };

        card.querySelector('.delete-plugin-btn').onclick = () => {
            if (confirm(`Remove plugin "${plugin.metadata.name}"?`)) {
                state.plugins.splice(index, 1);
                renderPlugins();
                updatePreview();
            }
        };

        card.querySelector('.edit-plugin-btn').onclick = () => {
            // Re-open editor with this plugin data
            window.dispatchEvent(new CustomEvent('edit-plugin', { detail: { plugin, index } }));
        };

        pluginListContainer.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
}