import React from 'react';
import { Button } from './ui/button';

interface FrameworkMigrationModalProps {
    fromFramework: string;
    toFramework: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const FrameworkMigrationModal: React.FC<FrameworkMigrationModalProps> = ({
    fromFramework,
    toFramework,
    onConfirm,
    onCancel
}) => {
    return (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-sidebar-dark border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500/10 to-primary/10 border-b border-orange-500/20 p-6">
                    <div className="flex items-center gap-4">
                        <div className="size-14 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-400 border border-orange-500/30">
                            <span className="material-symbols-outlined text-3xl">warning</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">¿Migrar Framework?</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                {fromFramework} → {toFramework}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="bg-editor-dark border border-slate-800 rounded-2xl p-5">
                        <p className="text-slate-300 text-sm leading-relaxed mb-4">
                            Intentaremos <span className="text-primary font-bold">migrar automáticamente</span> tu código actual a {toFramework}.
                        </p>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-green-400 text-lg mt-0.5">check_circle</span>
                                <div>
                                    <p className="text-xs font-bold text-green-400">HTML y CSS se preservarán</p>
                                    <p className="text-[10px] text-slate-500">Tu estructura y estilos se mantendrán</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-yellow-400 text-lg mt-0.5">info</span>
                                <div>
                                    <p className="text-xs font-bold text-yellow-400">JavaScript requiere adaptación</p>
                                    <p className="text-[10px] text-slate-500">Puede haber errores que deberás corregir manualmente</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-orange-400 text-lg mt-0.5">code</span>
                                <div>
                                    <p className="text-xs font-bold text-orange-400">Revisa el código migrado</p>
                                    <p className="text-[10px] text-slate-500">Asegúrate de que todo funcione correctamente</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                        <p className="text-[11px] text-orange-300 font-medium flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">lightbulb</span>
                            <span>Tip: Guarda tu progreso desplegando el proyecto antes de migrar</span>
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 flex gap-3">
                    <Button
                        onClick={onCancel}
                        variant="ghost"
                        className="flex-1 py-6 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl font-bold"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="flex-1 py-6 bg-primary hover:brightness-110 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        Migrar Código
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default FrameworkMigrationModal;
