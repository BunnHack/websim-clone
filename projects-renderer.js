import { elements } from './dom.js';
import { state } from './state.js';

export function renderProjects(onProjectSelect) {
    const { projectsList } = elements;
    if (!projectsList) return;

    projectsList.innerHTML = '';

    if (state.projects.length === 0) {
        projectsList.innerHTML = '<div class="text-center text-gray-500 py-10">No projects found.</div>';
        return;
    }

    const sortedProjects = [...state.projects].sort((a, b) => b.timestamp - a.timestamp);
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-3';
    
    sortedProjects.forEach(project => {
        const isActive = project.id === state.activeProjectId;
        const card = document.createElement('div');
        card.className = `group relative flex items-center gap-4 bg-[#1a1a1a] rounded-xl border ${isActive ? 'border-blue-600/50 bg-[#1e2430]' : 'border-[#2a2a2a]'} hover:border-gray-500 p-2 cursor-pointer transition-all overflow-hidden`;
        
        const timeStr = new Date(project.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        card.innerHTML = `
            <div class="w-32 h-20 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] overflow-hidden shrink-0 relative">
                <img src="${project.thumbnail}" class="w-full h-full object-cover opacity-40 group-hover:opacity-80 transition-opacity">
                <div class="absolute bottom-1 left-1 w-6 h-6 rounded-full bg-green-600 border-2 border-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-white">S</div>
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-between h-full py-1">
                <div class="flex justify-between items-start">
                    <h4 class="text-sm font-bold ${isActive ? 'text-blue-400' : 'text-gray-200'} truncate">${project.name}</h4>
                    <i data-lucide="settings" class="w-3.5 h-3.5 text-gray-500 hover:text-white"></i>
                </div>
                <div class="flex justify-between items-end">
                    <div class="flex items-center gap-1.5 text-gray-500">
                        <span class="text-[10px] font-bold">${project.versions.length}</span>
                        <i data-lucide="layers" class="w-3 h-3"></i>
                    </div>
                    <span class="text-[10px] text-gray-500">${timeStr}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            if (onProjectSelect) onProjectSelect(project.id);
        });

        container.appendChild(card);
    });
    
    projectsList.appendChild(container);
    if (window.lucide) window.lucide.createIcons();
}

export function renderCommunityProjects(onProjectClick, customTarget) {
    const target = customTarget || elements.communityGrid;
    if (!target) return;

    target.innerHTML = '';
    state.communityProjects.forEach(proj => {
        const card = document.createElement('div');
        card.className = 'group flex flex-col bg-[#161616] rounded-2xl border border-[#2a2a2a] hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/5 overflow-hidden cursor-pointer transition-all';
        
        card.innerHTML = `
            <div class="relative aspect-[16/10] overflow-hidden">
                <img src="${proj.thumbnail}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100">
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="absolute bottom-3 left-3 flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-blue-600 border border-white/20 flex items-center justify-center text-[8px] font-bold text-white">${proj.author[1]}</div>
                    <span class="text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">${proj.author}</span>
                </div>
            </div>
            <div class="p-4 flex flex-col gap-1">
                <h4 class="text-sm font-bold text-gray-200 group-hover:text-white transition-colors truncate">${proj.name}</h4>
                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-2.5 text-gray-500">
                        <span class="text-[10px] font-medium opacity-60">${proj.updatedAt}</span>
                        <div class="flex items-center hover:text-red-400 transition-colors cursor-pointer">
                            <i data-lucide="heart" class="w-3.5 h-3.5"></i>
                        </div>
                        <div class="flex items-center hover:text-blue-400 transition-colors cursor-pointer">
                            <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
                        </div>
                    </div>
                    <div class="px-2 py-0.5 rounded bg-[#2a2a2a] text-[9px] font-bold text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">OPEN</div>
                </div>
            </div>
        `;
        
        card.onclick = () => onProjectClick(proj);
        target.appendChild(card);
    });
    if (window.lucide) window.lucide.createIcons();
}