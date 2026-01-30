
import React, { useState, useEffect } from 'react';
import { ProjectState, BackendRoute, Runtime, ApiResponse, EnvVariables } from '../types';

interface BackendModuleProps {
  state: ProjectState['backend'];
  onUpdate: (updates: Partial<ProjectState['backend']>) => void;
  dbState: ProjectState['database'];
  env: EnvVariables;
}

const BackendModule: React.FC<BackendModuleProps> = ({ state, onUpdate, dbState, env }) => {
  const [activeRouteId, setActiveRouteId] = useState<string>(state.routes[0]?.id || '');
  const [activeView, setActiveView] = useState<'editor' | 'tester'>('editor');
  
  // Estado para el tester (Thunder Client)
  const [requestUrl, setRequestUrl] = useState('');
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [requestBody, setRequestBody] = useState('{\n  "nombre": "Lucas"\n}');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [testerTab, setTesterTab] = useState<'body' | 'headers' | 'params'>('body');

  const activeRoute = state.routes.find(r => r.id === activeRouteId);

  useEffect(() => {
    if (activeRoute) {
      setRequestUrl(activeRoute.path);
      setRequestMethod(activeRoute.method);
    }
  }, [activeRouteId]);

  const handleSend = () => {
    setIsSending(true);
    setResponse(null);
    const start = performance.now();
    
    // Simulación de ejecución de endpoint
    setTimeout(() => {
      const time = Math.round(performance.now() - start);
      const isOk = Math.random() > 0.1;
      
      setResponse({
        status: isOk ? 200 : 404,
        time,
        data: isOk ? { 
          id: 1, 
          message: "Respuesta simulada desde el servidor de Lucas",
          timestamp: new Date().toISOString(),
          context: env.CONNECT_DATABASE ? "Base de datos vinculada" : "Modo aislado"
        } : { error: "Not Found", message: "La ruta no existe en el playground" },
        headers: {
          'Content-Type': 'application/json',
          'Server': 'LucasPlayground/1.0',
          'Access-Control-Allow-Origin': env.CORS_ORIGIN
        }
      });
      setIsSending(false);
    }, 600);
  };

  const addRoute = () => {
    const newRoute: BackendRoute = {
      id: Date.now().toString(),
      method: 'GET',
      path: '/api/v1/usuarios',
      handler: `(req, res, db) => {\n  const users = db.table('usuarios').find();\n  return res.json(users);\n}`
    };
    onUpdate({ routes: [...state.routes, newRoute] });
    setActiveRouteId(newRoute.id);
  };

  return (
    <div className="flex h-full overflow-hidden bg-editor-dark">
      {/* Sidebar de Rutas */}
      <aside className="w-64 border-r border-slate-800 bg-sidebar-dark flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Runtime</h3>
              <span className="text-[9px] text-primary font-bold">{state.runtime}</span>
           </div>
           <select 
            value={state.runtime} 
            onChange={(e) => onUpdate({runtime: e.target.value as any})}
            className="w-full bg-editor-dark border border-slate-800 rounded-lg py-2 px-3 text-[11px] font-bold text-slate-400 outline-none"
           >
             <option>Node.js</option>
             <option>Python</option>
             <option>Java</option>
           </select>
        </div>

        <div className="p-4 flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
             <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rutas API</h3>
             <button onClick={addRoute} className="text-primary hover:bg-primary/10 p-1 rounded transition-all">
                <span className="material-symbols-outlined text-[18px]">add</span>
             </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
            {state.routes.map(r => (
              <button
                key={r.id}
                onClick={() => setActiveRouteId(r.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 border ${
                  activeRouteId === r.id ? 'bg-primary/10 text-primary border-primary/20 shadow-lg shadow-primary/5' : 'text-slate-500 border-transparent hover:bg-slate-800 hover:text-slate-300'
                }`}
              >
                <span className={`text-[9px] font-black w-10 shrink-0 ${
                  r.method === 'GET' ? 'text-emerald-400' : 
                  r.method === 'POST' ? 'text-yellow-400' : 
                  r.method === 'DELETE' ? 'text-red-400' : 'text-primary'
                }`}>{r.method}</span>
                <span className="text-[11px] font-mono truncate">{r.path}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="h-12 border-b border-slate-800 flex items-center justify-between px-6 bg-sidebar-dark">
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveView('editor')}
              className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeView === 'editor' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
            >
              Editor de Lógica
            </button>
            <button 
              onClick={() => setActiveView('tester')}
              className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeView === 'tester' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
            >
              Thunder Tester
            </button>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <span className={`size-2 rounded-full ${env.CONNECT_DATABASE ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                DB: {env.CONNECT_DATABASE ? 'LINKED' : 'LOCAL'}
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeView === 'editor' ? (
            <div className="flex flex-col h-full">
               {activeRoute ? (
                 <>
                   <div className="p-4 bg-editor-dark border-b border-slate-800 flex gap-4">
                      <select 
                        value={activeRoute.method}
                        onChange={(e) => onUpdate({ routes: state.routes.map(r => r.id === activeRoute.id ? {...r, method: e.target.value as any} : r) })}
                        className="bg-slate-800 border-none text-[10px] font-bold rounded-lg py-1.5 px-4 text-white outline-none"
                      >
                        <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                      </select>
                      <input 
                        type="text"
                        value={activeRoute.path}
                        onChange={(e) => onUpdate({ routes: state.routes.map(r => r.id === activeRoute.id ? {...r, path: e.target.value} : r) })}
                        className="flex-1 bg-slate-800 border-none text-[11px] font-mono rounded-lg py-1.5 px-4 text-primary outline-none focus:ring-1 focus:ring-primary/40"
                      />
                   </div>
                   <div className="flex-1 relative overflow-hidden flex">
                      <div className="w-10 bg-sidebar-dark/20 border-r border-slate-800 flex flex-col items-center py-6 text-[9px] font-mono text-slate-700 select-none">
                        {Array.from({length: 40}).map((_, i) => <span key={i} className="h-5">{i+1}</span>)}
                      </div>
                      <textarea
                        value={activeRoute.handler}
                        onChange={(e) => onUpdate({ routes: state.routes.map(r => r.id === activeRoute.id ? {...r, handler: e.target.value} : r) })}
                        className="flex-1 bg-transparent p-6 outline-none text-[13px] font-mono text-slate-400 resize-none leading-relaxed selection:bg-primary/20"
                        spellCheck={false}
                      />
                   </div>
                 </>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-slate-600">Selecciona una ruta para editar</div>
               )}
            </div>
          ) : (
            /* Thunder Client Simulator */
            <div className="flex h-full">
               {/* Request Builder */}
               <div className="flex-1 flex flex-col border-r border-slate-800 bg-editor-dark p-6 overflow-hidden">
                  <div className="flex gap-2 mb-8">
                     <div className="flex-1 flex border border-slate-800 rounded-xl overflow-hidden shadow-inner group focus-within:border-primary/50 transition-all">
                        <select 
                          value={requestMethod}
                          onChange={(e) => setRequestMethod(e.target.value as any)}
                          className="bg-slate-900 px-4 text-[10px] font-black text-primary outline-none border-r border-slate-800"
                        >
                          <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                        </select>
                        <input 
                          type="text" 
                          value={requestUrl}
                          onChange={(e) => setRequestUrl(e.target.value)}
                          placeholder="http://localhost:4000/api/..."
                          className="flex-1 bg-slate-950 px-4 py-2 text-[12px] font-mono text-slate-300 outline-none"
                        />
                     </div>
                     <button 
                       onClick={handleSend}
                       disabled={isSending}
                       className={`px-8 rounded-xl font-bold text-[12px] shadow-lg transition-all active:scale-95 ${isSending ? 'bg-slate-800 text-slate-500' : 'bg-primary text-white hover:brightness-110 shadow-primary/20'}`}
                     >
                       {isSending ? 'ENVIANDO...' : 'ENVIAR'}
                     </button>
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden">
                     <div className="flex border-b border-slate-800 mb-6 gap-6">
                        {['body', 'headers', 'params'].map((t: any) => (
                          <button 
                            key={t}
                            onClick={() => setTesterTab(t)}
                            className={`pb-3 text-[10px] font-bold uppercase tracking-widest transition-all ${testerTab === t ? 'text-primary border-b-2 border-primary' : 'text-slate-600 hover:text-slate-400'}`}
                          >
                            {t}
                          </button>
                        ))}
                     </div>
                     <div className="flex-1 overflow-hidden relative">
                        {testerTab === 'body' && (
                          <textarea 
                            value={requestBody}
                            onChange={(e) => setRequestBody(e.target.value)}
                            className="w-full h-full bg-slate-950/50 border border-slate-800/50 rounded-2xl p-6 outline-none text-[13px] font-mono text-slate-400 resize-none focus:border-primary/20"
                            spellCheck={false}
                          />
                        )}
                        {testerTab !== 'body' && (
                          <div className="p-8 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-700">
                             <span className="material-symbols-outlined text-4xl mb-4">settings_input_component</span>
                             <p className="text-[11px] font-bold uppercase">No hay configuraciones para {testerTab}</p>
                          </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Response Viewer */}
               <div className="flex-1 flex flex-col bg-sidebar-dark/30 p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Respuesta Servidor</h3>
                     {response && (
                       <div className="flex gap-4">
                          <span className={`text-[10px] font-bold ${response.status < 300 ? 'text-emerald-500' : 'text-red-500'}`}>STATUS: {response.status}</span>
                          <span className="text-[10px] font-bold text-slate-500">TIME: {response.time}ms</span>
                       </div>
                     )}
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden">
                     <div className="flex-1 bg-editor-dark rounded-2xl border border-slate-800 p-6 overflow-y-auto custom-scrollbar font-mono text-[12px]">
                        {response ? (
                          <pre className="text-emerald-400/90 whitespace-pre-wrap">
                            {JSON.stringify(response.data, null, 2)}
                          </pre>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-4 opacity-40">
                             <span className="material-symbols-outlined text-5xl">rocket</span>
                             <p className="text-[11px] font-bold uppercase tracking-tighter">Esperando Request de Lucas</p>
                          </div>
                        )}
                     </div>
                     {response && (
                        <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
                           <h4 className="text-[9px] font-bold text-slate-500 uppercase mb-2">Headers de Respuesta</h4>
                           {Object.entries(response.headers).map(([k, v]) => (
                             <div key={k} className="flex justify-between text-[10px] py-0.5">
                                <span className="text-slate-500 font-bold">{k}:</span>
                                <span className="text-slate-400">{v}</span>
                             </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackendModule;
