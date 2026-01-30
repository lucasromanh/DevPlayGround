
import React, { useState } from 'react';
import { ProjectState } from '../types';

interface HeaderProps {
  project: ProjectState;
  onDeploy: () => void;
  isDeploying: boolean;
  onUpdateName: (name: string) => void;
}

const Header: React.FC<HeaderProps> = ({ project, onDeploy, isDeploying, onUpdateName }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-sidebar-dark px-6 py-2.5 shrink-0 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_rgba(19,164,236,0.3)]">
            <span className="material-symbols-outlined text-[20px]">code_blocks</span>
          </div>
          <h2 className="text-white text-lg font-bold tracking-tight select-none">DevPlayground</h2>
        </div>
        <div className="h-5 w-px bg-slate-800"></div>
        <div className="flex items-center gap-2 group">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Proyecto:</span>
          {isEditing ? (
            <input 
              autoFocus
              className="bg-editor-dark border border-primary/50 rounded px-2 py-0.5 text-xs font-bold text-primary outline-none min-w-[150px]"
              value={project.name}
              onChange={(e) => onUpdateName(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            />
          ) : (
            <span 
              onClick={() => setIsEditing(true)}
              className="text-xs font-bold text-slate-300 hover:text-primary cursor-pointer transition-colors border-b border-transparent hover:border-primary/30"
            >
              {project.name}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-5">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-500/5 border border-green-500/20 text-green-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
          <span className={`size-1.5 rounded-full bg-green-500 ${isDeploying ? 'animate-ping' : 'animate-pulse'}`}></span>
          Motor Activo
        </div>
        <button 
          onClick={onDeploy}
          disabled={isDeploying}
          className={`flex items-center gap-2 px-5 py-1.5 text-white text-[11px] font-bold rounded-lg transition-all ${
            isDeploying ? 'bg-slate-700' : 'bg-primary hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isDeploying ? 'hourglass_top' : 'rocket_launch'}
          </span>
          {isDeploying ? 'DESPLEGANDO...' : 'DESPLEGAR'}
        </button>
      </div>
    </header>
  );
};

export default Header;
