import { elements } from './dom.js';
import { state } from './state.js';
import { updatePreview, renderVersions, renderAssets } from './renderer.js';
import { generateAIContentStream, parseAIResponse } from './api.js';

export function initializeChat() {
    const { textarea, assetTagSuggestions } = elements;
    if (!textarea) return;

    textarea.addEventListener('keydown', (e) => {
        if (!assetTagSuggestions.classList.contains('hidden')) {
            const active = assetTagSuggestions.querySelector('.bg-blue-600\\/20');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = (active?.nextElementSibling || assetTagSuggestions.firstElementChild);
                active?.classList.remove('bg-blue-600/20');
                next?.classList.add('bg-blue-600/20');
                next?.scrollIntoView({ block: 'nearest' });
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = (active?.previousElementSibling || assetTagSuggestions.lastElementChild);
                active?.classList.remove('bg-blue-600/20');
                prev?.classList.add('bg-blue-600/20');
                prev?.scrollIntoView({ block: 'nearest' });
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                if (active) {
                    e.preventDefault();
                    active.click();
                    return;
                }
            }
            if (e.key === 'Escape') {
                assetTagSuggestions.classList.add('hidden');
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const text = textarea.value.trim();
            if (text) {
                handlePromptSubmission(text);
                textarea.value = '';
                assetTagSuggestions.classList.add('hidden');
            }
        }
    });

    initializeAssetTagging();
}

function initializeAssetTagging() {
    const { textarea, assetTagSuggestions } = elements;
    if (!textarea) return;
    
    const updateSuggestions = () => {
        const cursor = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursor);
        const atIndex = textBefore.lastIndexOf('@');
        
        if (atIndex !== -1 && !textBefore.substring(atIndex).includes(' ')) {
            const query = textBefore.substring(atIndex + 1).toLowerCase();
            const filtered = state.assets.filter(a => 
                a.type !== 'folder' && a.name.toLowerCase().includes(query)
            );

            if (filtered.length > 0) {
                renderTagSuggestions(filtered, atIndex, cursor);
            } else {
                assetTagSuggestions.classList.add('hidden');
            }
        } else {
            assetTagSuggestions.classList.add('hidden');
        }
    };

    const renderTagSuggestions = (assets, atIndex, cursor) => {
        assetTagSuggestions.innerHTML = '';
        assetTagSuggestions.classList.remove('hidden');
        
        assets.forEach((asset, idx) => {
            const item = document.createElement('div');
            item.className = `px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-[#2a2a2a] border-b border-[#2a2a2a] last:border-0 transition-colors ${idx === 0 ? 'bg-blue-600/20' : ''}`;
            
            let icon = 'file-code';
            if (asset.type === 'css') icon = 'hash';
            if (asset.type === 'js') icon = 'file-json';
            if (['png', 'jpg', 'jpeg', 'svg'].includes(asset.type)) icon = 'image';

            item.innerHTML = `
                <i data-lucide="${icon}" class="w-4 h-4 text-gray-500"></i>
                <div class="flex flex-col">
                    <span class="text-sm text-gray-200 font-medium">${asset.name}</span>
                    <span class="text-[10px] text-gray-500 uppercase">${asset.type} • ${asset.size}</span>
                </div>
            `;
            
            item.onclick = () => {
                const textAfter = textarea.value.substring(cursor);
                const newText = textarea.value.substring(0, atIndex) + '@' + asset.name + ' ' + textAfter;
                textarea.value = newText;
                assetTagSuggestions.classList.add('hidden');
                textarea.focus();
                const newPos = atIndex + asset.name.length + 2;
                textarea.setSelectionRange(newPos, newPos);
            };
            
            assetTagSuggestions.appendChild(item);
        });
        
        if (window.lucide) window.lucide.createIcons();
    };

    textarea.addEventListener('input', updateSuggestions);
    textarea.addEventListener('click', updateSuggestions);
    document.addEventListener('click', (e) => {
        if (!textarea.contains(e.target) && !assetTagSuggestions.contains(e.target)) {
            assetTagSuggestions.classList.add('hidden');
        }
    });
}

export function handleVersionSelect(idx, code) {
    if (idx < 0) return;
    state.currentVersionIndex = idx;
    
    state.lastError = null;
    if (elements.chatErrorIndicator) elements.chatErrorIndicator.classList.add('hidden');

    // Sync project assets with this version's state
    const version = state.versions[idx];
    if (version && version.fileContents) {
        Object.entries(version.fileContents).forEach(([name, content]) => {
            state.updateAsset(name, content, false); // Update locally but don't re-sync back as new asset entries
        });
    }

    renderVersions(handleVersionSelect);
    renderAssets();
    updatePreview(code);
    if (elements.chatVersionLabel) elements.chatVersionLabel.textContent = `v${state.versions[idx].id}`;
}

export async function handlePromptSubmission(promptText) {
    const { versionFeed, chatVersionLabel, btnThought, chatErrorIndicator } = elements;
    
    state.lastError = null;
    if (chatErrorIndicator) chatErrorIndicator.classList.add('hidden');

    const startTime = Date.now();
    
    const generatingCard = document.createElement('div');
    generatingCard.className = 'bg-[#121212] rounded-xl border border-blue-600/30 p-4 animate-pulse flex flex-col gap-4';
    generatingCard.innerHTML = `<div class="h-4 bg-blue-600/40 rounded w-1/4"></div><div class="h-3 bg-gray-800 rounded w-full"></div>`;
    versionFeed.appendChild(generatingCard);
    versionFeed.scrollTop = versionFeed.scrollHeight;

    btnThought?.click();

    const thoughtPrompt = document.getElementById('thought-prompt');
    const thoughtContent = document.getElementById('thought-content');
    const thoughtVersionId = document.getElementById('thought-version-id');
    
    if (thoughtPrompt) thoughtPrompt.textContent = `"${promptText}"`;
    if (thoughtVersionId) thoughtVersionId.textContent = "GENERATING...";
    if (thoughtContent) thoughtContent.innerHTML = '<p class="animate-pulse text-blue-400">Thinking...</p>';

    try {
        const previousCode = state.activeProject.versions.length > 0 
            ? state.activeProject.versions[state.activeProject.currentVersionIndex].code 
            : '';
        
        let fullRawResponse = "";

        for await (const chunk of generateAIContentStream(promptText, state.versions)) {
            fullRawResponse = chunk;
            const { reasoning } = parseAIResponse(fullRawResponse);
            if (reasoning && thoughtContent) {
                thoughtContent.innerHTML = `<p class="whitespace-pre-wrap">${reasoning}</p>`;
            }
        }

        const { reasoning, files } = parseAIResponse(fullRawResponse);
        const duration = ((Date.now() - startTime) / 1000).toFixed(0);
        
        const mainFile = files.find(f => f.name === 'index.html') || files[0];
        const code = mainFile.content;

        const prevLines = previousCode.split('\n').length;
        const newLines = code.split('\n').length;
        const added = Math.max(1, Math.abs(newLines - prevLines));

        const newVersion = {
            id: state.versions.length + 1,
            prompt: promptText,
            code: code,
            summary: reasoning || `Updated files based on prompt.`,
            timestamp: Date.now(),
            files: files.map(f => f.name),
            fileContents: Object.fromEntries(state.assets.filter(a => a.type !== 'folder').map(a => [a.name, a.content])),
            rawResponse: fullRawResponse,
            stats: {
                added: added,
                removed: Math.floor(Math.random() * 5),
                tokens: (fullRawResponse.length / 4 / 1000).toFixed(1) + 'k',
                time: duration + 's',
                model: 'gemini-3-flash'
            }
        };

        files.forEach(f => newVersion.fileContents[f.name] = f.content);
        state.addVersion(newVersion);
        for (const f of files) {
            await state.updateAsset(f.name, f.content);
        }
        
        if (chatVersionLabel) chatVersionLabel.textContent = `v${newVersion.id}`;
        if (thoughtVersionId) thoughtVersionId.textContent = `VERSION: V${newVersion.id}`;
        
        generatingCard.remove();
        handleVersionSelect(state.currentVersionIndex, code);
        renderAssets();
        updatePreview(code);
    } catch (error) {
        console.error(error);
        if (thoughtContent) thoughtContent.innerHTML = `<p class="text-red-500 font-bold">Error: ${error.message}</p>`;
        generatingCard.innerHTML = `<div class="text-red-500 text-xs">Error: ${error.message}</div>`;
        setTimeout(() => generatingCard.remove(), 3000);
    }
}