import { elements } from './dom.js';
import { state } from './state.js';
import { showContextMenu, showProfileContextMenu, showModelSelectorMenu } from './renderer.js';
import { PROVIDERS } from './constants.js';

export function initializeUI() {
    initializeDeviceSwitching();
    initializeRailMore();
    initializeProfileMenu();
    initializeModelSelector();
}

function initializeDeviceSwitching() {
    const { viewDesktop, viewMobile, browserFrameWrapper } = elements;
    if (!viewDesktop || !viewMobile) return;

    viewDesktop.addEventListener('click', () => {
        browserFrameWrapper.style.width = '100%';
        browserFrameWrapper.style.maxWidth = '100%';
        browserFrameWrapper.style.height = '100%';
        browserFrameWrapper.classList.remove('rounded-3xl', 'border-[12px]', 'border-gray-800');
        viewDesktop.classList.add('bg-[#2a2a2a]', 'text-white');
        viewDesktop.classList.remove('text-gray-500');
        viewMobile.classList.remove('bg-[#2a2a2a]', 'text-white');
        viewMobile.classList.add('text-gray-500');
    });

    viewMobile.addEventListener('click', () => {
        browserFrameWrapper.style.width = '375px';
        browserFrameWrapper.style.maxWidth = '375px';
        browserFrameWrapper.style.height = '667px';
        browserFrameWrapper.classList.add('rounded-3xl', 'border-[12px]', 'border-gray-800');
        viewMobile.classList.add('bg-[#2a2a2a]', 'text-white');
        viewMobile.classList.remove('text-gray-500');
        viewDesktop.classList.remove('bg-[#2a2a2a]', 'text-white');
        viewDesktop.classList.add('text-gray-500');
    });
}

function initializeRailMore() {
    const { btnRailMore } = elements;
    if (btnRailMore) {
        btnRailMore.addEventListener('click', (e) => {
            e.stopPropagation();
            import('./chat-manager.js').then(m => {
                showContextMenu(e, state.currentVersionIndex, state.versions[state.currentVersionIndex], m.handleVersionSelect);
            });
        });
    }
}

function initializeProfileMenu() {
    const { btnProfile } = elements;
    if (btnProfile) {
        btnProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            showProfileContextMenu(e.currentTarget);
        });
    }
}

function initializeModelSelector() {
    const { btnModelSelector, selectedModelName } = elements;
    if (!btnModelSelector) return;

    btnModelSelector.addEventListener('click', (e) => {
        e.stopPropagation();
        showModelSelectorMenu(
            btnModelSelector, 
            PROVIDERS, 
            state.selectedProviderId, 
            state.selectedModelId, 
            (pId, mId, mName) => {
                state.selectedProviderId = pId;
                state.selectedModelId = mId;
                selectedModelName.textContent = mName;
                
                if (state.selectedProviderId === 'poe' && PROVIDERS.poe.apiKey === 'YOUR_POE_API_KEY') {
                    const key = prompt("Please enter your Poe API Key:");
                    if (key) PROVIDERS.poe.apiKey = key;
                }
            }
        );
    });
}