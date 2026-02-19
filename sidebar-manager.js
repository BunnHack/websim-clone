import { elements } from './dom.js';
import { state } from './state.js';
import { renderAssets, renderVersions, renderProjects } from './renderer.js';
import { handleProjectSwitch } from './project-manager.js';
import { handleVersionSelect } from './chat-manager.js';

export function initializeSidebar() {
    initializeSidebarSwitching();
    initializeAssetToggles();
}

function initializeSidebarSwitching() {
    const { 
        btnAssets, btnFeed, feedView, assetsView, projectsView, btnProjects, 
        btnHome, railSettings, settingsView, btnDeleteProject, btnThought, 
        thoughtView, btnPlugins, pluginsView, chatInputArea, editorView,
        btnExpandProjects, railMessage, commentsView
    } = elements;
    
    const switchTab = (tab) => {
        showHome(tab === 'home');

        // Hide all sub-views
        [feedView, assetsView, projectsView, settingsView, thoughtView, pluginsView, commentsView].forEach(v => v?.classList.add('hidden'));
        
        // Clear highlights
        [btnAssets, btnFeed, btnProjects, btnHome, btnThought, btnPlugins, railSettings, btnExpandProjects, railMessage].forEach(b => b?.classList.remove('bg-[#2a2a2a]', 'text-white'));

        editorView.classList.add('hidden');
        
        const hideChat = (['projects', 'assets', 'settings', 'thought', 'plugins'].includes(tab)) || 
                         (tab === 'home' && state.isSidebarExpandedOnHome);
        
        if (chatInputArea) {
            chatInputArea.classList.toggle('hidden', !!hideChat);
        }

        if (tab === 'assets') {
            assetsView.classList.remove('hidden');
            assetsView.classList.add('flex');
            btnAssets.classList.add('bg-[#2a2a2a]', 'text-white');
            renderAssets();
        } else if (tab === 'projects') {
            projectsView.classList.remove('hidden');
            projectsView.classList.add('flex');
            btnProjects.classList.add('bg-[#2a2a2a]');
            renderProjects(handleProjectSwitch);
        } else if (tab === 'home') {
            btnHome.classList.add('bg-[#2a2a2a]', 'text-white');
            if (state.isSidebarExpandedOnHome) {
                projectsView.classList.remove('hidden');
                projectsView.classList.add('flex');
                btnProjects.classList.add('bg-[#2a2a2a]');
                if (btnExpandProjects) btnExpandProjects.classList.add('bg-[#2a2a2a]', 'text-white');
                renderProjects(handleProjectSwitch);
            }
        } else if (tab === 'plugins') {
            if (pluginsView) {
                pluginsView.classList.remove('hidden');
                pluginsView.classList.add('flex');
            }
            btnPlugins?.classList.add('bg-[#2a2a2a]', 'text-white');
            import('./plugins-renderer.js').then(m => m.renderPlugins());
        } else if (tab === 'thought') {
            thoughtView.classList.remove('hidden');
            thoughtView.classList.add('flex');
            btnThought?.classList.add('bg-[#2a2a2a]', 'text-white');
            updateThoughtView();
        } else if (tab === 'settings') {
            settingsView.classList.remove('hidden');
            settingsView.classList.add('flex');
            railSettings?.classList.add('bg-[#2a2a2a]', 'text-white');
            updateSettingsView();
        } else if (tab === 'comments') {
            commentsView.classList.remove('hidden');
            commentsView.classList.add('flex');
            railMessage?.classList.add('bg-[#2a2a2a]', 'text-white');
            import('./comments-renderer.js').then(m => m.renderComments());
        } else {
            feedView.classList.remove('hidden');
            btnFeed.classList.add('bg-[#2a2a2a]', 'text-white');
            renderVersions(handleVersionSelect);
        }
        if (window.lucide) window.lucide.createIcons();
    };

    const toggleHomeExpansion = () => {
        state.isSidebarExpandedOnHome = !state.isSidebarExpandedOnHome;
        switchTab('home');
    };

    btnAssets.addEventListener('click', () => switchTab('assets'));
    btnFeed.addEventListener('click', () => switchTab('feed'));
    btnHome.addEventListener('click', () => switchTab('home'));
    btnThought?.addEventListener('click', () => switchTab('thought'));
    btnPlugins?.addEventListener('click', () => switchTab('plugins'));
    railSettings?.addEventListener('click', () => switchTab('settings'));
    railMessage?.addEventListener('click', () => switchTab('comments'));

    btnDeleteProject?.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete "${state.activeProject.name}"?`)) {
            state.deleteProject(state.activeProjectId);
            handleProjectSwitch(state.activeProjectId);
        }
    });

    btnProjects.addEventListener('click', () => {
        const isHomeActive = !elements.homeView.classList.contains('hidden');
        if (isHomeActive) toggleHomeExpansion();
        else switchTab('projects');
    });
    
    btnExpandProjects?.addEventListener('click', toggleHomeExpansion);
}

function updateThoughtView() {
    const version = state.versions[state.currentVersionIndex];
    const thoughtPrompt = document.getElementById('thought-prompt');
    const thoughtContent = document.getElementById('thought-content');
    const thoughtVersionId = document.getElementById('thought-version-id');
    const thoughtModel = document.getElementById('thought-model');
    const thoughtTokens = document.getElementById('thought-tokens');

    if (version) {
        if (thoughtPrompt) thoughtPrompt.textContent = `"${version.prompt}"`;
        if (thoughtContent) thoughtContent.innerHTML = `<p>${version.summary || 'No reasoning available for this version.'}</p>`;
        if (thoughtVersionId) thoughtVersionId.textContent = `VERSION: V${version.id}`;
        if (thoughtModel) thoughtModel.textContent = version.stats?.model || 'unknown';
        if (thoughtTokens) thoughtTokens.textContent = version.stats?.tokens || '0k';
    } else {
        if (thoughtPrompt) thoughtPrompt.textContent = "No active generation.";
        if (thoughtContent) thoughtContent.innerHTML = "<p>Generate something to see the AI's thought process.</p>";
        if (thoughtVersionId) thoughtVersionId.textContent = "VERSION: NONE";
    }
}

function updateSettingsView() {
    const project = state.activeProject;
    const nameLabel = elements.settingsView.querySelector('.settings-project-name');
    if (nameLabel) nameLabel.textContent = project.name;
    
    const urlInput = elements.settingsView.querySelector('input[value*="websim.com"]');
    if (urlInput) {
        const author = project.author || '@Bunn';
        const slug = project.name.toLowerCase().replace(/\s+/g, '-');
        urlInput.value = `websim.com/${author}/${slug}`;
    }

    const descLabel = elements.settingsView.querySelector('p.text-sm.text-gray-500');
    if (descLabel) {
        descLabel.textContent = project.description || 'Add a description...';
        descLabel.className = project.description ? 'text-sm text-gray-200' : 'text-sm text-gray-500 italic';
    }
}

export function showHome(visible) {
    const { 
        homeView, previewNav, previewContainer, btnHome, btnFeed, rightSidebar, 
        railImage, railMessage, railSettings, btnAssets, btnExpandProjects, 
        btnThought, btnPlugins, btnProfile, btnRailMore 
    } = elements;

    if (visible) {
        homeView.classList.remove('hidden');
        previewNav.classList.add('hidden');
        previewContainer.classList.add('hidden');
        rightSidebar.classList.toggle('hidden', !state.isSidebarExpandedOnHome);
        
        [railImage, railMessage, railSettings, btnAssets, btnThought, btnPlugins, btnFeed, btnRailMore]
            .forEach(el => el?.classList.add('hidden'));
        
        btnExpandProjects?.classList.remove('hidden');
        btnProfile?.classList.remove('hidden');
        btnHome?.classList.add('bg-[#2a2a2a]', 'text-white');
    } else {
        homeView.classList.add('hidden');
        previewNav.classList.remove('hidden');
        previewContainer.classList.remove('hidden');
        rightSidebar.classList.remove('hidden');

        [railImage, railMessage, railSettings, btnAssets, btnThought, btnPlugins, btnFeed, btnRailMore]
            .forEach(el => el?.classList.remove('hidden'));
        
        btnExpandProjects?.classList.add('hidden');
        btnProfile?.classList.add('hidden');
    }
}

function initializeAssetToggles() {
    const { btnViewGrid, btnViewList, gridContainer, listContainer } = elements;
    if (!btnViewGrid || !btnViewList) return;
    
    const toggle = (isGrid) => {
        if (isGrid) {
            gridContainer.classList.remove('hidden');
            gridContainer.classList.add('grid');
            listContainer.classList.add('hidden');
            btnViewGrid.classList.add('bg-[#2a2a2a]', 'text-white');
            btnViewList.classList.remove('bg-[#2a2a2a]', 'text-white');
        } else {
            gridContainer.classList.add('hidden');
            listContainer.classList.remove('hidden');
            btnViewList.classList.add('bg-[#2a2a2a]', 'text-white');
            btnViewGrid.classList.remove('bg-[#2a2a2a]', 'text-white');
        }
    };
    btnViewGrid.addEventListener('click', () => toggle(true));
    btnViewList.addEventListener('click', () => toggle(false));
}