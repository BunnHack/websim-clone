import { elements } from './dom.js';
import { state } from './state.js';

export async function renderComments() {
    const list = document.getElementById('comments-list');
    const input = document.getElementById('comment-input');
    const sendBtn = document.getElementById('btn-send-comment');
    
    if (!list || !input || !sendBtn) return;

    // Show loading state
    list.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 opacity-40">
            <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p class="text-xs">Loading comments...</p>
        </div>
    `;

    const comments = await state.loadComments(state.activeProjectId);
    
    if (comments.length === 0) {
        list.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center opacity-40">
                <i data-lucide="message-square" class="w-12 h-12 mb-3"></i>
                <p class="text-sm font-medium">No comments yet</p>
                <p class="text-[11px]">Be the first to start the conversation!</p>
            </div>
        `;
    } else {
        list.innerHTML = '';
        comments.forEach(comment => {
            const card = document.createElement('div');
            card.className = 'flex gap-3 group';
            
            const initials = (comment.author || 'A')[1]?.toUpperCase() || 'A';
            const timeStr = new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            card.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0 border border-blue-500/20">${initials}</div>
                <div class="flex-1 flex flex-col gap-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-gray-200">${comment.author}</span>
                        <span class="text-[10px] text-gray-500 font-mono">${timeStr}</span>
                    </div>
                    <div class="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl rounded-tl-none p-3 text-[13px] text-gray-300 leading-relaxed break-words">
                        ${comment.content}
                    </div>
                </div>
            `;
            list.appendChild(card);
        });
    }

    if (window.lucide) window.lucide.createIcons();
    list.scrollTop = list.scrollHeight;

    // Handle sending
    if (!sendBtn.dataset.initialized) {
        sendBtn.onclick = async () => {
            const content = input.value.trim();
            if (!content) return;
            
            sendBtn.disabled = true;
            sendBtn.classList.add('opacity-50');
            
            const success = await state.addComment(state.activeProjectId, content);
            if (success) {
                input.value = '';
                renderComments();
            } else {
                alert("Failed to post comment. Make sure you are connected to Supabase.");
            }
            
            sendBtn.disabled = false;
            sendBtn.classList.remove('opacity-50');
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        };
        sendBtn.dataset.initialized = "true";
    }
}