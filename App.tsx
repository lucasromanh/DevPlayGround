
import React, { useState, useEffect } from 'react';
import { AppTab, ProjectState, DeployedProject, EnvVariables } from './types';
import FrontendModule from './modules/FrontendModule';
import BackendModule from './modules/BackendModule';
import DatabaseModule from './modules/DatabaseModule';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TutorialOverlay from './components/TutorialOverlay';

const STORAGE_KEY = 'lucas_playground_vfinal_01';
const DEPLOYED_KEY = 'lucas_deployed_projects';

const getVanillaBoilerplate = (): ProjectState['frontend'] => ({
  framework: 'Vanilla JS',
  activeFile: 'index.html',
  files: {
    'index.html': `<div id="root"></div>`,
    'styles.css': `body { \n  margin: 0; \n  background: #0d1117; \n  color: white; \n  font-family: 'Inter', sans-serif; \n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100vh;\n}\n\n.card {\n  background: #161b22;\n  border: 1px solid #30363d;\n  padding: 40px;\n  border-radius: 20px;\n  box-shadow: 0 20px 50px rgba(0,0,0,0.6);\n  text-align: center;\n}\n\nh1 {\n  color: #13a4ec;\n  font-size: 3rem;\n  margin: 0;\n  letter-spacing: -1px;\n}`,
    'script.js': `// Playground de Lucas Roman\nconst root = document.getElementById('root');\n\nroot.innerHTML = \`\n  <div class="card">\n    <h1>Hola Mundo</h1>\n    <p style="color: #8b949e; margin-top: 15px; font-size: 1.1rem;">Tu entorno de desarrollo está listo.</p>\n    <div style="margin-top: 30px; font-weight: 800; color: #58a6ff; font-size: 0.9rem; letter-spacing: 1px; text-transform: uppercase;">Hecho por Lucas Roman</div>\n  </div>\n\`;`
  }
});

const BOILERPLATE: ProjectState = {
  id: 'proy-inicial',
  name: 'Nuevo Proyecto Lucas',
  envVariables: {
    CONNECT_BACKEND: true,
    CONNECT_DATABASE: true,
    API_KEY: 'LLAVE_AUTO_LUCAS_2025',
    DATABASE_URL: 'postgresql://admin:password@localhost:5432/main_db',
    BACKEND_URL: 'http://localhost:4000',
    CORS_ORIGIN: '*'
  },
  frontend: getVanillaBoilerplate(),
  backend: {
    runtime: 'Node.js',
    routes: [
      {
        id: 'r1',
        method: 'GET',
        path: '/api/saludo',
        handler: `(req, res, db) => {\n  return res.json({ mensaje: 'Hola desde el Backend de Lucas' });\n}`
      }
    ]
  },
  database: {
    tables: [
      {
        id: 't1',
        name: 'usuarios',
        columns: [
          { name: 'id', type: 'INT', isPrimary: true },
          { name: 'nombre', type: 'TEXT' }
        ],
        rows: [{ id: 1, nombre: 'Lucas Roman' }]
      }
    ]
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('frontend');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [showDeployPopup, setShowDeployPopup] = useState<{show: boolean, name: string}>({show: false, name: ''});
  
  const [project, setProject] = useState<ProjectState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : BOILERPLATE;
  });

  const [deployedProjects, setDeployedProjects] = useState<DeployedProject[]>(() => {
    const saved = localStorage.getItem(DEPLOYED_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  useEffect(() => {
    localStorage.setItem(DEPLOYED_KEY, JSON.stringify(deployedProjects));
  }, [deployedProjects]);

  useEffect(() => {
    const tutorialDone = localStorage.getItem('tutorial_vfinal_lucas_done');
    if (!tutorialDone) setShowTutorial(true);
  }, []);

  const handleNewProject = () => {
    if(window.confirm('¿Borrar el editor actual? Los proyectos desplegados se mantendrán.')) {
      setProject({ ...BOILERPLATE, id: 'proy-' + Date.now() });
      setActiveTab('frontend');
    }
  };

  const handleDeploy = () => {
    setDeploying(true);
    setTimeout(() => {
      const newDeployment: DeployedProject = {
        id: 'dep-' + Date.now(),
        name: project.name,
        timestamp: Date.now(),
        state: JSON.parse(JSON.stringify(project))
      };
      setDeployedProjects(prev => [newDeployment, ...prev]);
      setDeploying(false);
      setShowDeployPopup({show: true, name: project.name});
      setTimeout(() => setShowDeployPopup({show: false, name: ''}), 6000);
    }, 1200);
  };

  const openStandalone = (proj: ProjectState) => {
    const { files, framework } = proj.frontend;
    let content = `<html><head><title>${proj.name}</title><script src="https://cdn.tailwindcss.com"></script><style>${files['styles.css'] || ''}</style></head><body>${files['index.html'] || ''}<script>try { ${files['script.js'] || ''} } catch(e){ console.error(e); }</script></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.open(); win.document.write(content); win.document.close(); }
  };

  return (
    <div className="flex flex-col h-screen bg-background-dark overflow-hidden font-sans">
      <Header 
        project={project} 
        onDeploy={handleDeploy} 
        isDeploying={deploying}
        onUpdateName={(name) => setProject(p => ({...p, name}))}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onNewProject={handleNewProject}
          onOpenEnv={() => setShowSettings(true)}
          onOpenTutorial={() => setShowTutorial(true)}
          deployedProjects={deployedProjects}
          onLoadProject={(p) => {
            if(window.confirm(`¿Cargar "${p.name}"?`)) {
              setProject(p.state);
              setActiveTab('frontend');
            }
          }}
          onOpenWeb={(p) => openStandalone(p.state)}
        />
        
        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'frontend' && (
            <FrontendModule 
              state={project.frontend} 
              onUpdate={(updates) => setProject(p => ({...p, frontend: {...p.frontend, ...updates}}))} 
              backendState={project.backend}
              dbState={project.database}
              env={project.envVariables}
            />
          )}
          {activeTab === 'backend' && (
            <BackendModule 
              state={project.backend} 
              onUpdate={(updates) => setProject(p => ({...p, backend: {...p.backend, ...updates}}))} 
              dbState={project.database}
              env={project.envVariables}
            />
          )}
          {activeTab === 'database' && (
            <DatabaseModule 
              state={project.database} 
              onUpdate={(updates) => setProject(p => ({...p, database: {...p.database, ...updates}}))} 
            />
          )}

          {showDeployPopup.show && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-bottom fade-in duration-300">
               <div className="bg-sidebar-dark border border-primary/50 rounded-2xl shadow-2xl p-5 flex items-center gap-6 min-w-[400px]">
                  <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold">¡Proyecto Desplegado!</p>
                    <p className="text-slate-400 text-xs">"{showDeployPopup.name}" está disponible en Mis Proyectos</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openStandalone(project)}
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 shadow-lg shadow-primary/20"
                    >
                      ABRIR WEB
                    </button>
                    <button onClick={() => setShowDeployPopup({show: false, name: ''})} className="text-slate-600 hover:text-white transition-colors">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
               </div>
            </div>
          )}
        </main>

        {showSettings && (
          <div className="absolute inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-sidebar-dark border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl p-10 animate-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold text-white flex items-center gap-4">
                  <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                    <span className="material-symbols-outlined">hub</span>
                  </div>
                  Configuración de Entorno (ENV)
                </h2>
                <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Conectores Rápidos */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Interruptores Rápidos</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 bg-editor-dark rounded-2xl border border-slate-800 cursor-pointer hover:border-primary/40 transition-all">
                      <div className="flex items-center gap-3 text-sm font-bold text-slate-200">
                        <span className="material-symbols-outlined text-slate-500">api</span>
                        Conectar Backend
                      </div>
                      <input 
                        type="checkbox" 
                        checked={project.envVariables.CONNECT_BACKEND}
                        onChange={(e) => setProject(p => ({...p, envVariables: {...p.envVariables, CONNECT_BACKEND: e.target.checked}}))}
                        className="size-5 accent-primary cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-editor-dark rounded-2xl border border-slate-800 cursor-pointer hover:border-primary/40 transition-all">
                      <div className="flex items-center gap-3 text-sm font-bold text-slate-200">
                        <span className="material-symbols-outlined text-slate-500">database</span>
                        Conectar Base de Datos
                      </div>
                      <input 
                        type="checkbox" 
                        checked={project.envVariables.CONNECT_DATABASE}
                        onChange={(e) => setProject(p => ({...p, envVariables: {...p.envVariables, CONNECT_DATABASE: e.target.checked}}))}
                        className="size-5 accent-primary cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Variables Avanzadas */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Configuración Avanzada</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Database Connection String</label>
                      <input 
                        type="text"
                        value={project.envVariables.DATABASE_URL}
                        onChange={(e) => setProject(p => ({...p, envVariables: {...p.envVariables, DATABASE_URL: e.target.value}}))}
                        className="w-full mt-1.5 bg-editor-dark border border-slate-800 p-3 rounded-xl text-xs font-mono text-primary outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-600 uppercase ml-1">API Endpoint URL</label>
                      <input 
                        type="text"
                        value={project.envVariables.BACKEND_URL}
                        onChange={(e) => setProject(p => ({...p, envVariables: {...p.envVariables, BACKEND_URL: e.target.value}}))}
                        className="w-full mt-1.5 bg-editor-dark border border-slate-800 p-3 rounded-xl text-xs font-mono text-primary outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-600 uppercase ml-1">API Key / Auth Token</label>
                      <input 
                        type="password"
                        value={project.envVariables.API_KEY}
                        onChange={(e) => setProject(p => ({...p, envVariables: {...p.envVariables, API_KEY: e.target.value}}))}
                        className="w-full mt-1.5 bg-editor-dark border border-slate-800 p-3 rounded-xl text-xs font-mono text-emerald-400 outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-10 border-t border-slate-800 flex justify-end">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-10 py-4 bg-primary text-white font-bold rounded-2xl hover:brightness-110 shadow-xl shadow-primary/20 transition-all active:scale-95"
                >
                  APLICAR CAMBIOS
                </button>
              </div>
            </div>
          </div>
        )}

        {showTutorial && (
          <TutorialOverlay onClose={() => {
            setShowTutorial(false);
            localStorage.setItem('tutorial_vfinal_lucas_done', 'true');
          }} />
        )}
      </div>
    </div>
  );
};

export default App;
