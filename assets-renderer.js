import { elements } from './dom.js';
import { state } from './state.js';

export function renderAssets() {
    const { gridContainer, listRowsContainer, assetCountBadge, assetsTitle } = elements;
    if (!gridContainer || !listRowsContainer) return;

    const count = state.assets.length;
    if (assetCountBadge) assetCountBadge.textContent = count;
    if (assetsTitle) assetsTitle.textContent = `Project Assets (${count})`;

    // Grid Rendering
    gridContainer.innerHTML = `
        <div id="btn-grid-upload" class="flex flex-col gap-1.5 group cursor-pointer">
            <div class="aspect-square rounded-lg border border-blue-500/20 bg-[#0a1018] hover:bg-blue-500/10 flex flex-col items-center justify-center gap-1.5 transition-colors">
                <i data-lucide="plus" class="w-6 h-6 text-blue-400"></i>
                <span class="text-blue-400 font-bold text-[10px]">Upload</span>
            </div>
        </div>
        <div id="btn-grid-create" class="flex flex-col gap-1.5 group cursor-pointer">
            <div class="aspect-square rounded-lg border border-purple-500/20 bg-[#120a18] hover:bg-purple-500/10 flex flex-col items-center justify-center gap-1.5 transition-colors">
                <i data-lucide="sparkles" class="w-6 h-6 text-purple-400"></i>
                <span class="text-purple-400 font-bold text-[10px]">Create</span>
            </div>
        </div>
    `;

    state.assets.forEach((asset) => {
        const gridItem = document.createElement('div');
        gridItem.className = 'flex flex-col gap-1.5 group cursor-pointer';
        gridItem.onclick = () => {
            if (asset.type !== 'folder') {
                import('./editor.js').then(m => m.openAssetEditor(asset.name));
            }
        };
        let iconHtml = '';
        let colorClass = '';
        const isImg = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(asset.type.toLowerCase());

        if (asset.type === 'js') { iconHtml = 'JS'; colorClass = 'text-yellow-500/90'; }
        else if (asset.type === 'html') { iconHtml = '&lt;/&gt;'; colorClass = 'text-orange-500/90'; }
        else if (asset.type === 'css') { iconHtml = '#'; colorClass = 'text-blue-500/90'; }
        else if (asset.type === 'folder') { iconHtml = '<i data-lucide="folder" class="w-8 h-8"></i>'; colorClass = 'text-blue-400'; }
        else if (!isImg) { iconHtml = asset.type.toUpperCase(); colorClass = 'text-gray-400'; }

        gridItem.innerHTML = `
            <div class="aspect-square rounded-lg bg-[#121212] border border-[#2a2a2a] group-hover:border-gray-600 p-1 relative overflow-hidden flex items-center justify-center">
                ${!isImg ? `
                <div class="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none text-[4px] text-gray-500 overflow-hidden px-1">
                    ${asset.content ? asset.content.substring(0, 50).replace(/</g, '&lt;') : ''}
                </div>
                ` : ''}
                <div class="relative z-10 flex flex-col h-full w-full items-center justify-center">
                    ${isImg 
                        ? `<img src="${asset.content}" class="w-full h-full object-contain" />` 
                        : `<span class="text-xl font-bold ${colorClass}">${iconHtml}</span>`
                    }
                </div>
            </div>
            <div class="text-center leading-tight">
                <div class="text-[10px] text-gray-300 font-medium truncate">${asset.name.split('/').pop()}</div>
                <div class="text-[8px] text-gray-500 truncate">${asset.size} tokens</div>
            </div>
        `;
        gridContainer.appendChild(gridItem);
    });

    // List Tree Rendering
    listRowsContainer.innerHTML = '';
    
    // 1. Sort assets for tree view
    const sortedAssets = [...state.assets].sort((a, b) => {
        const pathA = a.name.split('/');
        const pathB = b.name.split('/');
        const len = Math.min(pathA.length, pathB.length);
        
        for (let i = 0; i < len; i++) {
            if (pathA[i] !== pathB[i]) {
                const isFolderA = i < pathA.length - 1 || a.type === 'folder';
                const isFolderB = i < pathB.length - 1 || b.type === 'folder';
                if (isFolderA !== isFolderB) return isFolderA ? -1 : 1;
                return pathA[i].localeCompare(pathB[i]);
            }
        }
        return pathA.length - pathB.length;
    });

    // 2. Filter and Render
    sortedAssets.forEach((asset) => {
        const pathParts = asset.name.split('/');
        const depth = pathParts.length - 1;
        
        // Check if any parent folder is collapsed
        let isHidden = false;
        let parentPath = '';
        for (let i = 0; i < depth; i++) {
            parentPath = parentPath ? `${parentPath}/${pathParts[i]}` : pathParts[i];
            if (state.isFolderCollapsed(parentPath)) {
                isHidden = true;
                break;
            }
        }
        if (isHidden) return;

        const displayName = pathParts[pathParts.length - 1];
        const listItem = document.createElement('div');
        listItem.className = 'group flex items-center px-3 py-1 hover:bg-[#2a2d2e] cursor-pointer transition-colors relative draggable-item';
        listItem.setAttribute('draggable', 'true');
        
        // Find actual index in state.assets for movement
        const actualIndex = state.assets.findIndex(a => a.name === asset.name);
        listItem.dataset.index = actualIndex;
        
        const isCollapsed = state.isFolderCollapsed(asset.name);
        const isImg = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(asset.type.toLowerCase());
        let listIcon = 'file-code-2';
        let listIconColor = 'text-[#e1b12c]';
        
        if (asset.type === 'html') { listIcon = 'file-code'; listIconColor = 'text-[#e67e22]'; }
        else if (asset.type === 'css') { listIcon = 'file-type-2'; listIconColor = 'text-[#3498db]'; }
        else if (isImg) { listIcon = 'image'; listIconColor = 'text-[#9b59b6]'; }
        
        if (asset.type === 'folder') {
            listIcon = isCollapsed ? 'chevron-right' : 'chevron-down';
            listIconColor = 'text-gray-500';
        }

        listItem.style.paddingLeft = `${depth * 12 + 8}px`;

        listItem.innerHTML = `
            <div class="flex items-center gap-1.5 flex-1 min-w-0">
                <i data-lucide="${listIcon}" class="w-3.5 h-3.5 ${listIconColor} shrink-0"></i>
                ${asset.type === 'folder' ? `<i data-lucide="${isCollapsed ? 'folder' : 'folder-open'}" class="w-4 h-4 text-blue-400 shrink-0"></i>` : ''}
                <span class="text-[13px] text-[#cccccc] group-hover:text-white truncate font-normal ${asset.type === 'folder' ? 'font-medium' : ''}">${displayName}</span>
            </div>
            <div class="hidden group-hover:flex items-center gap-1.5 pr-1">
                <button class="rename-asset-btn p-1 hover:bg-[#37373d] rounded text-gray-400 hover:text-white" title="Rename"><i data-lucide="edit-3" class="w-3 h-3"></i></button>
                <button class="delete-asset-btn p-1 hover:bg-[#37373d] rounded text-gray-400 hover:text-red-400" title="Delete"><i data-lucide="x" class="w-3 h-3"></i></button>
            </div>
        `;

        const renameBtn = listItem.querySelector('.rename-asset-btn');
        const deleteBtn = listItem.querySelector('.delete-asset-btn');

        renameBtn.onclick = (e) => {
            e.stopPropagation();
            const newName = prompt('Rename asset to:', asset.name);
            if (newName) {
                state.renameAsset(asset.name, newName);
                renderAssets();
            }
        };

        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            const msg = asset.type === 'folder' ? `Delete folder "${asset.name}" and all its contents?` : `Delete file "${asset.name}"?`;
            if (confirm(msg)) {
                state.deleteAsset(asset.name);
                renderAssets();
            }
        };

        // Click to toggle folder or open editor
        listItem.onclick = (e) => {
            if (asset.type === 'folder') {
                state.toggleFolder(asset.name);
                renderAssets();
            } else {
                import('./editor.js').then(m => m.openAssetEditor(asset.name));
            }
        };

        // Drag Events
        listItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', actualIndex);
            listItem.classList.add('opacity-40');
            e.dataTransfer.effectAllowed = 'move';
        });

        listItem.addEventListener('dragend', () => listItem.classList.remove('opacity-40'));

        listItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (asset.type === 'folder') {
                listItem.classList.add('bg-blue-500/20');
            } else {
                listItem.classList.add('border-t-2', 'border-blue-500');
            }
        });

        listItem.addEventListener('dragleave', () => {
            listItem.classList.remove('border-t-2', 'border-blue-500', 'bg-blue-500/20');
        });

        listItem.addEventListener('drop', (e) => {
            e.preventDefault();
            listItem.classList.remove('border-t-2', 'border-blue-500', 'bg-blue-500/20');
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            if (fromIndex !== actualIndex) {
                state.moveAsset(fromIndex, actualIndex, asset.type === 'folder');
                renderAssets();
            }
        });

        listRowsContainer.appendChild(listItem);
    });

    const gridCreate = document.getElementById('btn-grid-create');
    if (gridCreate) gridCreate.onclick = () => promptCreateAsset('file');
    const gridUpload = document.getElementById('btn-grid-upload');
    if (gridUpload) {
        gridUpload.onclick = () => {
            if (elements.assetUploadInput) elements.assetUploadInput.click();
        };
    }

    if (window.lucide) window.lucide.createIcons();
}

function promptCreateAsset(type = 'file') {
    const defaultName = type === 'folder' ? 'new-folder' : 'new-file.js';
    const name = prompt(`Enter ${type} name:`, defaultName);
    if (name) {
        state.createAsset(name, type);
        renderAssets();
    }
}

export function initAssetActions() {
    const { assetUploadInput } = elements;
    if (assetUploadInput) {
        assetUploadInput.onchange = async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const content = event.target.result;
                    const name = file.name;
                    state.createAsset(name, 'file');
                    state.updateAsset(name, content);
                    renderAssets();
                };
                if (file.type.startsWith('image/')) {
                    reader.readAsDataURL(file); // For images, we use data URLs in this specific upload flow
                } else {
                    reader.readAsText(file);
                }
            }
            // Reset input
            assetUploadInput.value = '';
        };
    }

    // We re-query these to be safe, although they are now stable button elements
    const btnCreateFile = document.getElementById('btn-create-file');
    const btnCreateFolder = document.getElementById('btn-create-folder');
    const btnRefreshAssets = document.getElementById('btn-refresh-assets');
    
    if (btnCreateFile) {
        btnCreateFile.onclick = (e) => {
            e.stopPropagation();
            promptCreateAsset('file');
        };
    }
    if (btnCreateFolder) {
        btnCreateFolder.onclick = (e) => {
            e.stopPropagation();
            promptCreateAsset('folder');
        };
    }
    if (btnRefreshAssets) {
        btnRefreshAssets.onclick = (e) => {
            e.stopPropagation();
            renderAssets();
        };
    }
}