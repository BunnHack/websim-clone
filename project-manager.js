import { elements } from './dom.js';
import { state } from './state.js';
import { renderAssets, updatePreview } from './renderer.js';
import { handleVersionSelect } from './chat-manager.js';

export function initializeProjects() {
    const createNew = async () => {
        const newProj = await state.createNewProject();
        handleProjectSwitch(newProj.id);
    };

    const btnNew = document.getElementById('btn-new-project');
    if (btnNew) btnNew.addEventListener('click', createNew);
    
    if (elements.btnRailPlus) elements.btnRailPlus.addEventListener('click', createNew);
}

export function handleProjectSwitch(projectId) {
    state.switchProject(projectId);
    const project = state.activeProject;
    
    const titleEl = document.querySelector('h2.text-xl.font-bold.text-white');
    if (titleEl) titleEl.textContent = project.name;

    elements.btnFeed?.click();

    if (project.versions && project.versions.length > 0) {
        const currentIdx = project.currentVersionIndex;
        handleVersionSelect(currentIdx, project.versions[currentIdx].code);
    } else {
        updatePreview(`
            <div style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; color: #666; text-align: center; padding: 20px;">
                <p>This is a new empty project.<br>Type a prompt in the chat to start generating.</p>
            </div>
        `);
        if (elements.chatVersionLabel) elements.chatVersionLabel.textContent = 'v0';
        if (elements.versionFeed) elements.versionFeed.innerHTML = '';
    }
    renderAssets();
}