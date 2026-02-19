import { elements } from './dom.js';
import { state } from './state.js';
import { openAssetEditor } from './editor.js';
import { updatePreview } from './preview-utils.js';

function setupMenu(eOrElement, itemsHtml, onAction) {
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    
    menu.innerHTML = itemsHtml;
    if (window.lucide) window.lucide.createIcons();
    
    menu.classList.remove('hidden');
    
    const target = eOrElement.currentTarget || eOrElement.target || eOrElement;
    const rect = target.getBoundingClientRect();
    const menuWidth = 192; 

    // Default positioning: below and aligned right with target
    let left = rect.left - menuWidth + rect.width;
    let top = rect.bottom + 5;
    
    // Boundary checks
    if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 10;
    if (left < 10) left = 10;
    
    // If it's the rail (far right rail buttons usually have small rects)
    // Check if we are in the home view rail or app rail
    const isRail = rect.right > window.innerWidth - 80;
    if (isRail) {
        left = rect.left - menuWidth - 10;
        top = rect.top;
    }

    if (top + 300 > window.innerHeight) top = rect.top - 200;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    const handleAction = async (event) => {
        const item = event.target.closest('.menu-item');
        if (!item) return;
        
        onAction(item.dataset.action, item.dataset, event);
        closeMenu();
    };

    const closeMenu = () => {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeMenu);
        menu.removeEventListener('click', handleAction);
    };

    setTimeout(() => {
        document.addEventListener('click', closeMenu);
        menu.addEventListener('click', handleAction);
    }, 10);
}

export function showContextMenu(e, index, version, onVersionClick) {
    const effectiveVersion = version || (state.versions[state.currentVersionIndex] || { id: 0, code: '', prompt: '' });
    const effectiveIndex = index !== undefined ? index : state.currentVersionIndex;

    const itemsHtml = `
        <div class="menu-item px-4 py-2 hover:bg-[#2a2a2a] cursor-pointer transition-colors" data-action="view-source">View Source</div>
        <div class="menu-item px-4 py-2 hover:bg-[#2a2a2a] cursor-pointer transition-colors" data-action="settings">Project Settings</div>
        <div class="h-px bg-[#2a2a2a] my-1"></div>
        <div class="menu-item px-4 py-2 hover:bg-[#2a2a2a] cursor-pointer transition-colors" data-action="copy-url">Copy URL</div>
        <div class="menu-item px-4 py-2 hover:bg-[#2a2a2a] cursor-pointer transition-colors" data-action="open-full">Open fullpage</div>
        <div class="menu-item px-4 py-2 hover:bg-[#2a2a2a] cursor-pointer transition-colors" data-action="download">Download</div>
        <div class="h-px bg-[#2a2a2a] my-1"></div>
        <div class="menu-item px-4 py-2 hover:bg-red-900/20 text-red-400 cursor-pointer transition-colors" data-action="delete">Delete</div>
    `;

    setupMenu(e, itemsHtml, async (action) => {
        switch (action) {
            case 'view-source':
                openAssetEditor('index.html');
                break;
            case 'settings':
                alert('Project Settings: Not implemented yet.');
                break;
            case 'copy-url':
                navigator.clipboard.writeText(window.location.href).then(() => alert('URL copied!'));
                break;
            case 'open-full':
                const blob = new Blob([effectiveVersion.code], { type: 'text/html' });
                window.open(URL.createObjectURL(blob), '_blank');
                break;
            case 'download':
                try {
                    const JSZip = (await import('https://esm.sh/jszip')).default;
                    const zip = new JSZip();
                    const contents = effectiveVersion.fileContents || { 'index.html': effectiveVersion.code };
                    Object.entries(contents).forEach(([name, content]) => zip.file(name, content));
                    const zipBlob = await zip.generateAsync({ type: 'blob' });
                    const url = URL.createObjectURL(zipBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `project_v${effectiveVersion.id || 0}.zip`;
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                } catch (err) {
                    console.error("Failed to generate ZIP", err);
                    alert("Failed to generate download.");
                }
                break;
            case 'delete':
                if (effectiveIndex < 0) break;
                if (confirm('Are you sure you want to delete this version?')) {
                    state.versions.splice(effectiveIndex, 1);
                    if (state.currentVersionIndex >= state.versions.length) {
                        state.currentVersionIndex = state.versions.length - 1;
                    }
                    import('./versions-renderer.js').then(m => m.renderVersions(onVersionClick));
                }
                break;
        }
    });
}

export function showProfileContextMenu(eOrElement) {
    const itemsHtml = `
        <div class="menu-item px-4 py-2 hover:bg-[#2a2a2a] cursor-pointer transition-colors flex items-center gap-2" data-action="user-settings">
            <i data-lucide="settings" class="w-4 h-4 text-gray-400"></i> Settings
        </div>
        <div class="h-px bg-[#2a2a2a] my-1"></div>
        <div class="menu-item px-4 py-2 hover:bg-red-900/20 text-red-400 cursor-pointer transition-colors flex items-center gap-2" data-action="logout">
            <i data-lucide="log-out" class="w-4 h-4 text-red-400"></i> Logout
        </div>
    `;

    setupMenu(eOrElement, itemsHtml, (action) => {
        if (action === 'logout') {
            alert('Logging out...');
            window.location.reload();
        } else if (action === 'user-settings') {
            alert('User settings clicked');
        }
    });
}

export function showModelSelectorMenu(eOrElement, providers, selectedProviderId, selectedModelId, onSelect) {
    let itemsHtml = '';
    Object.entries(providers).forEach(([pId, provider]) => {
        itemsHtml += `<div class="px-4 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">${provider.name}</div>`;
        provider.models.forEach(model => {
            const isSelected = selectedModelId === model.id && selectedProviderId === pId;
            itemsHtml += `
                <div class="menu-item px-4 py-2 hover:bg-[#2a2a2a] cursor-pointer transition-colors flex items-center justify-between" 
                     data-action="select-model" data-provider="${pId}" data-model="${model.id}" data-name="${model.name}">
                    <span>${model.name}</span>
                    ${isSelected ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-500"></i>' : ''}
                </div>
            `;
        });
    });

    setupMenu(eOrElement, itemsHtml, (action, data) => {
        if (action === 'select-model') {
            onSelect(data.provider, data.model, data.name);
        }
    });
}