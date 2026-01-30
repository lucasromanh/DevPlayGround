
import React from 'react';
import { AppTab, DeployedProject } from '../types';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onNewProject: () => void;
  onOpenEnv: () => void;
  onOpenTutorial: () => void;
  deployedProjects: DeployedProject[];
  onLoadProject: (p: DeployedProject) => void;
  onOpenWeb: (p: DeployedProject) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  onNewProject, 
  onOpenEnv, 
  onOpenTutorial,
  deployedProjects,
  onLoadProject,
  onOpenWeb
}) => {
  return (
    <aside className="w-64 bg-sidebar-dark border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-5 flex flex-col gap-8 flex-1 overflow-hidden">
        <div>
          <h3 className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-4 ml-2">Explorador</h3>
          <nav className="flex flex-col gap-1">
            {[
              { id: 'frontend', icon: 'web', label: 'Interfaz (Frontend)' },
              { id: 'backend', icon: 'dns', label: 'Servidor (Backend)' },
              { id: 'database', icon: 'database', label: 'Base de Datos' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AppTab)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  activeTab === item.id 
                    ? 'bg-primary/15 text-primary border border-primary/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span className="text-[12px] font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between mb-3 px-2">
            <h3 className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Mis Proyectos</h3>
            <span className="bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {deployedProjects.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
            {deployedProjects.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center">
                <p className="text-[10px] text-slate-600 font-medium">No hay proyectos desplegados aún.</p>
              </div>
            ) : (
              deployedProjects.map(proj => (
                <div 
                  key={proj.id}
                  className="group flex flex-col gap-1 p-2 bg-editor-dark/50 border border-slate-800 rounded-xl hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span 
                      onClick={() => onLoadProject(proj)}
                      className="text-[11px] font-bold text-slate-300 truncate cursor-pointer hover:text-primary"
                    >
                      {proj.name}
                    </span>
                    <button 
                      onClick={() => onOpenWeb(proj)}
                      className="material-symbols-outlined text-slate-500 hover:text-primary text-[16px] transition-colors"
                    >
                      open_in_new
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[8px] text-slate-600 font-mono">
                      {new Date(proj.timestamp).toLocaleDateString()}
                    </span>
                    <span className="text-[8px] px-1.5 py-0.5 bg-primary/10 text-primary font-bold rounded uppercase">
                      {proj.state.frontend.framework === 'Vanilla JS' ? 'JS' : 'React'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/50">
           <nav className="flex flex-col gap-1">
            <button 
              onClick={onOpenEnv}
              className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span className="text-[11px] font-medium">Entorno (Env)</span>
            </button>
            <button 
              onClick={onOpenTutorial}
              className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">help_center</span>
              <span className="text-[11px] font-medium">Ayuda Lucas</span>
            </button>
           </nav>
        </div>
      </div>
      
      <div className="p-4 border-t border-slate-800 bg-black/10">
        <button 
          onClick={onNewProject}
          className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 text-white rounded-xl text-[11px] font-bold hover:bg-primary transition-all border border-slate-700 hover:border-primary active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
          NUEVO PROYECTO
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
