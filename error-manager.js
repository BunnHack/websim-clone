import { elements } from './dom.js';
import { state } from './state.js';
import { handlePromptSubmission } from './chat-manager.js';

export function initializeErrorTracking() {
    const { chatErrorIndicator, chatErrorTooltip } = elements;
    
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'preview-error') {
            const errorMsg = event.data.message;
            state.lastError = errorMsg;
            
            if (chatErrorIndicator && chatErrorTooltip) {
                chatErrorIndicator.classList.remove('hidden');
                chatErrorTooltip.textContent = `Preview Error: ${errorMsg}`;
            }
        }
    });

    if (chatErrorIndicator) {
        chatErrorIndicator.onclick = () => {
            if (state.lastError) {
                const fixPrompt = `I'm seeing this error in the preview: "${state.lastError}". Please fix it.`;
                handlePromptSubmission(fixPrompt);
                chatErrorIndicator.classList.add('hidden');
                state.lastError = null;
            }
        };
    }
}