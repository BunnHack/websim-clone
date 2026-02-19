import { elements } from './dom.js';
import { state } from './state.js';
import { showContextMenu } from './context-menu.js';

export function renderVersions(onVersionClick = () => {}) {
    const { versionFeed } = elements;
    if (!versionFeed) return;
    
    versionFeed.innerHTML = '';
    state.versions.forEach((v, index) => {
        const card = document.createElement('div');
        const isActive = index === state.currentVersionIndex;
        card.className = `bg-[#121212] rounded-2xl border ${isActive ? 'border-blue-500/40 shadow-lg shadow-blue-500/5' : 'border-[#2a2a2a]'} p-4 flex flex-col gap-3 relative cursor-pointer hover:border-[#3a3a3a] transition-all group/card`;
        
        const stats = v.stats || { added: 0, removed: 0, tokens: '0.1k', time: '1s', model: 'gemini-3-flash' };
        const displayFiles = v.files || ['index.html'];

        card.innerHTML = `
            <div class="flex justify-between gap-3">
                <div class="flex-1 flex flex-col gap-4">
                    <!-- Top: Version Badge & Prompt Title -->
                    <div class="flex items-start justify-between">
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div class="pin-trigger flex items-center gap-1.5 ${isActive ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#1c1c1c] text-gray-500 border-[#2a2a2a] hover:border-gray-500'} text-[11px] px-2.5 py-1.5 rounded-lg font-bold shrink-0 border transition-all cursor-pointer">
                                v${v.id} <i data-lucide="pin" class="w-3.5 h-3.5 ${isActive ? 'opacity-100' : 'opacity-40'}"></i>
                            </div>
                            <h4 class="text-[14px] text-white font-bold truncate pr-4">${v.prompt}</h4>
                        </div>
                        <div class="p-1.5 hover:bg-[#2a2a2a] rounded-lg cursor-pointer menu-trigger opacity-0 group-hover/card:opacity-100 transition-opacity" data-version-id="${index}">
                            <i data-lucide="more-vertical" class="w-4 h-4 text-gray-500"></i>
                        </div>
                    </div>

                    <!-- Mid: Profile Avatar & Summary Reason -->
                    <div class="flex gap-3">
                        <div class="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">S</div>
                        <div class="flex-1 flex gap-3 min-w-0">
                            <div class="flex-1 text-[13px] text-gray-400 leading-relaxed line-clamp-3 font-medium">${v.summary}</div>
                            <div class="w-20 h-16 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] shrink-0 flex items-center justify-center overflow-hidden group-hover/card:border-gray-700 transition-colors">
                                 <i data-lucide="image" class="w-6 h-6 text-[#222]"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom: Files & Stats Metadata (Always show) -->
                    <div class="flex flex-col gap-3 mt-1">
                        <div class="flex flex-wrap gap-2 text-[10px] font-mono">
                            ${displayFiles.map(file => `
                                <div class="bg-[#1a1a1a] px-2.5 py-1.5 rounded-lg border border-[#2a2a2a] flex items-center gap-2 hover:border-blue-500/50 hover:bg-[#1e1e1e] transition-colors diff-trigger" data-version-index="${index}" data-filename="${file}">
                                    <span class="text-gray-300 truncate max-w-[140px]">${file}</span>
                                    <span class="text-green-500 font-bold">+${stats.added}</span>
                                    <span class="text-red-500 font-bold">-${stats.removed}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="flex items-center gap-4 text-[11px] font-mono text-gray-600 font-bold">
                            <span>${stats.tokens}</span>
                            <span>${stats.time}</span>
                            <span class="uppercase tracking-widest opacity-80">${stats.model}</span>
                        </div>
                    </div>
                </div>

                <!-- Right Utility Column -->
                <div class="flex flex-col gap-1.5 items-center pt-10">
                    <div class="p-1.5 hover:bg-[#2a2a2a] rounded-lg cursor-pointer edit-prompt-trigger group/edit" data-prompt="${v.prompt.replace(/"/g, '&quot;')}">
                        <i data-lucide="pencil" class="w-4 h-4 text-gray-500 group-hover/edit:text-white transition-colors"></i>
                    </div>
                    <div class="p-1.5 hover:bg-red-500/10 rounded-lg cursor-pointer group/del delete-trigger" data-version-id="${index}">
                        <i data-lucide="trash-2" class="w-4 h-4 text-gray-500 group-hover/del:text-red-500 transition-colors"></i>
                    </div>
                </div>
            </div>
        `;

        card.onclick = (e) => {
            const diffTrigger = e.target.closest('.diff-trigger');
            const deleteTrigger = e.target.closest('.delete-trigger');
            const menuTrigger = e.target.closest('.menu-trigger');
            const editTrigger = e.target.closest('.edit-prompt-trigger');
            
            if (editTrigger) {
                e.stopPropagation();
                if (elements.textarea) {
                    elements.textarea.value = editTrigger.dataset.prompt;
                    elements.textarea.focus();
                }
                return;
            }

            if (diffTrigger) {
                e.stopPropagation();
                const vIdx = parseInt(diffTrigger.dataset.versionIndex);
                const fileName = diffTrigger.dataset.filename || 'index.html';
                import('./diff-utils.js').then(m => m.openDiffView(vIdx, fileName));
                return;
            }

            if (deleteTrigger) {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this version?')) {
                    state.versions.splice(index, 1);
                    if (state.currentVersionIndex >= state.versions.length) {
                        state.currentVersionIndex = state.versions.length - 1;
                    }
                    renderVersions(onVersionClick);
                }
                return;
            }

            if (menuTrigger) {
                e.stopPropagation();
                showContextMenu(e, index, v, onVersionClick);
                return;
            }

            // Pinning action: Clicking card or specific version label selects the version
            onVersionClick(index, v.code);
        };

        versionFeed.appendChild(card);
    });
    
    if (window.lucide) window.lucide.createIcons();
    versionFeed.scrollTop = versionFeed.scrollHeight;
}