import { elements } from './dom.js';
import { state } from './state.js';
import { updatePreview } from './renderer.js';

export function initializePlugins() {
    initializePluginCreator();
    
    window.addEventListener('edit-plugin', (e) => {
        const { plugin, index } = e.detail;
        const { 
            pluginCreationUi, 
            pluginListContainer, 
            pluginMarketplacePromo,
            pluginNameInput,
            pluginDescInput,
            pluginCodeTextarea
        } = elements;

        pluginCreationUi.classList.remove('hidden');
        pluginCreationUi.classList.add('flex');
        pluginListContainer.classList.add('hidden');
        pluginMarketplacePromo.classList.add('hidden');

        pluginNameInput.value = plugin.metadata.name;
        pluginDescInput.value = plugin.metadata.description;
        pluginCodeTextarea.value = plugin.assets.js; 
        
        pluginCreationUi.dataset.editingIndex = index;
    });
}

function initializePluginCreator() {
    const { 
        btnCreatePlugin, pluginCreationUi, pluginListContainer, 
        pluginMarketplacePromo, btnClosePluginEditor, btnSavePlugin,
        pluginNameInput, pluginDescInput, pluginCodeTextarea
    } = elements;

    if (!btnCreatePlugin) return;

    const showEditor = (show) => {
        if (show) {
            pluginCreationUi.classList.remove('hidden');
            pluginCreationUi.classList.add('flex');
            pluginListContainer.classList.add('hidden');
            pluginMarketplacePromo.classList.add('hidden');
            pluginNameInput.value = '';
            pluginDescInput.value = '';
            pluginCodeTextarea.value = `{
  hooks: {
    onInit: (api) => {
      console.log("Plugin Started!");
      const box = api.dom.create('div', {
        id: 'plugin-overlay',
        textContent: 'Plugin Active',
        style: 'position: fixed; top: 10px; right: 10px; padding: 4px 8px; background: rgba(0,0,0,0.5); color: white; border-radius: 4px; font-size: 10px; z-index: 9999;'
      });
      document.body.appendChild(box);
    },
    onRender: (api, { now, deltaTime }) => {
      const box = api.dom.query('#plugin-overlay');
      if (box) box.style.opacity = 0.5 + Math.sin(now / 200) * 0.5;
    },
    onDestroy: (api) => {
      console.log("Plugin Cleaned Up!");
      api.dom.query('#plugin-overlay')?.remove();
    }
  }
}`;
        } else {
            pluginCreationUi.classList.add('hidden');
            pluginCreationUi.classList.remove('flex');
            pluginListContainer.classList.remove('hidden');
            pluginMarketplacePromo.classList.remove('hidden');
            delete pluginCreationUi.dataset.editingIndex;
        }
    };

    btnCreatePlugin.addEventListener('click', () => showEditor(true));
    btnClosePluginEditor.addEventListener('click', () => showEditor(false));

    btnSavePlugin.addEventListener('click', () => {
        const name = pluginNameInput.value.trim() || 'Untitled Plugin';
        const desc = pluginDescInput.value.trim() || 'No description provided.';
        const code = pluginCodeTextarea.value.trim();
        const id = 'plugin-' + Math.random().toString(36).substr(2, 9);
        
        const pluginData = {
            enabled: true,
            metadata: { id, name, description: desc },
            assets: { css: '', js: code }
        };

        if (pluginCreationUi.dataset.editingIndex !== undefined) {
            const idx = parseInt(pluginCreationUi.dataset.editingIndex);
            state.plugins[idx] = { ...state.plugins[idx], ...pluginData, metadata: { ...pluginData.metadata, id: state.plugins[idx].metadata.id } };
        } else {
            state.plugins.push(pluginData);
        }
        
        import('./plugins-renderer.js').then(m => m.renderPlugins());
        updatePreview();
        showEditor(false);
    });
}