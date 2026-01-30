
import React, { useState } from 'react';
import { ProjectState, DbTable, DbColumn } from '../types';

interface DatabaseModuleProps {
  state: ProjectState['database'];
  onUpdate: (updates: Partial<ProjectState['database']>) => void;
}

const DatabaseModule: React.FC<DatabaseModuleProps> = ({ state, onUpdate }) => {
  const [viewMode, setViewMode] = useState<'visual' | 'data'>('visual');
  const [activeTableId, setActiveTableId] = useState<string>(state.tables[0]?.id || '');
  const [sqlQuery, setSqlQuery] = useState('-- Escribe tu SQL aquí de Lucas\nSELECT * FROM usuarios;');
  const [sqlError, setSqlError] = useState('');

  const activeTable = state.tables.find(t => t.id === activeTableId);

  const executeSQL = () => {
    setSqlError('');
    const query = sqlQuery.trim().toUpperCase();
    
    if (query.includes('SELECT * FROM ')) {
      const tableName = query.split('FROM ')[1].replace(';', '').trim().toLowerCase();
      const table = state.tables.find(t => t.name === tableName);
      if (table) {
        setActiveTableId(table.id);
        setViewMode('data');
      } else setSqlError(`Error: Tabla "${tableName}" no existe.`);
    } else if (query.includes('CREATE TABLE ')) {
       const parts = query.split('CREATE TABLE ')[1].split('(');
       const tableName = parts[0].trim().toLowerCase();
       onUpdate({
         tables: [...state.tables, {
           id: Date.now().toString(),
           name: tableName,
           columns: [{ name: 'id', type: 'INT', isPrimary: true }],
           rows: []
         }]
       });
       setSqlQuery('-- ¡Tabla creada!\n' + sqlQuery);
    } else {
       setSqlError('Comando no soportado en esta versión demo.');
    }
  };

  const updateCell = (tableId: string, rowIdx: number, colName: string, value: any) => {
    const updatedTables = state.tables.map(t => {
      if (t.id === tableId) {
        const newRows = [...t.rows];
        newRows[rowIdx] = { ...newRows[rowIdx], [colName]: value };
        return { ...t, rows: newRows };
      }
      return t;
    });
    onUpdate({ tables: updatedTables });
  };

  const addRow = (tableId: string) => {
    const table = state.tables.find(t => t.id === tableId);
    if (!table) return;
    const newRow = table.columns.reduce((acc, col) => ({ ...acc, [col.name]: col.isPrimary ? table.rows.length + 1 : '' }), {});
    onUpdate({ tables: state.tables.map(t => t.id === tableId ? { ...t, rows: [...t.rows, newRow] } : t) });
  };

  return (
    <div className="flex h-full overflow-hidden bg-background-dark">
      <aside className="w-64 border-r border-slate-800 bg-sidebar-dark p-5">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-5">Esquema de Tablas</h3>
        <div className="flex flex-col gap-1">
          {state.tables.map(t => (
            <button 
              key={t.id} 
              onClick={() => setActiveTableId(t.id)}
              className={`text-left px-4 py-3 rounded-xl text-xs font-bold truncate flex items-center gap-2 transition-all ${
                activeTableId === t.id ? 'bg-primary/15 text-primary border border-primary/20' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">table_rows</span>
              {t.name}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <div className="h-12 border-b border-slate-800 flex items-center justify-between px-6 bg-sidebar-dark">
          <div className="flex bg-editor-dark p-1 rounded-xl border border-slate-800 shadow-inner">
            <button 
              onClick={() => setViewMode('visual')} 
              className={`px-5 py-1 text-[11px] font-bold rounded-lg transition-all ${viewMode === 'visual' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Diseñador Visual
            </button>
            <button 
              onClick={() => setViewMode('data')} 
              className={`px-5 py-1 text-[11px] font-bold rounded-lg transition-all ${viewMode === 'data' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Explorador de Datos
            </button>
          </div>
        </div>

        <div className="flex-1 p-10 overflow-auto bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
          {viewMode === 'visual' ? (
            <div className="flex flex-wrap gap-10">
              {state.tables.map(t => (
                <div key={t.id} className="w-64 bg-sidebar-dark border border-slate-800 rounded-2xl shadow-2xl overflow-hidden hover:border-primary/40 transition-all group">
                  <div className="bg-primary/10 px-4 py-3 border-b border-slate-800 text-[11px] font-bold text-primary uppercase flex justify-between">
                    {t.name}
                    <span className="material-symbols-outlined text-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">settings</span>
                  </div>
                  <div className="p-1">
                    {t.columns.map(c => (
                      <div key={c.name} className="flex justify-between px-4 py-2 text-[11px] border-b border-slate-800/30">
                        <span className="text-slate-200 flex items-center gap-1.5 font-medium">
                          {c.isPrimary && <span className="material-symbols-outlined text-xs text-yellow-500">key</span>}
                          {c.name}
                        </span>
                        <span className="text-slate-500 font-mono text-[9px]">{c.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-sidebar-dark border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full">
              {activeTable ? (
                <>
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-black/10">
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Tabla: {activeTable.name}</span>
                    <button onClick={() => addRow(activeTable.id)} className="text-[10px] bg-primary text-white px-4 py-1.5 rounded-lg font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">Insertar Fila</button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-editor-dark text-slate-500 font-bold uppercase sticky top-0">
                        <tr>
                          {activeTable.columns.map(c => <th key={c.name} className="px-6 py-3 border-b border-slate-800">{c.name}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {activeTable.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                            {activeTable.columns.map(c => (
                              <td key={c.name} className="px-6 py-2">
                                <input 
                                  className="bg-transparent border-none outline-none text-slate-300 w-full focus:bg-primary/5 rounded px-2 py-1 transition-all"
                                  value={row[c.name]}
                                  onChange={(e) => updateCell(activeTable.id, rIdx, c.name, e.target.value)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 flex-col gap-3">
                  <span className="material-symbols-outlined text-5xl">database_off</span>
                  <p className="text-sm font-medium">Selecciona una tabla para ver datos</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-48 border-t border-slate-800 bg-sidebar-dark flex flex-col">
          <div className="px-4 py-2 border-b border-slate-800 flex justify-between items-center bg-black/20">
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">code</span>
              Consola SQL Interactiva
            </span>
            <div className="flex items-center gap-4">
              {sqlError && <span className="text-[10px] text-red-400 font-bold animate-pulse">{sqlError}</span>}
              <button onClick={executeSQL} className="px-5 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-all">EJECUTAR</button>
            </div>
          </div>
          <textarea 
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            className="flex-1 bg-transparent p-4 outline-none text-sm font-mono text-primary resize-none selection:bg-primary/20 leading-relaxed"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};

export default DatabaseModule;
