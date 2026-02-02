import React, { useState, useEffect, useRef } from 'react';
import { ProjectState, CodeFiles, EnvVariables, FrameworkType } from '../types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import FrameworkMigrationModal from '@/components/FrameworkMigrationModal';
import { migrateVanillaToReact, migrateReactToVanilla } from '@/utils/frameworkMigration';
import Prism from 'prismjs';

// Import Prism components
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';

interface FrontendModuleProps {
  state: ProjectState['frontend'];
  onUpdate: (updates: Partial<ProjectState['frontend']>) => void;
  backendState: ProjectState['backend'];
  dbState: ProjectState['database'];
  env: EnvVariables;
  sidebarVisible?: boolean;
  onToggleSidebar?: () => void;
}

const FrontendModule: React.FC<FrontendModuleProps> = ({
  state, onUpdate, backendState, dbState, env, sidebarVisible = true, onToggleSidebar
}) => {
  const [logs, setLogs] = useState<string[]>(['Entorno listo para Lucas Roman...']);
  const [splitWidth, setSplitWidth] = useState(50); // Porcentaje
  const [isResizingState, setIsResizingState] = useState(false);
  const [lintError, setLintError] = useState<string | null>(null);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [pendingFramework, setPendingFramework] = useState<FrameworkType | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startResizing = () => {
    isResizing.current = true;
    setIsResizingState(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const stopResizing = () => {
    isResizing.current = false;
    setIsResizingState(false);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    if (newWidth > 10 && newWidth < 90) setSplitWidth(newWidth);
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
    // Si el framework es el mismo, no hacer nada
    if (fw === state.framework) return;

    // Mostrar modal de migración
    setPendingFramework(fw);
    setShowMigrationModal(true);
  };

  const confirmMigration = () => {
    if (!pendingFramework) return;

    const fw = pendingFramework;
    let newFiles: CodeFiles = {};
    let newActive = '';

    try {
      // Intentar migrar el código existente
      if (fw === 'React v18.2' && state.framework === 'Vanilla JS') {
        // Migrar de Vanilla a React
        newFiles = migrateVanillaToReact(state.files);
        newActive = 'App.js';
        setLogs(prev => [...prev, '✅ Código migrado de Vanilla JS a React v18.2']);
      } else if (fw === 'Vanilla JS' && state.framework === 'React v18.2') {
        // Migrar de React a Vanilla
        newFiles = migrateReactToVanilla(state.files);
        newActive = 'index.html';
        setLogs(prev => [...prev, '✅ Código migrado de React v18.2 a Vanilla JS']);
      } else {
        // Fallback: usar boilerplate
        throw new Error('Migración no soportada');
      }
    } catch (error) {
      // Si falla la migración, usar boilerplate
      setLogs(prev => [...prev, '⚠️ No se pudo migrar automáticamente. Usando template base.']);

      if (fw === 'Vanilla JS') {
        newFiles = {
          'index.html': `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playground de Lucas Roman</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="badge">PROYECTO ACTIVO</div>
      <h1 id="titulo">Hola Mundo</h1>
      <p id="mensaje">Este es un playground real de Lucas Roman.</p>
      <button id="btn-lucas">EJECUTAR ACCIÓN</button>
    </div>
  </div>
  
  <script src="script.js"></script>
</body>
</html>`,
          'styles.css': state.files['styles.css'] || `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #0d1117;
  color: white;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
}

.container {
  padding: 2rem;
}

.card {
  background: #161b22;
  border: 1px solid #30363d;
  padding: 3rem;
  border-radius: 24px;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
}

.badge {
  background: #13a4ec20;
  color: #13a4ec;
  font-size: 10px;
  font-weight: 900;
  padding: 6px 14px;
  border-radius: 100px;
  display: inline-block;
  margin-bottom: 1.5rem;
  letter-spacing: 1px;
}

#titulo {
  font-size: 3rem;
  font-weight: 900;
  margin: 0 0 1rem 0;
  background: linear-gradient(to right, #fff, #13a4ec);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

#mensaje {
  color: #8b949e;
  font-size: 1rem;
  margin-bottom: 2rem;
}

button {
  background: #13a4ec;
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;
}

button:hover {
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(19, 164, 236, 0.5);
}`,
          'script.js': `// Lógica y acciones aquí
const boton = document.getElementById('btn-lucas');
const texto = document.getElementById('mensaje');
const titulo = document.getElementById('titulo');

boton.addEventListener('click', () => {
  texto.textContent = '¡Has interactuado con el motor de Lucas!';
  texto.style.color = '#a9dc76';
  titulo.style.transform = 'scale(1.1)';
  
  setTimeout(() => {
    titulo.style.transform = 'scale(1)';
  }, 200);
  
  console.log('✅ Acción ejecutada correctamente');
});`
        };
        newActive = 'index.html';
      } else if (fw === 'React v18.2') {
        newFiles = {
          'index.html': `<div id="root"></div>`,
          'styles.css': state.files['styles.css'] || `body { 
  background: #0d1117; 
  color: white; 
  padding: 2rem; 
  font-family: 'Inter', sans-serif; 
}`,
          'App.js': `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-12 bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl max-w-md mx-auto mt-20">
      <h1 className="text-5xl text-blue-400 font-black mb-4">REACT v18</h1>
      <p className="text-slate-400 text-lg mb-6">Contador: <span className="font-bold text-white">{count}</span></p>
      <button 
        onClick={() => setCount(count + 1)}
        className="w-full px-8 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-colors"
      >
        Aumentar
      </button>
      <div className="mt-8 pt-8 border-t border-slate-800 text-xs text-slate-600 uppercase font-bold tracking-widest text-center">
        DevPlayground por Lucas Roman
      </div>
    </div>
  );
}`
        };
        newActive = 'App.js';
      }
    }

    onUpdate({ framework: fw, files: newFiles, activeFile: newActive });
    setShowMigrationModal(false);
    setPendingFramework(null);
  };

  const cancelMigration = () => {
    setShowMigrationModal(false);
    setPendingFramework(null);
  };

  const updatePreview = () => {
    if (!iframeRef.current) return;
    const { files, framework } = state;
    let content = '';

    if (framework === 'Vanilla JS') {
      let html = files['index.html'] || '';
      const css = files['styles.css'] || '';
      const js = files['script.js'] || '';

      // Limpiar etiquetas existentes para evitar duplicados si el usuario las puso
      html = html.replace(/<link\s+rel=["']stylesheet["']\s+href=["']styles\.css["']\s*\/?>/gi, '');
      html = html.replace(/<script\s+src=["']script\.js["']\s*><\/script>/gi, '');

      // Inyectar CSS en el head o al principio
      const styleTag = `<style>${css}</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}</head>`);
      } else if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${styleTag}`);
      } else {
        html = styleTag + html;
      }

      // Inyectar JS al final del body o al final del documento
      const scriptTag = `<script>
        try { 
          ${js} 
        } catch(e) { 
          console.error(e); 
          window.parent.postMessage({type:'error', msg: e.message}, '*'); 
        }
      </script>`;

      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}</body>`);
      } else {
        html = html + scriptTag;
      }

      content = html;
    } else if (framework === 'React v18.2') {
      // ... (React injection logic remains same or improved)
      let appCode = files['App.js'] || '';
      appCode = appCode.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
      appCode = appCode.replace(/import\s+['"].*?['"];?\s*/g, '');
      appCode = appCode.replace(/export\s+default\s+/g, '');

      content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${files['styles.css'] || ''}</style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  ${files['index.html'] || '<div id="root"></div>'}
  <script type="text/babel">
    try { 
      const { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } = React;
      ${appCode}
      const root = ReactDOM.createRoot(document.getElementById('root')); 
      root.render(<App />); 
    } catch(e) { 
      console.error(e); 
      window.parent.postMessage({type:'error', msg: e.message}, '*'); 
    }
  </script>
</body>
</html>`;
    }

    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(content);
      doc.close();
    }
  };

  useEffect(() => {
    const timer = setTimeout(updatePreview, 600);
    return () => clearTimeout(timer);
  }, [state.files, state.framework]);

  // Listen for errors from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'error') {
        setLintError(e.data.msg);
        setLogs(prev => [...prev.slice(-20), `Error: ${e.data.msg}`]);
      } else {
        setLintError(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const highlight = (code: string, fileName: string) => {
    if (!code) return '';
    let lang = 'javascript';
    if (fileName.endsWith('.html')) lang = 'markup';
    if (fileName.endsWith('.css')) lang = 'css';
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) lang = 'jsx';

    return Prism.highlight(code, Prism.languages[lang], lang);
  };

  const syncScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div ref={containerRef} className="flex h-full w-full bg-background-dark overflow-hidden">
      {/* Tool Sidebar (Framework & Files) */}
      <aside className={`flex flex-col h-full bg-sidebar-dark border-r border-slate-800 transition-all duration-300 ease-in-out ${sidebarVisible ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="h-10 border-b border-slate-800 bg-sidebar-dark flex items-center px-4 shrink-0">
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Herramientas UI</h3>
        </div>

        <div className="p-4 space-y-6 flex-1 overflow-auto">
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Framework</label>
            <Select
              value={state.framework}
              onValueChange={(val) => handleFrameworkChange(val as any)}
            >
              <SelectTrigger className="w-full h-9 bg-editor-dark border-slate-800 text-[11px] font-bold text-slate-200">
                <SelectValue placeholder="Framework" />
              </SelectTrigger>
              <SelectContent className="bg-sidebar-dark border-slate-800 text-slate-200">
                <SelectItem value="Vanilla JS">Vanilla JS</SelectItem>
                <SelectItem value="React v18.2">React v18.2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Archivos</label>
            <div className="flex flex-col gap-1">
              {Object.keys(state.files).map(f => (
                <Button
                  key={f}
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdate({ activeFile: f })}
                  className={`justify-start h-9 px-3 text-[11px] font-bold rounded-xl transition-all ${state.activeFile === f ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <span className="material-symbols-outlined text-sm mr-2">description</span>
                  {f}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-black/10">
          <div className="flex items-center gap-2">
            <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[9px] font-bold text-slate-600 uppercase">Motor de Renderizado</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace (Split Editor + Preview) */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="h-10 border-b border-slate-800 bg-sidebar-dark flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="h-7 w-7 p-0 hover:bg-slate-800 text-slate-500 hover:text-white"
            >
              <span className="material-symbols-outlined text-[20px]">
                {sidebarVisible ? 'vertical_split' : 'format_indent_increase'}
              </span>
            </Button>
            <span className="text-[11px] font-bold text-slate-500 font-mono truncate">{state.activeFile}</span>
          </div>

          {lintError && (
            <Badge variant="destructive" className="h-5 text-[8px] font-black px-2 uppercase tracking-tighter shadow-lg shadow-destructive/20 border-none">
              Syntax Error
            </Badge>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Editor Half */}
          <div className="flex flex-col h-full bg-editor-dark border-r border-slate-800" style={{ width: `${splitWidth}%` }}>
            <div className="flex-1 relative flex overflow-hidden group/editor">
              <div className="w-10 bg-sidebar-dark/10 border-r border-slate-800/50 py-4 select-none shrink-0 pointer-events-none flex flex-col items-center text-[9px] font-mono text-slate-700">
                {Array.from({ length: 50 }).map((_, i) => <span key={i} className="h-5 leading-relaxed">{i + 1}</span>)}
              </div>

              <div className="relative flex-1 overflow-hidden font-mono bg-[#010409]">
                <pre
                  ref={preRef}
                  className="absolute inset-0 p-4 m-0 text-[13px] whitespace-pre-wrap break-all leading-relaxed z-0 text-slate-300 pointer-events-none overflow-hidden"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  dangerouslySetInnerHTML={{ __html: highlight(state.files[state.activeFile] || '', state.activeFile) }}
                />
                <textarea
                  ref={textareaRef}
                  value={state.files[state.activeFile] || ''}
                  onChange={(e) => onUpdate({ files: { ...state.files, [state.activeFile]: e.target.value } })}
                  onScroll={syncScroll}
                  className="absolute inset-0 w-full h-full bg-transparent p-4 outline-none text-[13px] text-transparent caret-white resize-none leading-relaxed z-10 selection:bg-primary/30 overflow-auto whitespace-pre-wrap break-all"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="h-32 bg-black/40 border-t border-slate-800 shrink-0 flex flex-col">
              <div className="px-3 py-1.5 bg-sidebar-dark border-b border-slate-800 flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-[12px]">terminal</span> Terminal (Lucas)
                </span>
                <button onClick={() => setLogs([])} className="text-[8px] font-bold text-slate-700 hover:text-slate-400">CLEAR</button>
              </div>
              <ScrollArea className="flex-1 p-3 font-mono text-[10px] text-primary/60">
                {logs.map((l, i) => <div key={i} className="mb-0.5"><span className="text-slate-800 mr-2">»</span>{l}</div>)}
              </ScrollArea>
            </div>
          </div>

          {/* Resizer */}
          <div
            onMouseDown={startResizing}
            className={`w-1 transition-all cursor-col-resize shrink-0 z-40 relative group ${isResizingState ? 'bg-primary' : 'bg-slate-800 hover:bg-primary/50'}`}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-12 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center pointer-events-none group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-white text-[12px]">drag_indicator</span>
            </div>
          </div>

          {/* Preview Half */}
          <div className="flex-1 flex flex-col h-full bg-slate-950 relative">
            {isResizingState && <div className="absolute inset-0 z-50 cursor-col-resize" />}
            <div className="h-10 bg-sidebar-dark border-b border-slate-800 flex items-center px-4 gap-4 shrink-0">
              <div className="flex-1 bg-editor-dark rounded border border-slate-800 h-6 flex items-center px-3 gap-2">
                <span className="material-symbols-outlined text-slate-700 text-[12px]">public</span>
                <span className="text-[9px] text-slate-700 font-mono truncate">lucas-preview.internal</span>
              </div>
              <button onClick={updatePreview} className="material-symbols-outlined text-slate-500 hover:text-primary transition-colors text-[18px]">refresh</button>
            </div>
            <div className="flex-1 p-6 relative">
              <div className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-800/50">
                <iframe ref={iframeRef} title="preview" className="w-full h-full border-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Modal */}
      {showMigrationModal && pendingFramework && (
        <FrameworkMigrationModal
          fromFramework={state.framework}
          toFramework={pendingFramework}
          onConfirm={confirmMigration}
          onCancel={cancelMigration}
        />
      )}
    </div>
  );
};

export default FrontendModule;
