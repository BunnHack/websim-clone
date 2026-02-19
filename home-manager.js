import { elements } from './dom.js';
import { state } from './state.js';
import { renderCommunityProjects } from './renderer.js';
import { handleProjectSwitch } from './project-manager.js';
import { supabase, isSupabaseEnabled } from './state.js';

export async function initializeHome() {
    try {
        const response = await fetch('home.html');
        const html = await response.text();
        elements.homeView.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();

        // If Supabase is connected, fetch real projects
        if (isSupabaseEnabled()) {
            const { data, error } = await supabase
                .from('websim_projects')
                .select('*')
                .eq('is_public', true)
                .order('updated_at', { ascending: false });

            if (data && !error) {
                state.communityProjects = data.map(p => ({
                    id: p.id,
                    name: p.name,
                    author: p.author || '@Anonymous',
                    updatedAt: new Date(p.updated_at).toLocaleDateString(),
                    thumbnail: p.thumbnail || `https://picsum.photos/seed/${p.id}/400/250`
                }));
            }
        }

        const communityGrid = elements.homeView.querySelector('#community-grid');
        if (communityGrid) {
            renderCommunityProjects(async (proj) => {
                // Load the existing project data from Supabase
                const loaded = await state.loadProject(proj.id);
                if (loaded) {
                    handleProjectSwitch(loaded.id);
                } else {
                    // Fallback to fork if load fails
                    await state.createNewProject(proj.name);
                    handleProjectSwitch(state.activeProjectId);
                }
            }, communityGrid);
        }
    } catch (err) {
        console.error("Failed to load home page content", err);
    }
}