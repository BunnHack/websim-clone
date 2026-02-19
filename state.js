import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './constants.js';

const isConfigured = SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' && SUPABASE_CONFIG.key !== 'YOUR_SUPABASE_ANON_KEY';

export const supabase = isConfigured 
    ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key)
    : null;

export const isSupabaseEnabled = () => !!supabase;

const INITIAL_ASSETS = [
    { name: 'index.html', content: '<!-- Initial Index -->', type: 'html', size: '0.1k' }
];

export const state = {
    projects: [
        {
            id: 'default',
            name: 'WebSim Clone',
            versions: [],
            assets: [...INITIAL_ASSETS],
            plugins: [],
            currentVersionIndex: -1,
            thumbnail: 'https://picsum.photos/seed/websim/200/120',
            timestamp: Date.now()
        }
    ],
    communityProjects: [
        { id: 'c1', name: 'Cyberpunk Shader', author: '@Neon', updatedAt: '2h', thumbnail: 'https://picsum.photos/seed/c1/400/250' },
        { id: 'c2', name: 'Retro OS Emulator', author: '@OldSchool', updatedAt: '5h', thumbnail: 'https://picsum.photos/seed/c2/400/250' },
        { id: 'c3', name: 'Fractal Explorer', author: '@MathWiz', updatedAt: '1d', thumbnail: 'https://picsum.photos/seed/c3/400/250' },
        { id: 'c4', name: 'Virtual Zen Garden', author: '@Peace', updatedAt: '2d', thumbnail: 'https://picsum.photos/seed/c4/400/250' },
        { id: 'c5', name: 'Voxel Engine Lab', author: '@Builder', updatedAt: '3d', thumbnail: 'https://picsum.photos/seed/c5/400/250' },
        { id: 'c6', name: 'AI Story Teller', author: '@BotMind', updatedAt: '4d', thumbnail: 'https://picsum.photos/seed/c6/400/250' },
        { id: 'c7', name: '8-bit Music Maker', author: '@Synth', updatedAt: '1w', thumbnail: 'https://picsum.photos/seed/c7/400/250' },
        { id: 'c8', name: 'Particle Sandbox', author: '@PhysX', updatedAt: '2w', thumbnail: 'https://picsum.photos/seed/c8/400/250' },
    ],
    activeProjectId: 'default',
    isSidebarExpandedOnHome: false,
    selectedProviderId: 'megallm',
    selectedModelId: 'openai-gpt-oss-20b',
    lastError: null,

    get activeProject() {
        return this.projects.find(p => p.id === this.activeProjectId) || this.projects[0];
    },

    // Backward compatibility getters
    get versions() { return this.activeProject.versions; },
    get assets() { return this.activeProject.assets; },
    get plugins() { 
        if (!this.activeProject.plugins) this.activeProject.plugins = [];
        return this.activeProject.plugins; 
    },
    get currentVersionIndex() { return this.activeProject.currentVersionIndex; },
    set currentVersionIndex(val) { this.activeProject.currentVersionIndex = val; },

    async addVersion(version) {
        let project = this.activeProject;
        
        // Ensure project exists in DB if Supabase is enabled before adding a version
        if (isSupabaseEnabled() && project.id === 'default') {
            const dbProj = await this.createNewProject(version.prompt.substring(0, 30));
            // CreateNewProject adds to the list and sets active ID, so we re-fetch the pointer
            project = this.activeProject;
            // Transfer any existing assets (like index.html) to the new project
            this.projects.find(p => p.id === 'default')?.assets?.forEach(a => {
                if (!project.assets.some(pa => pa.name === a.name)) project.assets.push(a);
            });
            this.projects = this.projects.filter(p => p.id !== 'default');
        }

        project.versions.push(version);
        project.currentVersionIndex = project.versions.length - 1;
        project.timestamp = Date.now();
        
        if (project.versions.length === 1 && (project.name === 'Untitled Project' || project.name === 'WebSim Clone')) {
            project.name = version.prompt.substring(0, 30) + (version.prompt.length > 30 ? '...' : '');
        }

        if (isSupabaseEnabled() && project.id !== 'default') {
            try {
                const { error: versionError } = await supabase.from('websim_versions').insert([{
                    project_id: project.id,
                    prompt: version.prompt,
                    code: version.code,
                    summary: version.summary,
                    stats: version.stats,
                    file_contents: version.fileContents
                }]);
                
                if (versionError) console.error("Supabase Version Sync Error:", versionError);

                const { error: projectError } = await supabase.from('websim_projects')
                    .update({ 
                        updated_at: new Date().toISOString(),
                        name: project.name 
                    })
                    .eq('id', project.id);
                
                if (projectError) console.error("Supabase Project Update Error:", projectError);
            } catch (err) {
                console.error("Supabase version sync failed", err);
            }
        }
    },

    async updateAsset(name, content, syncToDb = true) {
        let asset = this.assets.find(a => a.name === name);
        const ext = name.includes('.') ? name.split('.').pop() : 'txt';
        const project = this.activeProject;

        if (asset) {
            asset.content = content;
            asset.size = (content.length / 4).toFixed(1) + 'k';
            asset.type = asset.type === 'folder' ? 'folder' : (ext === name ? 'txt' : ext);
        } else {
            asset = {
                name,
                content,
                type: ext === name ? 'txt' : ext,
                size: (content.length / 4).toFixed(1) + 'k'
            };
            this.assets.push(asset);
        }

        if (syncToDb && isSupabaseEnabled() && project.id !== 'default' && asset.type !== 'folder') {
            try {
                const { error } = await supabase.from('websim_assets').upsert({
                    project_id: project.id,
                    name: name,
                    content: content,
                    type: asset.type,
                    size: asset.size,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'project_id, name' });
                
                if (error) console.error("Supabase Asset Sync Error:", error);
            } catch (err) {
                console.error("Supabase asset sync failed", err);
            }
        }
    },

    createAsset(name, type = 'file') {
        if (this.activeProject.assets.some(a => a.name === name)) {
            alert('An asset with this name already exists.');
            return null;
        }
        
        const extension = name.includes('.') ? name.split('.').pop() : 'txt';
        const newAsset = {
            name,
            content: type === 'folder' ? '' : `/* New ${extension} file */`,
            type: type === 'folder' ? 'folder' : extension,
            size: '0k'
        };
        
        this.activeProject.assets.push(newAsset);
        return newAsset;
    },

    moveAsset(fromIndex, toIndex, intoFolder = false) {
        const assets = this.activeProject.assets;
        const movedItem = assets[fromIndex];
        const targetItem = assets[toIndex];

        if (intoFolder && targetItem.type === 'folder') {
            const baseName = movedItem.name.split('/').pop();
            const oldPath = movedItem.name;
            const newPath = `${targetItem.name}/${baseName}`;
            
            if (newPath === oldPath) return;
            
            movedItem.name = newPath;

            if (movedItem.type === 'folder') {
                assets.forEach(a => {
                    if (a.name.startsWith(oldPath + '/')) {
                        a.name = a.name.replace(oldPath, newPath);
                    }
                });
            }
        } else {
            const [item] = assets.splice(fromIndex, 1);
            assets.splice(toIndex, 0, item);
        }
    },

    deleteAsset(name) {
        const assets = this.activeProject.assets;
        const index = assets.findIndex(a => a.name === name);
        if (index !== -1) {
            const asset = assets[index];
            if (asset.type === 'folder') {
                this.activeProject.assets = assets.filter(a => !a.name.startsWith(name + '/') && a.name !== name);
            } else {
                assets.splice(index, 1);
            }
            return true;
        }
        return false;
    },

    renameAsset(oldName, newName) {
        if (!newName || oldName === newName) return false;
        if (this.activeProject.assets.some(a => a.name === newName)) {
            alert('An asset with this name already exists.');
            return false;
        }
        const asset = this.assets.find(a => a.name === oldName);
        if (asset) {
            const oldPath = asset.name;
            asset.name = newName;
            // Update extension based on new name
            if (asset.type !== 'folder') {
                asset.type = newName.includes('.') ? newName.split('.').pop() : 'txt';
            }
            // If folder, update all child paths
            if (asset.type === 'folder') {
                this.assets.forEach(a => {
                    if (a.name.startsWith(oldPath + '/')) {
                        a.name = a.name.replace(oldPath, newName);
                    }
                });
            }
            return true;
        }
        return false;
    },

    toggleFolder(folderName) {
        if (!this.activeProject.collapsedFolders) {
            this.activeProject.collapsedFolders = new Set();
        }
        if (this.activeProject.collapsedFolders.has(folderName)) {
            this.activeProject.collapsedFolders.delete(folderName);
        } else {
            this.activeProject.collapsedFolders.add(folderName);
        }
    },

    isFolderCollapsed(folderName) {
        if (!this.activeProject.collapsedFolders) return false;
        return this.activeProject.collapsedFolders.has(folderName);
    },

    async createNewProject(name = 'Untitled Project') {
        const id = Math.random().toString(36).substring(2, 11);
        const newProj = {
            id,
            name,
            versions: [],
            assets: [...INITIAL_ASSETS],
            plugins: [],
            currentVersionIndex: -1,
            thumbnail: `https://picsum.photos/seed/${id}/200/120`,
            timestamp: Date.now(),
            author: '@Bunn'
        };

        if (isSupabaseEnabled()) {
            try {
                const { data, error } = await supabase
                    .from('websim_projects')
                    .insert([{ 
                        name: newProj.name, 
                        author: newProj.author, 
                        thumbnail: newProj.thumbnail,
                        is_public: true 
                    }])
                    .select();
                
                if (error) {
                    console.error("Supabase Project Create Error:", error);
                } else if (data && data[0]) {
                    newProj.id = data[0].id;
                }
            } catch (err) {
                console.warn("Supabase insert failed exception, falling back to local state", err);
            }
        }

        this.projects.unshift(newProj);
        this.activeProjectId = newProj.id;
        return newProj;
    },

    switchProject(id) {
        if (this.projects.some(p => p.id === id)) {
            this.activeProjectId = id;
            return true;
        }
        return false;
    },

    async loadProject(id) {
        // Check if project is already in local state
        let existing = this.projects.find(p => p.id === id);
        if (existing) {
            this.activeProjectId = id;
            return existing;
        }

        if (isSupabaseEnabled()) {
            try {
                // Fetch the project metadata
                const { data: projData } = await supabase.from('websim_projects').select('*').eq('id', id).single();
                if (!projData) return null;

                // Fetch its versions and assets
                const [versionsRes, assetsRes] = await Promise.all([
                    supabase.from('websim_versions').select('*').eq('project_id', id).order('created_at', { ascending: true }),
                    supabase.from('websim_assets').select('*').eq('project_id', id)
                ]);

                const versions = (versionsRes.data || []).map((v, idx) => ({
                    id: idx + 1,
                    prompt: v.prompt,
                    code: v.code,
                    summary: v.summary,
                    stats: v.stats,
                    timestamp: new Date(v.created_at).getTime(),
                    files: v.file_contents ? Object.keys(v.file_contents) : [],
                    fileContents: v.file_contents || {}
                }));

                const assets = (assetsRes.data || []).map(a => ({
                    name: a.name,
                    content: a.content,
                    type: a.type,
                    size: a.size
                }));

                // Fallback: If assets are empty but we have versions, reconstruct index.html
                if (assets.length === 0 && versions.length > 0) {
                    const latest = versions[versions.length - 1];
                    assets.push({
                        name: 'index.html',
                        content: latest.code,
                        type: 'html',
                        size: (latest.code.length / 4).toFixed(1) + 'k'
                    });
                }

                const newProj = {
                    id: projData.id,
                    name: projData.name,
                    author: projData.author,
                    thumbnail: projData.thumbnail,
                    versions: versions,
                    assets: assets,
                    plugins: [],
                    currentVersionIndex: versions.length - 1,
                    timestamp: new Date(projData.updated_at).getTime()
                };

                this.projects.unshift(newProj);
                this.activeProjectId = id;
                return newProj;
            } catch (err) {
                console.error("Load project failed:", err);
            }
        }
        return null;
    },

    async addComment(projectId, content, author = '@Bunn') {
        if (!isSupabaseEnabled()) return;
        try {
            const { data, error } = await supabase
                .from('websim_comments')
                .insert([{ project_id: projectId, content, author }])
                .select();
            return data ? data[0] : null;
        } catch (err) {
            console.error("Add comment failed:", err);
        }
    },

    async loadComments(projectId) {
        if (!isSupabaseEnabled()) return [];
        try {
            const { data, error } = await supabase
                .from('websim_comments')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: true });
            return data || [];
        } catch (err) {
            console.error("Load comments failed:", err);
            return [];
        }
    },

    deleteProject(id) {
        const index = this.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.projects.splice(index, 1);
            if (this.projects.length === 0) {
                this.createNewProject();
            } else {
                this.activeProjectId = this.projects[0].id;
            }
            return true;
        }
        return false;
    }
};