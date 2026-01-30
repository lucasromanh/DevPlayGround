
import React, { useState, useEffect, useRef } from 'react';
import { ProjectState, CodeFiles, EnvVariables, FrameworkType } from '../types';

interface FrontendModuleProps {
  state: ProjectState['frontend'];
  onUpdate: (updates: Partial<ProjectState['frontend']>) => void;
  backendState: ProjectState['backend'];
  dbState: ProjectState['database'];
  env: EnvVariables;
}

const FrontendModule: React.FC<FrontendModuleProps> = ({ state, onUpdate, backendState, dbState, env }) => {
  const [logs, setLogs] = useState<string[]>(['Entorno listo para Lucas Roman...']);
  const [splitWidth, setSplitWidth] = useState(50); // Porcentaje
  const isResizing = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startResizing = () => { isResizing.current = true; document.body.style.cursor = 'col-resize'; };
  const stopResizing = () => { isResizing.current = false; document.body.style.cursor = 'default'; };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const offsetLeft = 320;
    const newWidth = ((e.clientX - offsetLeft) / (window.innerWidth - offsetLeft)) * 100;
    if (newWidth > 15 && newWidth < 85) setSplitWidth(newWidth);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, []);

  const handleFrameworkChange = (fw: FrameworkType) => {
    let newFiles: CodeFiles = {};
    let newActive = '';
    
    if (fw === 'Vanilla JS') {
      newFiles = {
        'index.html': `<div id="root"></div>`,
        'styles.css': `body { background: #0d1117; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }`,
        'script.js': `document.getElementById('root').innerHTML = '<h1>Hola Lucas</h1>';`
      };
      newActive = 'index.html';
    } else if (fw === 'React v18.2') {
      newFiles = {
        'index.html': `<div id="root"></div>`,
        'styles.css': `body { background: #0d1117; color: white; padding: 2rem; font-family: sans-serif; }`,
        'App.js': `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="p-10 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl">\n      <h1 className="text-4xl text-blue-400 font-black">REACT MODE</h1>\n      <p className="mt-4 text-slate-400 font-medium">Creado por Lucas Roman</p>\n    </div>\n  );\n}`
      };
      newActive = 'App.js';
    }
    onUpdate({ framework: fw, files: newFiles, activeFile: newActive });
  };

  const updatePreview = () => {
    if (!iframeRef.current) return;
    const { files, framework } = state;
    let content = '';

    if (framework === 'React v18.2') {
      content = `<html><head><script src="https://cdn.tailwindcss.com"></script><style>${files['styles.css'] || ''}</style><script src="https://unpkg.com/react@18/umd/react.development.js"></script><script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script></head><body>${files['index.html'] || ''}<script type="text/babel">try { ${files['App.js']?.replace(/import.*from.*;/g, '') || ''} const root=ReactDOM.createRoot(document.getElementById('root')); root.render(<App />); } catch(e){ console.error(e); }</script></body></html>`;
    } else {
      content = `<html><head><script src="https://cdn.tailwindcss.com"></script><style>${files['styles.css'] || ''}</style></head><body>${files['index.html'] || ''}<script>try { ${files['script.js'] || ''} } catch(e){ console.error(e); }</script></body></html>`;
    }

    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (doc) { doc.open(); doc.write(content); doc.close(); }
  };

  useEffect(() => {
    const timer = setTimeout(updatePreview, 600);
    return () => clearTimeout(timer);
  }, [state.files, state.framework]);

  const highlight = (code: string, fileName: string) => {
    if (!code) return '';
    let h = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (fileName.endsWith('.html')) {
      h = h.replace(/(&lt;\/?[a-z1-6]+)(&gt;|\s)/gi, '<span class="text-blue-400">$1</span>$2')
           .replace(/(\w+)="([^"]*)"/g, '<span class="text-emerald-400">$1</span>=<span class="text-amber-200">"$2"</span>');
    } else if (fileName.endsWith('.css')) {
      h = h.replace(/([^{]+)\{/g, '<span class="text-yellow-200">$1</span>{')
           .replace(/([\w-]+):([^;]+);/g, '<span class="text-sky-300">$1</span>:<span class="text-emerald-300">$2</span>;');
    } else {
      h = h.replace(/\b(const|let|var|function|return|if|else|import|export|from|default|class|new|async|await)\b/g, '<span class="text-purple-400 font-bold">$1</span>')
           .replace(/\b(true|false|null|undefined)\b/g, '<span class="text-orange-400">$1</span>')
           .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="text-emerald-400">$1</span>')
           .replace(/\b(\d+)\b/g, '<span class="text-sky-300">$1</span>');
    }
    return h;
  };

  const syncScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className="flex h-full w-full bg-background-dark overflow-hidden">
      {/* Editor Side */}
      <div className="flex flex-col h-full bg-editor-dark border-r border-slate-800" style={{ width: `${splitWidth}%` }}>
        <div className="h-10 border-b border-slate-800 bg-sidebar-dark flex items-center justify-between px-4 shrink-0">
          <div className="flex gap-4 items-center">
            <select 
              value={state.framework}
              onChange={(e) => handleFrameworkChange(e.target.value as any)}
              className="bg-slate-800 border-none text-[9px] font-bold rounded py-1 px-2 text-slate-300 cursor-pointer outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option>Vanilla JS</option>
              <option>React v18.2</option>
            </select>
            <div className="flex gap-1.5 ml-2">
              {Object.keys(state.files).map(f => (
                <button
                  key={f}
                  onClick={() => onUpdate({ activeFile: f })}
                  className={`px-3 py-1 text-[9px] font-bold rounded-lg transition-all ${state.activeFile === f ? 'bg-primary/20 text-primary border border-primary/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[8px] font-bold text-slate-600 uppercase">Live Engine</span>
          </div>
        </div>

        <div className="flex-1 relative flex overflow-hidden">
          <div className="w-10 bg-sidebar-dark/10 border-r border-slate-800/50 flex flex-col items-center py-4 text-[9px] font-mono text-slate-700 select-none shrink-0 pointer-events-none">
            {Array.from({ length: 100 }).map((_, i) => <span key={i} className="h-5 leading-relaxed">{i+1}</span>)}
          </div>
          <div className="relative flex-1 overflow-hidden">
            <pre 
              ref={preRef}
              className="absolute inset-0 p-4 m-0 text-[13px] font-mono whitespace-pre leading-relaxed z-0 text-slate-400 pointer-events-none"
              dangerouslySetInnerHTML={{ __html: highlight(state.files[state.activeFile] || '', state.activeFile) }}
            />
            <textarea
              ref={textareaRef}
              value={state.files[state.activeFile] || ''}
              onChange={(e) => onUpdate({ files: { ...state.files, [state.activeFile]: e.target.value } })}
              onScroll={syncScroll}
              className="absolute inset-0 w-full h-full bg-transparent p-4 outline-none text-[13px] font-mono text-transparent caret-white resize-none leading-relaxed z-10 selection:bg-primary/20"
              spellCheck={false}
              wrap="off"
            />
          </div>
        </div>

        <div className="h-28 bg-black/40 border-t border-slate-800 shrink-0">
          <div className="px-3 py-1.5 bg-sidebar-dark border-b border-slate-800 flex justify-between items-center">
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[12px]">terminal</span> Terminal (Lucas)
            </span>
            <button onClick={() => setLogs([])} className="text-[8px] font-bold text-slate-700 hover:text-slate-400">CLEAR</button>
          </div>
          <div className="p-3 font-mono text-[10px] overflow-y-auto h-[calc(100%-25px)] text-primary/60 custom-scrollbar">
            {logs.map((l, i) => <div key={i} className="mb-0.5"><span className="text-slate-800 mr-2">»</span>{l}</div>)}
          </div>
        </div>
      </div>

      {/* Resizer */}
      <div 
        onMouseDown={startResizing}
        className="w-1 bg-slate-800 hover:bg-primary/50 transition-all cursor-col-resize shrink-0 z-40 relative group"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-12 bg-slate-900 border border-slate-800 rounded-full hidden group-hover:flex items-center justify-center pointer-events-none">
          <span className="material-symbols-outlined text-white text-[12px]">drag_indicator</span>
        </div>
      </div>

      {/* Preview Side */}
      <div className="flex flex-col h-full bg-slate-950" style={{ width: `${100 - splitWidth}%` }}>
        <div className="h-10 bg-sidebar-dark border-b border-slate-800 flex items-center px-4 gap-4 shrink-0">
          <div className="flex-1 bg-editor-dark rounded border border-slate-800 h-6 flex items-center px-3 gap-2">
            <span className="material-symbols-outlined text-slate-700 text-[12px]">public</span>
            <span className="text-[9px] text-slate-700 font-mono truncate">lucas-preview.internal</span>
          </div>
          <button onClick={updatePreview} className="material-symbols-outlined text-slate-500 hover:text-primary transition-colors text-[18px]">refresh</button>
        </div>
        <div className="flex-1 p-6 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-slate-900/50">
          <div className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-800/50 animate-in zoom-in duration-500">
             <iframe ref={iframeRef} title="preview" className="w-full h-full border-none" />
          </div>
          <div className="absolute bottom-10 right-10 flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity pointer-events-none">
             <span className="text-[10px] font-bold text-slate-500 uppercase">DevPlayground Preview</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrontendModule;
