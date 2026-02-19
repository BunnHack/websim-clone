import { elements } from './dom.js';
import { state } from './state.js';
import { updatePreview } from './preview-utils.js';

let editor = null;
let languageCompartment = null;
let currentEditingAsset = null;
let originalContent = null;
let isInternalUpdate = false;

// Pre-load essential editor components
let htmlLang, jsLang, cssLang;

async function loadDependencies() {
    if (htmlLang) return;
    const [h, j, c] = await Promise.all([
        import('@codemirror/lang-html'),
        import('@codemirror/lang-javascript'),
        import('@codemirror/lang-css')
    ]);
    htmlLang = h.html;
    jsLang = j.javascript;
    cssLang = c.css;
}

async function initEditor() {
    if (editor) return editor;
    
    const { EditorView, basicSetup } = await import('codemirror');
    const { Compartment } = await import('@codemirror/state');
    const { oneDark } = await import('@codemirror/theme-one-dark');

    await loadDependencies();
    languageCompartment = new Compartment();

    editor = new EditorView({
        doc: "",
        extensions: [
            basicSetup,
            languageCompartment.of(htmlLang()),
            oneDark,
            EditorView.lineWrapping,
            EditorView.updateListener.of((v) => {
                if (v.docChanged && !isInternalUpdate) {
                    const content = v.state.doc.toString();
                    const tokens = Math.ceil(content.length / 4);
                    if (elements.editorTokens) elements.editorTokens.textContent = `Tokens: ${(tokens/1000).toFixed(1)}k`;
                    
                    if (elements.editorPreviewToggle?.checked && currentEditingAsset) {
                        state.updateAsset(currentEditingAsset, content);
                        updatePreview();
                    }
                }
            })
        ],
        parent: elements.editorContainer
    });
    return editor;
}

export async function openAssetEditor(assetName) {
    const asset = state.assets.find(a => a.name === assetName);
    if (!asset || asset.type === 'folder') return;

    currentEditingAsset = assetName;
    originalContent = asset.content;

    elements.editorView.classList.remove('hidden');
    elements.chatInputArea.classList.add('hidden');
    
    const view = await initEditor();
    
    const extension = assetName.split('.').pop().toLowerCase();
    let langSupport = htmlLang();
    if (extension === 'js' || extension === 'ts') langSupport = jsLang();
    else if (extension === 'css') langSupport = cssLang();

    // Render Tabs
    elements.editorTabs.innerHTML = '';
    state.assets.filter(a => a.type !== 'folder').forEach(a => {
        const isActive = a.name === assetName;
        const tab = document.createElement('div');
        tab.className = `px-4 h-full flex items-center text-[12px] font-medium cursor-pointer border-r border-[#2a2a2a] transition-colors ${isActive ? 'text-blue-400 bg-[#0f0f0f]' : 'text-gray-500 bg-[#1a1a1a] hover:text-gray-300'}`;
        tab.textContent = a.name.split('/').pop();
        tab.onclick = () => openAssetEditor(a.name);
        elements.editorTabs.appendChild(tab);
    });

    isInternalUpdate = true;
    view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: asset.content || "" },
        effects: languageCompartment.reconfigure(langSupport)
    });
    isInternalUpdate = false;

    const tokens = Math.ceil((asset.content || "").length / 4);
    if (elements.editorTokens) elements.editorTokens.textContent = `Tokens: ${(tokens/1000).toFixed(1)}k`;

    // Static event handlers (only assigned once)
    if (!elements.editorClose.dataset.initialized) {
        elements.editorClose.onclick = () => {
            elements.editorView.classList.add('hidden');
            elements.chatInputArea.classList.remove('hidden');
        };
        elements.editorSave.onclick = async () => {
            const newCode = editor.state.doc.toString();
            if (newCode !== originalContent) {
                state.updateAsset(currentEditingAsset, newCode);
                const indexAsset = state.assets.find(a => a.name === 'index.html');
                const newVersion = {
                    id: state.versions.length + 1,
                    prompt: `Manual edit: ${currentEditingAsset}`,
                    code: indexAsset ? indexAsset.content : newCode,
                    summary: `Manually updated ${currentEditingAsset} using the built-in code editor.`,
                    timestamp: Date.now(),
                    files: [currentEditingAsset],
                    fileContents: Object.fromEntries(state.assets.filter(a => a.type !== 'folder').map(a => [a.name, a.content])),
                    stats: {
                        added: Math.abs(newCode.split('\n').length - (originalContent || "").split('\n').length),
                        removed: 0,
                        tokens: (newCode.length / 4 / 1000).toFixed(1) + 'k',
                        time: '0s',
                        model: 'manual-edit'
                    }
                };
                newVersion.fileContents[currentEditingAsset] = newCode;
                state.addVersion(newVersion);
                const { renderVersions } = await import('./versions-renderer.js');
                renderVersions(() => {}); 
            }
            updatePreview();
            elements.editorClose.onclick();
        };
        elements.editorClose.dataset.initialized = "true";
    }
}