
import React, { useState } from 'react';

const steps = [
  {
    title: "Bienvenido a DevPlayground",
    desc: "Esta es una plataforma Full-Stack 100% interactiva. Aquí puedes crear aplicaciones completas en un solo lugar.",
    icon: "waving_hand"
  },
  {
    title: "Frontend & Previsualización",
    desc: "Escribe HTML, CSS y JS. Puedes elegir entre Vanilla, React o Vue. El panel derecho muestra los cambios en tiempo real.",
    icon: "web"
  },
  {
    title: "Backend & API Simulada",
    desc: "Define tus propios endpoints GET/POST. El frontend puede hacer 'fetch' a estas rutas si activas la conexión.",
    icon: "storage"
  },
  {
    title: "Base de Datos Visual",
    desc: "Gestiona tablas y datos. Usa el editor SQL o el diseñador visual. Tu backend puede consultar estas tablas dinámicamente.",
    icon: "database"
  },
  {
    title: "Variables de Entorno",
    desc: "En 'Settings' puedes conectar los módulos. Activa 'Connect Backend' para que tu Frontend use tus propias APIs. Hecho por Lucas Roman.",
    icon: "settings"
  }
];

const TutorialOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-sidebar-dark border border-primary/30 w-full max-w-lg rounded-2xl shadow-primary/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="h-1 bg-slate-800 w-full">
           <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
           />
        </div>
        
        <div className="p-8 text-center">
          <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary border border-primary/20">
            <span className="material-symbols-outlined text-4xl">{steps[currentStep].icon}</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">{steps[currentStep].title}</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            {steps[currentStep].desc}
          </p>
          
          <div className="flex gap-4">
            {currentStep > 0 && (
              <button 
                onClick={() => setCurrentStep(s => s - 1)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-white transition-colors"
              >
                Anterior
              </button>
            )}
            <button 
              onClick={next}
              className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              {currentStep === steps.length - 1 ? '¡Comenzar!' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
