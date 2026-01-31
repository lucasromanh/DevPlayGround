import React, { useState, useEffect, useMemo } from 'react';
import { ProjectState, DbTable, DbColumn } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateDBML, parseDBML } from '../utils/dbParser';
import { SQLEngine, SQLResult } from '../utils/sqlEngine';

interface DatabaseModuleProps {
  state: ProjectState['database'];
  onUpdate: (updates: Partial<ProjectState['database']>) => void;
  sidebarVisible?: boolean;
  onToggleSidebar?: () => void;
}

const DatabaseModule: React.FC<DatabaseModuleProps> = ({
  state, onUpdate, sidebarVisible = true, onToggleSidebar
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'data'>('visual');
  const [subView, setSubView] = useState<'diagram' | 'code'>('diagram');
  const [activeTableId, setActiveTableId] = useState<string>(state.tables[0]?.id || '');
  const [dbmlText, setDbmlText] = useState(generateDBML(state.tables));
  const [sqlQuery, setSqlQuery] = useState('-- Escribe tu SQL aquí de Lucas\nSELECT * FROM usuarios;');
  const [sqlResults, setSqlResults] = useState<SQLResult[]>([]);
  const [highlightedTableId, setHighlightedTableId] = useState<string | null>(null);
  const [isConfiguringTable, setIsConfiguringTable] = useState<DbTable | null>(null);
  const [relationships, setRelationships] = useState<{ x1: number, y1: number, x2: number, y2: number }[]>([]);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<{ id: string, startX: number, startY: number, tableX: number, tableY: number } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Calcular líneas de relación
  useEffect(() => {
    if (viewMode !== 'visual' || subView !== 'diagram') return;

    const updateLinks = () => {
      if (!containerRef.current) return;
      const canvas = containerRef.current.querySelector('.diagram-canvas');
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const newRels: any[] = [];

      state.tables.forEach(table => {
        table.columns.forEach(col => {
          if (col.isForeignKey && col.references) {
            const fromEl = document.querySelector(`[data-table="${table.name}"][data-column="${col.name}"]`);
            const toEl = document.querySelector(`[data-table="${col.references.table}"][data-column="${col.references.column}"]`);

            if (fromEl && toEl) {
              const rect1 = fromEl.getBoundingClientRect();
              const rect2 = toEl.getBoundingClientRect();

              // Coordenadas relativas al canvas, compensando el zoom
              newRels.push({
                x1: (rect1.left + rect1.width - canvasRect.left) / zoom,
                y1: (rect1.top + rect1.height / 2 - canvasRect.top) / zoom,
                x2: (rect2.left - canvasRect.left) / zoom,
                y2: (rect2.top + rect2.height / 2 - canvasRect.top) / zoom
              });
            }
          }
        });
      });
      setRelationships(newRels);
    };

    const timer = setTimeout(updateLinks, 100);
    window.addEventListener('resize', updateLinks);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateLinks);
    };
  }, [state.tables, viewMode, subView, zoom]);

  // Manejo de Drag and Drop manual
  const handleMouseDown = (e: React.MouseEvent, table: DbTable) => {
    if ((e.target as HTMLElement).closest('.config-btn')) return;
    setDragging({
      id: table.id,
      startX: e.clientX,
      startY: e.clientY,
      tableX: table.position?.x || 0,
      tableY: table.position?.y || 0
    });
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;

      const newTables = state.tables.map(t =>
        t.id === dragging.id
          ? { ...t, position: { x: dragging.tableX + dx, y: dragging.tableY + dy } }
          : t
      );
      onUpdate({ tables: newTables });
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, zoom, state.tables]);

  // Sincronizar texto de esquema cuando cambian las tablas externamente (UI)
  useEffect(() => {
    setDbmlText(generateDBML(state.tables));
  }, [state.tables]);

  const handleDbmlChange = (text: string) => {
    setDbmlText(text);
    try {
      const newTables = parseDBML(text, state.tables);
      onUpdate({ tables: newTables });
    } catch (e) {
      // Silently fail syntax errors while typing
    }
  };

  const activeTable = state.tables.find(t => t.id === activeTableId);

  const executeSQL = () => {
    // Seguridad para DROP TABLE
    if (sqlQuery.toUpperCase().includes('DROP TABLE')) {
      if (!window.confirm("¿Estás seguro de que deseas eliminar una tabla? Esta acción no se puede deshacer.")) {
        setSqlResults([{ success: false, message: "Operación cancelada por el usuario.", statement: "DROP TABLE" }]);
        return;
      }
    }

    const engine = new SQLEngine(state.tables);
    const { results, updatedTables } = engine.execute(sqlQuery);
    setSqlResults(results);

    // Si hubo cambios en los datos o en la estructura (DDL), actualizamos el estado global
    // Comparamos si las tablas cambiaron de alguna forma (serialización simple para demo)
    if (JSON.stringify(updatedTables) !== JSON.stringify(state.tables)) {
      onUpdate({ tables: updatedTables });
      setDbmlText(generateDBML(updatedTables));
    }
  };

  const handleUpdateTable = (table: DbTable) => {
    const newTables = state.tables.map(t => t.id === table.id ? table : t);
    onUpdate({ tables: newTables });
    setDbmlText(generateDBML(newTables));
    setIsConfiguringTable(null);
  };

  const addTable = () => {
    const name = `nueva_tabla_${state.tables.length + 1}`;
    const newTable: DbTable = {
      id: `t-${Date.now()}`,
      name,
      columns: [{ name: 'id', type: 'INT', isPrimary: true, autoIncrement: true }],
      rows: [],
      position: { x: 50 + (state.tables.length * 40), y: 50 + (state.tables.length * 40) }
    };
    const updated = [...state.tables, newTable];
    onUpdate({ tables: updated });
    setDbmlText(generateDBML(updated));
    setActiveTableId(newTable.id);
  };

  const deleteTable = (id: string) => {
    const updated = state.tables.filter(t => t.id !== id);
    onUpdate({ tables: updated });
    setDbmlText(generateDBML(updated));
    if (activeTableId === id) setActiveTableId(updated[0]?.id || '');
  };

  return (
    <div className="flex h-full overflow-hidden bg-background-dark">
      {/* SIDEBAR */}
      <aside className={`border-r border-slate-800 bg-sidebar-dark p-5 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${sidebarVisible ? 'w-64' : 'w-0 opacity-0 overflow-hidden'}`}>
        <div className="flex items-center justify-between mb-5 px-2">
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Esquema de Tablas</h3>
          <Button variant="ghost" size="sm" onClick={addTable} className="h-6 w-6 p-0 hover:bg-slate-800 text-slate-400">
            <span className="material-symbols-outlined text-[16px]">add_box</span>
          </Button>
        </div>
        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="flex flex-col gap-1">
            {state.tables.map(t => (
              <div key={t.id} className="group relative">
                <Button
                  variant={activeTableId === t.id ? "secondary" : "ghost"}
                  onClick={() => {
                    setActiveTableId(t.id);
                    setHighlightedTableId(t.id);
                    // Reset highlight after a while
                    setTimeout(() => setHighlightedTableId(null), 2000);
                  }}
                  className={`w-full justify-start px-4 py-6 rounded-xl text-xs font-bold flex items-center gap-3 transition-all ${activeTableId === t.id ? 'bg-primary/15 text-primary border border-primary/20 shadow-lg shadow-primary/5' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">table_rows</span>
                  <span className="truncate flex-1 text-left">{t.name}</span>
                </Button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => setIsConfiguringTable(t)} className="h-6 w-6 p-0 text-slate-500 hover:text-white">
                    <span className="material-symbols-outlined text-sm">settings</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteTable(t.id)} className="h-6 w-6 p-0 text-slate-500 hover:text-red-400">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="h-12 border-b border-slate-800 flex items-center justify-between px-6 bg-sidebar-dark shrink-0 z-10 shadow-md">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="h-7 w-7 p-0 hover:bg-slate-800 text-slate-500 hover:text-white">
              <span className="material-symbols-outlined text-[20px]">{sidebarVisible ? 'vertical_split' : 'format_indent_increase'}</span>
            </Button>
            <div className="flex bg-editor-dark p-1 rounded-xl border border-slate-800">
              <Button size="sm" variant="ghost" onClick={() => setViewMode('visual')} className={`px-5 py-0.5 text-[11px] font-bold rounded-lg transition-all h-7 ${viewMode === 'visual' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>DISEÑADOR VISUAL</Button>
              <Button size="sm" variant="ghost" onClick={() => setViewMode('data')} className={`px-5 py-0.5 text-[11px] font-bold rounded-lg transition-all h-7 ${viewMode === 'data' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>EXPLORADOR DE DATOS</Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {viewMode === 'visual' ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Subtabs for Visual View */}
              <div className="flex-1 flex flex-col relative">
                <div className="h-10 border-b border-slate-800/50 bg-sidebar-dark/40 flex items-center px-6 gap-6">
                  <Button variant="ghost" size="sm" onClick={() => setSubView('diagram')} className={`text-[10px] font-bold gap-2 ${subView === 'diagram' ? 'text-primary' : 'text-slate-500'}`}>
                    <span className="material-symbols-outlined text-sm">schema</span> DIAGRAMA ER
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSubView('code')} className={`text-[10px] font-bold gap-2 ${subView === 'code' ? 'text-primary' : 'text-slate-500'}`}>
                    <span className="material-symbols-outlined text-sm">code</span> CÓDIGO DBML
                  </Button>

                  {subView === 'diagram' && (
                    <div className="ml-auto flex items-center gap-2 bg-black/20 rounded-lg p-1 border border-white/5">
                      <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                        <span className="material-symbols-outlined text-sm">zoom_out</span>
                      </Button>
                      <span className="text-[10px] font-mono w-10 text-center text-slate-500">{Math.round(zoom * 100)}%</span>
                      <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.min(2, prev + 0.1))} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                        <span className="material-symbols-outlined text-sm">zoom_in</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setZoom(1)} className="h-6 px-2 text-[9px] text-slate-500 hover:text-white">100%</Button>
                    </div>
                  )}
                </div>
                <div ref={containerRef} className="flex-1 relative overflow-auto bg-slate-900/40 custom-scrollbar select-none">
                  {subView === 'diagram' ? (
                    <div
                      className="diagram-canvas relative min-w-[3000px] min-h-[3000px] origin-top-left transition-transform duration-75 ease-out"
                      style={{ transform: `scale(${zoom})` }}
                    >
                      {/* SVG Overlay for relationship lines */}
                      <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
                        {relationships.map((rel, i) => (
                          <g key={i}>
                            <path
                              d={`M ${rel.x1} ${rel.y1} C ${rel.x1 + 60} ${rel.y1}, ${rel.x2 - 60} ${rel.y2}, ${rel.x2} ${rel.y2}`}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth={2 / zoom}
                              strokeDasharray={`${4 / zoom} ${2 / zoom}`}
                              className="opacity-60"
                            />
                            <circle cx={rel.x1} cy={rel.y1} r={3 / zoom} fill="#10b981" />
                            <circle cx={rel.x2} cy={rel.y2} r={3 / zoom} fill="#10b981" />
                          </g>
                        ))}
                      </svg>

                      {state.tables.map(t => {
                        const posX = t.position?.x ?? (state.tables.indexOf(t) * 300 + 50);
                        const posY = t.position?.y ?? 50;

                        return (
                          <Card
                            key={t.id}
                            style={{ left: posX, top: posY, position: 'absolute' }}
                            className={`w-64 bg-sidebar-dark border-slate-800 rounded-2xl shadow-2xl h-fit overflow-hidden hover:border-primary/40 transition-all group z-10 ${activeTableId === t.id ? 'ring-2 ring-primary/20 border-primary/30 shadow-primary/10' : ''} ${highlightedTableId === t.id ? 'scale-105 ring-4 ring-emerald-500/50 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : ''}`}
                            onClick={() => setActiveTableId(t.id)}
                          >
                            <div
                              onMouseDown={(e) => handleMouseDown(e, t)}
                              className="bg-primary/10 px-4 py-3 border-b border-slate-800 text-[11px] font-bold text-primary uppercase flex justify-between items-center cursor-grab active:cursor-grabbing select-none"
                            >
                              <span>{t.name}</span>
                              <span onClick={(e) => { e.stopPropagation(); setIsConfiguringTable(t); }} className="config-btn material-symbols-outlined text-sm cursor-pointer text-slate-500 hover:text-white transition-colors">settings</span>
                            </div>
                            <div className="p-0">
                              {t.columns.map(c => (
                                <div key={c.name} data-table={t.name} data-column={c.name} className="flex justify-between px-4 py-2.5 text-[11px] border-b border-slate-800/30 group/col relative">
                                  <span className="text-slate-200 flex items-center gap-1.5 font-medium pointer-events-none">
                                    {c.isPrimary && <span className="material-symbols-outlined text-[14px] text-yellow-500 leading-none">key</span>}
                                    {c.isForeignKey && <span className="material-symbols-outlined text-[14px] text-emerald-500 leading-none">link</span>}
                                    {c.name}
                                  </span>
                                  <span className="text-slate-600 font-mono text-[9px] uppercase pointer-events-none">{c.type}</span>
                                </div>
                              ))}
                            </div>
                          </Card>
                        );
                      })}
                      {state.tables.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 opacity-20">
                          <span className="material-symbols-outlined text-8xl">database</span>
                          <p className="font-bold uppercase tracking-widest mt-4">Crea una tabla para empezar</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={dbmlText}
                      onChange={(e) => handleDbmlChange(e.target.value)}
                      className="w-full h-full bg-editor-dark/80 backdrop-blur rounded-2xl p-8 outline-none text-sm font-mono text-primary resize-none border border-slate-800 shadow-2xl leading-relaxed"
                      spellCheck={false}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-8 bg-editor-dark/20 overflow-auto">
              <Card className="bg-sidebar-dark border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full border">
                {activeTable ? (
                  <>
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-black/10">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">{activeTable.name}</Badge>
                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">COUNT: {activeTable.rows.length}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const newRow = activeTable.columns.reduce((acc, col) => ({ ...acc, [col.name]: col.autoIncrement ? activeTable.rows.length + 1 : '' }), {});
                          onUpdate({ tables: state.tables.map(t => t.id === activeTable.id ? { ...t, rows: [...t.rows, newRow] } : t) });
                        }}
                        className="text-[10px] bg-primary text-white px-4 py-1.5 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all hover:brightness-110"
                      >
                        + INSERTAR FILA
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <Table>
                        <TableHeader className="bg-editor-dark/50">
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            {activeTable.columns.map(c => (
                              <TableHead key={c.name} className="px-6 py-4 text-slate-500 font-bold uppercase text-[9px] tracking-widest border-b border-slate-800">
                                <div className="flex items-center gap-1.5">
                                  {c.name}
                                  {c.isPrimary && <span className="material-symbols-outlined text-xs text-yellow-500/50">key</span>}
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="w-10 border-b border-slate-800"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeTable.rows.map((row, rIdx) => (
                            <TableRow key={rIdx} className="border-slate-800/40 hover:bg-slate-800/10 transition-colors">
                              {activeTable.columns.map(c => (
                                <TableCell key={c.name} className="px-6 py-1 border-slate-800/20">
                                  <input
                                    className="bg-transparent border-none outline-none text-slate-300 w-full focus:bg-primary/10 rounded px-2 py-1.5 transition-all text-sm font-mono"
                                    value={row[c.name]}
                                    onChange={(e) => {
                                      const newTables = state.tables.map(t => {
                                        if (t.id === activeTable.id) {
                                          const newRows = [...t.rows];
                                          newRows[rIdx] = { ...newRows[rIdx], [c.name]: e.target.value };
                                          return { ...t, rows: newRows };
                                        }
                                        return t;
                                      });
                                      onUpdate({ tables: newTables });
                                    }}
                                  />
                                </TableCell>
                              ))}
                              <TableCell className="px-6 py-1 text-center">
                                <Button variant="ghost" size="sm" onClick={() => {
                                  onUpdate({ tables: state.tables.map(t => t.id === activeTable.id ? { ...t, rows: t.rows.filter((_, i) => i !== rIdx) } : t) });
                                }} className="h-6 w-6 p-0 text-slate-600 hover:text-red-400"><span className="material-symbols-outlined text-sm">close</span></Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-20 opacity-20">
                    <span className="material-symbols-outlined text-8xl">table_view</span>
                    <p className="font-bold uppercase tracking-widest mt-4 text-center">Selecciona una tabla para explorar sus datos</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* SQL TERMINAL AREA */}
          <div className="h-56 border-t border-slate-800 bg-sidebar-dark/80 flex flex-col shrink-0 relative">
            <div className="px-4 py-2 border-b border-slate-800 flex justify-between items-center bg-black/40">
              <span className="text-[9px] font-black text-slate-500 tracking-[0.2em] uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">terminal</span>
                Consola SQL Simulada
              </span>
              <div className="flex items-center gap-4">
                <Button onClick={executeSQL} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black px-6 h-7 rounded-lg shadow-lg shadow-emerald-900/20">EJECUTAR</Button>
              </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="flex-1 bg-transparent p-4 outline-none text-[12px] font-mono text-primary resize-none selection:bg-primary/20 leading-relaxed border-r border-slate-800/50"
                spellCheck={false}
              />
              <div className="w-1/3 bg-black/20 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-slate-800/50 text-[8px] font-black uppercase text-slate-600 tracking-widest text-center">Log de Ejecución</div>
                <ScrollArea className="flex-1">
                  <div className="p-4 font-mono text-[10px] space-y-4">
                    {sqlResults.length > 0 ? (
                      sqlResults.map((res, i) => (
                        <div key={i} className={`p-2 rounded border ${res.success ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                          <div className="text-[8px] opacity-60 mb-1 font-bold truncate">SQL: {res.statement}</div>
                          <div className="font-bold mb-1">{res.message}</div>
                          {res.error && <div className="text-red-500 mt-1 italic">{res.error}</div>}
                          {res.data && res.data.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {res.data.slice(0, 3).map((row, r) => (
                                <div key={r} className="bg-black/20 p-1 rounded text-[9px] truncate">
                                  {JSON.stringify(row)}
                                </div>
                              ))}
                              {res.data.length > 3 && <div className="text-[8px] text-center italic text-slate-500">+ {res.data.length - 3} filas...</div>}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-700 text-center pt-8">Esperando comandos SQL...</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIGURATION MODAL */}
      <Dialog open={!!isConfiguringTable} onOpenChange={(open) => !open && setIsConfiguringTable(null)}>
        <DialogContent className="bg-sidebar-dark border-slate-800 text-white max-w-2xl rounded-2xl shadow-2xl p-0 overflow-hidden">
          {isConfiguringTable && (
            <div className="flex flex-col h-[70vh]">
              <DialogHeader className="p-6 border-b border-slate-800 bg-primary/5">
                <div className="flex items-center gap-4">
                  <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                    <span className="material-symbols-outlined text-2xl">settings</span>
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">Configurar Tabla: {isConfiguringTable.name}</DialogTitle>
                    <DialogDescription className="text-slate-500">Administra las columnas y relaciones de la tabla.</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-8">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nombre de la Tabla</label>
                    <Input
                      value={isConfiguringTable.name}
                      onChange={(e) => setIsConfiguringTable({ ...isConfiguringTable, name: e.target.value })}
                      className="bg-editor-dark border-slate-800 rounded-xl font-bold text-primary"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Columnas (Estructura)</label>
                      <Button size="sm" variant="outline" onClick={() => {
                        const newCol: DbColumn = { name: `col_${isConfiguringTable.columns.length + 1}`, type: 'VARCHAR(100)' };
                        setIsConfiguringTable({ ...isConfiguringTable, columns: [...isConfiguringTable.columns, newCol] });
                      }} className="h-7 text-[10px] border-primary/20 text-primary hover:bg-primary/5">+ AGREGAR COLUMNA</Button>
                    </div>
                    <div className="space-y-4">
                      {isConfiguringTable.columns.map((col, idx) => (
                        <div key={idx} className="p-4 bg-editor-dark/50 border border-slate-800 rounded-2xl space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[8px] font-bold text-slate-600 mb-1 block uppercase">Nombre</label>
                              <Input
                                value={col.name}
                                onChange={(e) => {
                                  const cols = [...isConfiguringTable.columns];
                                  cols[idx] = { ...col, name: e.target.value.toLowerCase() };
                                  setIsConfiguringTable({ ...isConfiguringTable, columns: cols });
                                }}
                                className="h-8 bg-black/20 border-slate-800 text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-bold text-slate-600 mb-1 block uppercase">Tipo</label>
                              <Select value={col.type} onValueChange={(v) => {
                                const cols = [...isConfiguringTable.columns];
                                cols[idx] = { ...col, type: v };
                                setIsConfiguringTable({ ...isConfiguringTable, columns: cols });
                              }}>
                                <SelectTrigger className="h-8 bg-black/20 border-slate-800 text-xs font-mono">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-sidebar-dark border-slate-800">
                                  {[
                                    'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
                                    'VARCHAR(50)', 'VARCHAR(100)', 'VARCHAR(255)', 'TEXT', 'JSON',
                                    'BOOLEAN', 'DATE', 'DATETIME', 'TIMESTAMP',
                                    'FLOAT', 'DOUBLE', 'DECIMAL(10,2)', 'NUMERIC',
                                    'UUID', 'BLOB'
                                  ].map(t => (
                                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input type="checkbox" checked={col.isPrimary} onChange={(e) => {
                                const cols = [...isConfiguringTable.columns];
                                cols[idx] = { ...col, isPrimary: e.target.checked };
                                setIsConfiguringTable({ ...isConfiguringTable, columns: cols });
                              }} className="size-3.5 accent-primary" />
                              <span className="text-[10px] font-bold text-slate-400 group-hover:text-yellow-500 transition-colors flex items-center gap-1">PK <span className="material-symbols-outlined text-xs">key</span></span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input type="checkbox" checked={col.autoIncrement} onChange={(e) => {
                                const cols = [...isConfiguringTable.columns];
                                cols[idx] = { ...col, autoIncrement: e.target.checked };
                                setIsConfiguringTable({ ...isConfiguringTable, columns: cols });
                              }} className="size-3.5 accent-primary" />
                              <span className="text-[10px] font-bold text-slate-400">INCREMENTAL</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input type="checkbox" checked={col.notNull} onChange={(e) => {
                                const cols = [...isConfiguringTable.columns];
                                cols[idx] = { ...col, notNull: e.target.checked };
                                setIsConfiguringTable({ ...isConfiguringTable, columns: cols });
                              }} className="size-3.5 accent-primary" />
                              <span className="text-[10px] font-bold text-slate-400">NOT NULL</span>
                            </label>

                            <Button variant="ghost" size="sm" onClick={() => {
                              const cols = isConfiguringTable.columns.filter((_, i) => i !== idx);
                              setIsConfiguringTable({ ...isConfiguringTable, columns: cols });
                            }} className="h-6 ml-auto hover:bg-red-500/10 hover:text-red-400">
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </Button>
                          </div>

                          <div className="pt-2 border-t border-slate-800/30">
                            <div className="flex items-center gap-4">
                              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Relación FK:</span>
                              <Select value={col.references?.table || 'none'} onValueChange={(v) => {
                                const cols = [...isConfiguringTable.columns];
                                if (v === 'none') {
                                  cols[idx] = { ...col, isForeignKey: false, references: undefined };
                                } else {
                                  cols[idx] = { ...col, isForeignKey: true, references: { table: v, column: 'id' } };
                                }
                                setIsConfiguringTable({ ...isConfiguringTable, columns: cols });
                              }}>
                                <SelectTrigger className="h-7 w-32 bg-black/10 border-slate-800 text-[9px] font-mono">
                                  <SelectValue placeholder="Tabla Destino" />
                                </SelectTrigger>
                                <SelectContent className="bg-sidebar-dark border-slate-800">
                                  <SelectItem value="none">Ninguna</SelectItem>
                                  {state.tables.filter(t => t.id !== isConfiguringTable.id).map(t => (
                                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 border-t border-slate-800 bg-black/20">
                <Button variant="ghost" onClick={() => setIsConfiguringTable(null)} className="text-slate-400">CANCELAR</Button>
                <Button onClick={() => handleUpdateTable(isConfiguringTable)} className="bg-primary text-white font-bold px-10">GUARDAR CAMBIOS</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabaseModule;

