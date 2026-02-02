import React, { useState, useRef, useEffect } from 'react';
import { ProjectState, BackendRoute } from '../types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { BackendEngine } from '../utils/backendEngine';
import { sanitizeCode } from '../utils/codeSanitizer';

interface BackendModuleProps {
  state: ProjectState['backend'];
  dbState: ProjectState['database'];
  env: ProjectState['envVariables'];
  onUpdate: (updates: Partial<ProjectState['backend']>) => void;
  sidebarVisible?: boolean;
  onToggleSidebar?: () => void;
}

const BackendModule: React.FC<BackendModuleProps> = ({
  state,
  dbState,
  env,
  onUpdate,
  sidebarVisible = true,
  onToggleSidebar
}) => {
  const [activeFile, setActiveFile] = useState<string>(Object.keys(state.files)[0] || 'main.py');
  const [activeView, setActiveView] = useState<'editor' | 'tester'>('editor');
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [requestUrl, setRequestUrl] = useState('/api/users');
  const [requestBody, setRequestBody] = useState('{\n  "name": "Lucas",\n  "email": "lucas@example.com"\n}');
  const [response, setResponse] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [testerTab, setTesterTab] = useState<'body' | 'headers' | 'logs'>('body');
  const [terminalOutput, setTerminalOutput] = useState<any[]>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [splitWidth, setSplitWidth] = useState(60);
  const [isResizing, setIsResizing] = useState(false);
  const [waitingInput, setWaitingInput] = useState<{ prompt: string; resolve: (val: string) => void } | null>(null);
  const [modal, setModal] = useState<{
    show: boolean;
    title: string;
    description: string;
    placeholder: string;
    value: string;
    type: 'input' | 'confirm';
    onConfirm: (val: string) => void;
    onCancel?: () => void;
  }>({
    show: false,
    title: '',
    description: '',
    placeholder: '',
    value: '',
    type: 'input',
    onConfirm: () => { }
  });

  const engineRef = useRef<BackendEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const safeFiles = state.files || {};
  const safeEndpoints = state.endpoints || [];

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput]);

  const handleNuclearClean = () => {
    let hasChanges = false;
    const newFiles = { ...safeFiles };

    Object.keys(newFiles).forEach(fileName => {
      const original = newFiles[fileName];
      const cleaned = sanitizeCode(original);
      if (cleaned !== original) {
        newFiles[fileName] = cleaned;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      onUpdate({ files: newFiles });
      setTerminalOutput(prev => [...prev, { type: 'success', msg: '✨ ¡ARCHIVOS LIMPIADOS DE BASURA!', time: new Date().toLocaleTimeString() }]);
    } else {
      setTerminalOutput(prev => [...prev, { type: 'info', msg: 'El proyecto ya parece estar limpio.', time: new Date().toLocaleTimeString() }]);
    }
  };

  // Limpieza automática de archivos corruptos
  useEffect(() => {
    let hasChanges = false;
    const newFiles = { ...safeFiles };

    Object.keys(newFiles).forEach(fileName => {
      const original = newFiles[fileName];
      // Detección sensible: si tiene text-, font-, span o carácteres huerfanos tipo ">
      if (original && (
        original.includes('text-') ||
        original.includes('font-') ||
        original.includes('">') ||
        original.includes('">') ||
        original.includes('<span') ||
        original.includes('#"') ||
        original.includes('&lt;')
      )) {
        const cleaned = sanitizeCode(original);
        if (cleaned !== original) {
          newFiles[fileName] = cleaned;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      onUpdate({ files: newFiles });
    }
  }, [state.files]);

  // Pantilla por defecto cuando cambia el runtime
  useEffect(() => {
    const runtimeFiles: Record<string, { name: string, code: string }> = {
      'Python': { name: 'main.py', code: 'print("Hola desde Python!")\nnombre = input("¿Cómo te llamas? ")\nprint(f"Hola {nombre}!")' },
      'Node.js': { name: 'index.js', code: 'console.log("Hola desde Node.js!");\n\n// Ejemplo de API\nfunction handle(req, res) {\n  res.json({ message: "Éxito" });\n}' },
      'Java': { name: 'Main.java', code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hola desde Java!");\n    }\n}' },
      'C': { name: 'main.c', code: '#include <stdio.h>\n\nint main() {\n    printf("Hola desde C!\\n");\n    return 0;\n}' },
      'C++': { name: 'main.cpp', code: '#include <iostream>\n\nint main() {\n    std::cout << "Hola desde C++!" << std::endl;\n    return 0;\n}' }
    };

    const template = runtimeFiles[state.runtime as string];
    if (template && !safeFiles[template.name]) {
      // Si no existe el archivo base para este runtime, lo sugerimos o agregamos
      // Para no ser invasivos, solo verificamos si la lista de archivos está vacía o si el usuario acaba de cambiar el runtime
    }
  }, [state.runtime]);

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };
  const highlightText = (code: string, fileName: string) => {
    if (!code) return '';
    // Escapar caracteres HTML básicos primero para evitar inyectar tags reales
    let escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    if (fileName.endsWith('.py')) {
      return escapedCode
        .replace(/\b(def|class|if|else|elif|for|while|return|import|from|as|try|except|finally|with|await|async|print|input)\b/g, '<span class="text-purple-400 font-bold">$1</span>')
        .replace(/\b(self|None|True|False)\b/g, '<span class="text-orange-400">$1</span>')
        .replace(/(['"])(.*?)\1/g, '<span class="text-emerald-400">"$2"</span>')
        .replace(/#.*/g, '<span class="text-slate-600">$&</span>')
        .replace(/\b(\w+)(?=\()/g, '<span class="text-blue-400 font-bold">$1</span>');
    }

    const isCpp = fileName.endsWith('.cpp') || fileName.endsWith('.hpp') || fileName.endsWith('.cc');
    const isC = fileName.endsWith('.c') || fileName.endsWith('.h');
    const isJava = fileName.endsWith('.java');
    const isJS = fileName.endsWith('.js') || fileName.endsWith('.ts');

    if (isCpp || isC || isJava || isJS) {
      let highlighted = escapedCode
        .replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|async|await|try|catch|finally|null|undefined|true|false|public|private|protected|class|static|void|int|float|double|char|long|bool|if|else|switch|case|break|continue|new|delete|this|try|throw|catch|using|namespace|include|struct|template|virtual|override|final)\b/g, '<span class="text-purple-400 font-bold">$1</span>')
        .replace(/(['"`])(.*?)\1/g, '<span class="text-emerald-400">"$2"</span>')
        .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '<span class="text-slate-600">$&</span>');

      if (isJava) {
        highlighted = highlighted.replace(/\b(System|String|Object|Integer|List|ArrayList|Map|HashMap)\b/g, '<span class="text-yellow-400">$1</span>');
      }
      if (isCpp || isC) {
        highlighted = highlighted.replace(/#include\s+&lt;.*?&gt;/g, '<span class="text-orange-400">$&</span>');
        highlighted = highlighted.replace(/\b(std|cout|cin|endl|printf|scanf)\b/g, '<span class="text-blue-400">$1</span>');
      }
      return highlighted;
    }

    return escapedCode;
  };

  const handleCreateFile = () => {
    const runtimeConfig: Record<string, { name: string, code: string }> = {
      'Python': {
        name: 'app.py',
        code: 'print("Hola desde Python!")\n\n# Tu código aquí...'
      },
      'Node.js': {
        name: 'index.js',
        code: 'console.log("Hola desde Node.js!");\n\n// Tu código aquí...'
      },
      'Java': {
        name: 'Main.java',
        code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hola desde Java!");\n    }\n}'
      },
      'C': {
        name: 'main.c',
        code: '#include <stdio.h>\n\nint main() {\n    printf("Hola desde C!\\n");\n    return 0;\n}'
      },
      'C++': {
        name: 'main.cpp',
        code: '#include <iostream>\n\nint main() {\n    std::cout << "Hola desde C++!" << std::endl;\n    return 0;\n}'
      }
    };

    const config = runtimeConfig[state.runtime as string] || runtimeConfig['Python'];

    setModal({
      show: true,
      title: 'Nuevo Archivo',
      description: `Creando archivo principal para ${state.runtime}.`,
      placeholder: config.name,
      value: config.name,
      type: 'input',
      onConfirm: (name) => {
        if (!name) return;
        const code = safeFiles[name] !== undefined ? safeFiles[name] : config.code;
        const newFiles = { ...safeFiles, [name]: code };
        onUpdate({ files: newFiles, activeFile: name });
        setActiveFile(name);
        setModal(m => ({ ...m, show: false }));
      }
    });
  };

  const handleDeleteFile = (fileName: string) => {
    if (Object.keys(safeFiles).length <= 1) return;
    setModal({
      show: true,
      title: '¿Eliminar archivo?',
      description: `Estás a punto de borrar "${fileName}". Esta acción no se puede deshacer.`,
      placeholder: '',
      value: '',
      type: 'confirm',
      onConfirm: () => {
        const newFiles = { ...safeFiles };
        delete newFiles[fileName];
        const nextFile = Object.keys(newFiles)[0];
        onUpdate({ files: newFiles, activeFile: nextFile });
        setActiveFile(nextFile);
        setModal(m => ({ ...m, show: false }));
      }
    });
  };

  const handleRunScript = async () => {
    // Al iniciar ejecución, limpiamos terminal
    setTerminalOutput([]);

    if (!engineRef.current) {
      engineRef.current = new BackendEngine(dbState.tables, env);
    }
    const engine = engineRef.current;

    // SANITIZACIÓN FINAL ANTES DE ENVIAR
    const originalCode = safeFiles[activeFile] || '';
    const cleanCode = sanitizeCode(originalCode);

    // Si hubo limpieza, actualizamos el archivo para que el usuario lo vea limpio
    if (cleanCode !== originalCode) {
      onUpdate({ files: { ...safeFiles, [activeFile]: cleanCode } });
    }

    setIsSending(true);

    const pushLog = (log: any) => {
      setTerminalOutput(prev => [...prev, log]);
    };

    pushLog({ type: 'info', msg: `> Iniciando Runtime de ${state.runtime}...`, time: new Date().toLocaleTimeString() });

    try {
      pushLog({ type: 'info', msg: `> Ejecutando archivo: ${activeFile}...`, time: new Date().toLocaleTimeString() });

      const mockRoute: BackendRoute = {
        id: 'run',
        method: 'GET',
        path: '/run',
        handler: cleanCode
      };

      const result = await engine.executeRoute(mockRoute, {}, {},
        (log) => {
          if (log.type === 'raw') {
            setTerminalOutput(prev => [...prev, log]);
          } else {
            setTerminalOutput(prev => [...prev, { ...log, time: new Date().toLocaleTimeString() }]);
          }
        },
        async (promptMsg) => {
          return new Promise((resolve) => {
            setWaitingInput({
              prompt: promptMsg || '',
              resolve: (val) => {
                setWaitingInput(null);
                resolve(val);
              }
            });
          });
        }
      );

      if (result.status === 200) {
        if (result.data.stdout) {
          pushLog({ type: 'raw', msg: result.data.stdout });
        }
        if (result.data.stderr) {
          pushLog({ type: 'error', msg: result.data.stderr });
        }
        pushLog({ type: 'success', msg: `Proceso finalizado con éxito (Salida 0).`, time: new Date().toLocaleTimeString() });
      } else {
        pushLog({ type: 'error', msg: `Error en ejecución: ${result.data.message || result.data.error || 'Desconocido'}`, time: new Date().toLocaleTimeString() });
      }

    } catch (e: any) {
      pushLog({ type: 'error', msg: e.message, time: new Date().toLocaleTimeString() });
    } finally {
      setIsSending(false);
    }
  };

  const handleInstallPackage = () => {
    const pkgManagers: Record<string, { name: string, cmd: string, placeholder: string }> = {
      'Python': { name: 'PyPI', cmd: 'pip install', placeholder: 'numpy, pandas...' },
      'Node.js': { name: 'NPM', cmd: 'npm install', placeholder: 'lodash, axios...' },
      'Java': { name: 'Maven', cmd: 'mvn dependency', placeholder: 'org.json, spring...' },
      'C': { name: 'Conan', cmd: 'conan install', placeholder: 'zlib, openssl...' },
      'C++': { name: 'Vcpkg', cmd: 'vcpkg install', placeholder: 'boost, fmt...' }
    };
    const manager = pkgManagers[state.runtime as string] || pkgManagers['Python'];

    setModal({
      show: true,
      title: 'Instalar Librería',
      description: `Ingresa el nombre del paquete de ${manager.name} que deseas agregar al entorno.`,
      placeholder: manager.placeholder,
      value: '',
      type: 'input',
      onConfirm: async (pkg) => {
        if (!pkg) return;
        setModal(m => ({ ...m, show: false }));
        setIsSending(true);
        setTerminalOutput(prev => [...prev, { type: 'info', msg: `> Instalando paquete '${pkg}' vía ${manager.cmd}...`, time: new Date().toLocaleTimeString() }]);

        try {
          if (state.runtime === 'Python') {
            if (!engineRef.current) {
              engineRef.current = new BackendEngine(dbState.tables, env);
            }
            const engine = engineRef.current;
            const installCode = `import micropip\nawait micropip.install('${pkg}')\nprint("✅ Librería '${pkg}' instalada con éxito")`;

            const mockRoute: BackendRoute = { id: 'install', method: 'GET', path: '/install', handler: installCode };
            await engine.executeRoute(mockRoute, {}, {}, (log) => { setTerminalOutput(prev => [...prev, log]); });
          } else {
            // Simulación para otros lenguajes
            await new Promise(r => setTimeout(r, 1500));
            setTerminalOutput(prev => [...prev, { type: 'success', msg: `✅ Paquete '${pkg}' configurado exitosamente en el entorno de ${state.runtime}.`, time: new Date().toLocaleTimeString() }]);
          }
        } catch (e: any) {
          setTerminalOutput(prev => [...prev, { type: 'error', msg: `Error instalando ${pkg}: ${e.message}` }]);
        } finally {
          setIsSending(false);
        }
      }
    });
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim() && !waitingInput) return;
    const cmd = terminalInput;
    setTerminalInput('');

    if (waitingInput) {
      setTerminalOutput(prev => [...prev, { type: 'input', msg: cmd }]);
      waitingInput.resolve(cmd);
      return;
    }

    setTerminalOutput(prev => [...prev, { type: 'input', msg: cmd }]);

    if (engineRef.current && state.runtime === 'Python') {
      try {
        const engine = engineRef.current;
        const wrappedCmd = cmd.includes('print') || cmd.includes('=') || cmd.includes('import') ? cmd : `print(${cmd})`;
        const mockRoute: BackendRoute = { id: 'repl', method: 'GET', path: '/repl', handler: wrappedCmd };
        await engine.executeRoute(mockRoute, {}, {},
          (log) => { setTerminalOutput(prev => [...prev, log]); },
          async (promptMsg) => {
            return new Promise((resolve) => {
              setModal({
                show: true,
                title: 'Entrada de Python',
                description: promptMsg || 'Esperando respuesta...',
                placeholder: 'Escribe aquí...', value: '', type: 'input',
                onConfirm: (val) => {
                  setModal(m => ({ ...m, show: false }));
                  setTerminalOutput(prev => [...prev, { type: 'input', msg: val }]);
                  resolve(val);
                },
                onCancel: () => {
                  setModal(m => ({ ...m, show: false }));
                  resolve(null as any);
                }
              });
            });
          }
        );
      } catch (err: any) {
        setTerminalOutput(prev => [...prev, { type: 'error', msg: err.message, time: new Date().toLocaleTimeString() }]);
      }
    } else if (state.runtime === 'Node.js') {
      setTerminalOutput(prev => [...prev, { type: 'info', msg: `Node.js REPL no disponible todavía. Usa RUN SCRIPT.` }]);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    setResponse(null);
    try {
      const engine = new BackendEngine(dbState.tables, env);
      const mockRoute: BackendRoute = {
        id: 'mock',
        method: requestMethod,
        path: requestUrl,
        handler: safeFiles[activeFile] || ''
      };
      let body = undefined;
      if (requestMethod === 'POST' || requestMethod === 'PUT') {
        try { body = JSON.parse(requestBody); } catch (e) { }
      }
      const result = await engine.executeRoute(mockRoute, body, {});
      setResponse(result);
    } catch (error: any) {
      setResponse({
        status: 500,
        time: 0,
        data: { error: 'Execution Error', message: error.message },
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      setIsSending(false);
    }
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith('.js')) return <span className="text-yellow-400 text-[14px] font-bold">JS</span>;
    if (name.endsWith('.py')) return <span className="text-blue-400 text-[14px] font-bold">PY</span>;
    if (name.endsWith('.java')) return <span className="text-red-400 text-[14px] font-bold">JV</span>;
    if (name.endsWith('.c')) return <span className="text-sky-500 text-[14px] font-bold">C</span>;
    if (name.endsWith('.cpp')) return <span className="text-blue-600 text-[14px] font-bold">C++</span>;
    return <span className="material-symbols-outlined text-slate-400 text-[18px]">description</span>;
  };

  const handleMouseDown = (e: React.MouseEvent) => { setIsResizing(true); };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) setSplitWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden bg-editor-dark">
      {/* SIDEBAR */}
      <aside className={`border-r border-slate-800 bg-sidebar-dark flex flex-col shrink-0 transition-all duration-300 ease-in-out ${sidebarVisible ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="p-4 border-b border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Entorno</h3>
            <Badge variant="outline" className="text-[9px] text-primary border-primary/20 bg-primary/5">{state.runtime}</Badge>
          </div>
          <Select value={state.runtime} onValueChange={(v: any) => onUpdate({ runtime: v })}>
            <SelectTrigger className="h-8 bg-editor-dark border-slate-800 text-[11px] font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-sidebar-dark border-slate-800">
              <SelectItem value="Node.js">Node.js</SelectItem>
              <SelectItem value="Python">Python</SelectItem>
              <SelectItem value="Java">Java</SelectItem>
              <SelectItem value="C">C</SelectItem>
              <SelectItem value="C++">C++</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Explorador</h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleNuclearClean} title="Limpieza Nuclear de Archivos" className="h-6 w-6 p-0 hover:bg-slate-800 text-slate-400 hover:text-primary">
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCreateFile} className="h-6 w-6 p-0 hover:bg-slate-800 text-slate-400">
                <span className="material-symbols-outlined text-[16px]">add_box</span>
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 -mr-2 pr-2">
            <div className="space-y-0.5">
              {Object.keys(safeFiles).map(fileName => (
                <div key={fileName} className="group flex items-center gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveFile(fileName)}
                    className={`flex-1 justify-start h-8 px-2 rounded-lg gap-2 border-none ${activeFile === fileName ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-800/50'}`}
                  >
                    {getFileIcon(fileName)}
                    <span className="text-[12px] font-medium truncate">{fileName}</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteFile(fileName)} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="h-11 border-b border-slate-800 flex items-center justify-between px-4 bg-sidebar-dark shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="h-7 w-7 p-0 hover:bg-slate-800 text-slate-500">
              <span className="material-symbols-outlined text-[20px]">{sidebarVisible ? 'vertical_split' : 'format_indent_increase'}</span>
            </Button>
            <div className="flex bg-editor-dark p-1 rounded-xl border border-slate-800">
              <Button size="sm" variant="ghost" onClick={() => setActiveView('editor')} className={`px-4 h-7 text-[10px] font-bold rounded-lg ${activeView === 'editor' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>EDITOR</Button>
              <Button size="sm" variant="ghost" onClick={() => setActiveView('tester')} className={`px-4 h-7 text-[10px] font-bold rounded-lg ${activeView === 'tester' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>API TESTER</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={handleInstallPackage} className="h-7 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 rounded-lg px-3 gap-2">
                <span className="material-symbols-outlined text-[14px]">package_2</span> LIBS
              </Button>
              <Button size="sm" onClick={handleRunScript} disabled={isSending} className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                <span className="material-symbols-outlined text-[14px]">play_arrow</span> RUN SCRIPT
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-500 truncate max-w-[150px] font-mono">{activeFile}</span>
            <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] font-black uppercase tracking-tighter">Live</Badge>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative flex flex-col">
          {activeView === 'editor' ? (
            <div className="flex-1 flex overflow-hidden">
              <div style={{ width: `${splitWidth}%` }} className="h-full relative flex overflow-hidden font-mono bg-[#010409] border-r border-slate-800">
                <ScrollArea className="w-12 bg-sidebar-dark/10 border-r border-slate-800/50 py-6 select-none shrink-0 scrollbar-hide">
                  <div className="flex flex-col items-center font-mono text-slate-700 text-[11px] leading-[1.5rem]">
                    {(safeFiles[activeFile] || '').split('\n').map((_, i) => (
                      <span key={i} className="h-[1.5rem] flex items-center">{i + 1}</span>
                    ))}
                  </div>
                </ScrollArea>
                <div className="relative flex-1 overflow-hidden">
                  <pre
                    ref={preRef}
                    className="absolute inset-0 p-6 m-0 text-[13px] whitespace-pre leading-[1.5rem] z-0 text-slate-300 pointer-events-none overflow-hidden border-none"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      boxSizing: 'border-box'
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightText(safeFiles[activeFile] || '', activeFile) + '\n' }}
                  />
                  <textarea
                    ref={textareaRef}
                    value={safeFiles[activeFile] || ''}
                    onScroll={handleScroll}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      // Si detectamos patrones de corrupción masiva, sanitizamos
                      if (newCode.includes('class="text-') || newCode.includes('font-bold">')) {
                        const cleaned = sanitizeCode(newCode);
                        onUpdate({ files: { ...safeFiles, [activeFile]: cleaned } });
                      } else {
                        onUpdate({ files: { ...safeFiles, [activeFile]: newCode } });
                      }
                    }}
                    className="absolute inset-0 w-full h-full p-6 bg-transparent border-none outline-none text-[13px] font-mono text-transparent caret-primary resize-none leading-[1.5rem] z-10 whitespace-pre overflow-auto"
                    spellCheck={false}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
              <div onMouseDown={handleMouseDown} className="w-1 bg-slate-800 hover:bg-primary/50 cursor-col-resize transition-colors z-20 flex items-center justify-center group">
                <div className="w-0.5 h-8 bg-slate-700 group-hover:bg-primary/50 rounded-full"></div>
              </div>
              <div className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-800 flex justify-between items-center bg-sidebar-dark/80 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="size-2.5 rounded-full bg-red-500/50"></div>
                      <div className="size-2.5 rounded-full bg-yellow-500/50"></div>
                      <div className="size-2.5 rounded-full bg-green-500/50"></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Salida del Programa</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setTerminalOutput([]); if (engineRef.current) engineRef.current.reset(); engineRef.current = null; }} className="h-5 px-2 text-[8px] text-red-500 hover:text-white font-bold uppercase">Reset</Button>
                    <Button variant="ghost" size="sm" onClick={() => setTerminalOutput([])} className="h-5 px-2 text-[8px] text-slate-600 hover:text-white font-bold uppercase">Clear</Button>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 font-mono text-[11px] space-y-2 min-h-[400px]">
                    {terminalOutput.length === 0 && <div className="h-full flex flex-col items-center justify-center opacity-20 py-40"><span className="material-symbols-outlined text-6xl mb-4">terminal</span><p className="text-[11px] font-black uppercase tracking-widest text-center">Esperando comando RUN...</p></div>}
                    {terminalOutput.map((log, i) => (
                      <div key={i} className={`${log.type === 'error' ? 'text-red-400' : log.type === 'input' ? 'text-primary font-bold' : log.type === 'raw' ? 'text-sky-300' : 'text-emerald-400'} break-all whitespace-pre-wrap font-mono`}>
                        {log.time && <span className="text-slate-800 mr-2 text-[9px]">[{log.time}]</span>}
                        {log.type === 'input' && '>>> '}{log.msg}
                      </div>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>
                </ScrollArea>
                {/* Terminal Input Bar */}
                <form onSubmit={handleTerminalSubmit} className={`p-3 bg-sidebar-dark/40 border-t transition-all duration-300 flex gap-2 items-center ${waitingInput ? 'border-primary shadow-[0_-4px_20px_-10px_rgba(59,130,246,0.5)] bg-primary/5' : 'border-slate-800'}`}>
                  <span className={`font-bold font-mono transition-colors ${waitingInput ? 'text-primary scale-110' : 'text-slate-600'}`}>
                    {waitingInput ? '???' : '>>>'}
                  </span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder={waitingInput ? (waitingInput.prompt || "Escribe tu respuesta...") : "Escribe aquí para interactuar..."}
                    className="flex-1 bg-transparent border-none outline-none text-slate-300 font-mono text-[12px] placeholder:text-slate-700 font-bold"
                    autoFocus={!!waitingInput}
                  />
                  {waitingInput && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setModal({
                        show: true,
                        title: 'Entrada de Python',
                        description: waitingInput.prompt || 'Python está esperando una respuesta...',
                        placeholder: 'Escribe aquí...',
                        value: terminalInput,
                        type: 'input',
                        onConfirm: (val) => {
                          setModal(m => ({ ...m, show: false }));
                          setTerminalOutput(prev => [...prev, { type: 'input', msg: val }]);
                          waitingInput.resolve(val);
                        },
                        onCancel: () => {
                          setModal(m => ({ ...m, show: false }));
                        }
                      })}
                      className="h-6 px-2 text-[9px] font-bold text-primary hover:bg-primary/10 rounded-md border border-primary/20 animate-pulse bg-primary/5"
                    >
                      AMPLIAR
                    </Button>
                  )}
                </form>
              </div>
            </div>
          ) : (
            <div className="h-full flex">
              <div className="flex-1 border-r border-slate-800 p-6 flex flex-col overflow-hidden">
                <div className="flex gap-2 mb-6">
                  <div className="flex-1 flex border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                    <Select value={requestMethod} onValueChange={(v: any) => setRequestMethod(v)}>
                      <SelectTrigger className="w-24 h-10 border-none bg-slate-900 text-[10px] font-black text-primary"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-sidebar-dark border-slate-800"><SelectItem value="GET">GET</SelectItem><SelectItem value="POST">POST</SelectItem></SelectContent>
                    </Select>
                    <input className="flex-1 bg-transparent px-4 py-2 text-[12px] font-mono text-slate-400 outline-none" value={requestUrl} onChange={(e) => setRequestUrl(e.target.value)} />
                  </div>
                  <Button onClick={handleSend} disabled={isSending} className="h-10 px-6 bg-primary text-white font-bold text-[12px] rounded-xl shadow-lg shadow-primary/20">SEND</Button>
                </div>
                <Tabs value={testerTab} onValueChange={(v: any) => setTesterTab(v)} className="flex-1 flex flex-col">
                  <TabsList className="bg-transparent border-b border-slate-800 rounded-none h-9 p-0 gap-6 mb-4">
                    <TabsTrigger value="body" className="bg-transparent border-none rounded-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary pb-3 px-0 text-[10px] font-bold uppercase tracking-widest">BODY</TabsTrigger>
                  </TabsList>
                  <TabsContent value="body" className="flex-1 mt-0">
                    <textarea className="w-full h-full bg-slate-950/30 border border-slate-800/50 rounded-2xl p-4 text-[12px] font-mono text-slate-400 outline-none resize-none" value={requestBody} onChange={(e) => setRequestBody(e.target.value)} spellCheck={false} />
                  </TabsContent>
                </Tabs>
              </div>
              <div className="flex-1 p-6 flex flex-col bg-black/10 overflow-hidden">
                <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">Resultado API</h3>
                <Card className="flex-1 bg-editor-dark border-slate-800 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    {response ? <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed">{JSON.stringify(response.data, null, 2)}</pre> : <div className="h-full flex flex-col items-center justify-center opacity-30"><span className="material-symbols-outlined text-4xl mb-2">rocket</span><p className="text-[10px] font-bold uppercase">Ejecuta para ver resultados</p></div>}
                  </ScrollArea>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={modal.show} onOpenChange={(open) => !open && setModal(m => ({ ...m, show: false }))}>
        <DialogContent className="bg-sidebar-dark/95 backdrop-blur-xl border-slate-800 text-white max-w-md rounded-2xl shadow-2xl shadow-primary/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">{modal.type === 'input' ? 'edit_square' : 'warning'}</span>
              {modal.title}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {modal.description}
            </DialogDescription>
          </DialogHeader>
          {modal.type === 'input' && (
            <div className="py-4">
              <Input
                value={modal.value}
                onChange={(e) => setModal(m => ({ ...m, value: e.target.value }))}
                placeholder={modal.placeholder}
                className="bg-slate-900 border-slate-800 text-white h-12 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && modal.onConfirm(modal.value)}
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                if (modal.onCancel) modal.onCancel();
                setModal(m => ({ ...m, show: false }));
              }}
              className="text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => modal.onConfirm(modal.value)}
              className={`${modal.type === 'confirm' ? 'bg-red-600 hover:bg-red-500' : 'bg-primary hover:bg-primary/90'} text-white font-bold rounded-xl px-8 shadow-lg transition-all active:scale-95`}
            >
              {modal.type === 'confirm' ? 'Eliminar' : 'Aceptar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{
        __html: `
        [data-radix-portal] div[role="presentation"] {
          background-color: rgba(0, 0, 0, 0.3) !important;
          backdrop-filter: blur(1px) !important;
        }
      `}} />
    </div>
  );
};

export default BackendModule;
