import { diffLines } from 'https://esm.sh/diff';
import { state } from './state.js';
import { elements } from './dom.js';

export function generateDiffHtml(oldCode, newCode) {
    const changes = diffLines(oldCode || '', newCode || '');
    let html = '';
    
    let oldLineNum = 1;
    let newLineNum = 1;

    changes.forEach(part => {
        const lines = part.value.split('\n');
        // Handle trailing newline from split
        if (lines[lines.length - 1] === '' && part.value.endsWith('\n')) lines.pop(); 

        const bgColor = part.added ? 'bg-green-500/10' :
                        part.removed ? 'bg-red-500/10' : '';
        const textColor = part.added ? 'text-green-400' :
                          part.removed ? 'text-red-400' : 'text-gray-400';
        const prefix = part.added ? '+' : part.removed ? '-' : ' ';
        
        lines.forEach(line => {
            const displayOld = part.added ? '' : oldLineNum++;
            const displayNew = part.removed ? '' : newLineNum++;
            const escapedLine = (line || ' ')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

            html += `
                <div class="flex hover:bg-white/5 transition-colors font-mono text-[12px] group leading-normal border-l-2 ${part.added ? 'border-green-500/50' : part.removed ? 'border-red-500/50' : 'border-transparent'}">
                    <div class="w-10 shrink-0 select-none text-right pr-2 text-gray-600 border-r border-[#2a2a2a] bg-black/20">${displayOld}</div>
                    <div class="w-10 shrink-0 select-none text-right pr-2 text-gray-600 border-r border-[#2a2a2a] bg-black/20">${displayNew}</div>
                    <div class="w-6 shrink-0 select-none text-center font-bold ${textColor} opacity-60">${prefix}</div>
                    <div class="whitespace-pre break-all flex-1 px-2 ${bgColor} ${textColor}">${escapedLine}</div>
                </div>
            `;
        });
    });
    
    if (!html) return '<div class="p-10 text-center text-gray-400 italic font-sans">No code changes detected in this version.</div>';
    return html;
}

export function openDiffView(index, initialFileName) {
    const currentVersion = state.versions[index];
    if (!currentVersion) return;

    const prevVersion = index > 0 ? state.versions[index - 1] : null;
    const { diffModal, diffVersionTag, diffContent, diffClose, diffFileList } = elements;
    
    diffModal.classList.remove('hidden');
    diffVersionTag.textContent = `v${currentVersion.id}`;
    
    const renderFileDiff = (fileName) => {
        const newCode = currentVersion.fileContents ? currentVersion.fileContents[fileName] : (fileName === 'index.html' ? currentVersion.code : '');
        const oldCode = prevVersion?.fileContents ? prevVersion.fileContents[fileName] : (fileName === 'index.html' ? prevVersion?.code : '');
        
        diffContent.innerHTML = generateDiffHtml(oldCode || '', newCode || '');
        
        diffFileList.querySelectorAll('.diff-file-item').forEach(el => {
            if (el.dataset.name === fileName) {
                el.classList.add('bg-blue-600/10', 'text-blue-400', 'border-l-2', 'border-blue-500');
                el.classList.remove('text-gray-400');
            } else {
                el.classList.remove('bg-blue-600/10', 'text-blue-400', 'border-l-2', 'border-blue-500');
                el.classList.add('text-gray-400');
            }
        });
    };

    const files = currentVersion.fileContents ? Object.keys(currentVersion.fileContents) : currentVersion.files || ['index.html'];
    diffFileList.innerHTML = '';
    
    files.sort().forEach(fileName => {
        const item = document.createElement('div');
        item.className = 'diff-file-item px-4 py-2 text-[12px] text-gray-400 hover:bg-white/5 cursor-pointer transition-colors truncate flex items-center justify-between group/file';
        item.dataset.name = fileName;
        
        const newCode = currentVersion.fileContents ? currentVersion.fileContents[fileName] : (fileName === 'index.html' ? currentVersion.code : '');
        const oldCode = prevVersion?.fileContents ? prevVersion.fileContents[fileName] : (fileName === 'index.html' ? prevVersion?.code : '');
        
        const changes = diffLines(oldCode || '', newCode || '');
        let added = 0;
        let removed = 0;
        changes.forEach(p => {
            if (p.added) added += p.value.split('\n').filter(l => l !== '').length || (p.value.length > 0 ? 1 : 0);
            if (p.removed) removed += p.value.split('\n').filter(l => l !== '').length || (p.value.length > 0 ? 1 : 0);
        });

        const ext = fileName.split('.').pop();
        let icon = 'file-text';
        if (ext === 'html') icon = 'code';
        if (ext === 'js') icon = 'file-json';
        if (ext === 'css') icon = 'hash';

        item.innerHTML = `
            <div class="flex items-center gap-2 truncate flex-1">
                <i data-lucide="${icon}" class="w-3.5 h-3.5 opacity-60"></i>
                <span class="truncate">${fileName}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0 font-mono text-[9px] font-bold">
                ${added > 0 ? `<span class="text-green-500/80">+${added}</span>` : ''}
                ${removed > 0 ? `<span class="text-red-500/80">-${removed}</span>` : ''}
            </div>
        `;
        
        item.onclick = () => renderFileDiff(fileName);
        diffFileList.appendChild(item);
    });

    // Default file to show
    const defaultFile = initialFileName || (files.includes('index.html') ? 'index.html' : files[0]);
    renderFileDiff(defaultFile);
    
    diffClose.onclick = () => diffModal.classList.add('hidden');
    if (window.lucide) window.lucide.createIcons();
}