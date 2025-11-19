import React, { useState } from 'react';
import Scene from './components/Scene';
import { Layers, ZoomIn, Info, Box, Cpu, Database, Grid3X3, Flame } from 'lucide-react';
import { ComponentType, HighlightState } from './types';

const App: React.FC = () => {
  const [exploded, setExploded] = useState<number>(0);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showThermal, setShowThermal] = useState<boolean>(false);
  const [hoveredPart, setHoveredPart] = useState<ComponentType | null>(null);
  
  // Manually selected highlights via UI buttons
  const [selectedPart, setSelectedPart] = useState<ComponentType | null>(null);

  // Derived highlight state combining hover and selection
  const highlights: HighlightState = {
    substrate: selectedPart === ComponentType.SUBSTRATE || hoveredPart === ComponentType.SUBSTRATE,
    interposer: selectedPart === ComponentType.INTERPOSER || hoveredPart === ComponentType.INTERPOSER,
    logic: selectedPart === ComponentType.LOGIC || hoveredPart === ComponentType.LOGIC,
    hbm: selectedPart === ComponentType.HBM || hoveredPart === ComponentType.HBM,
    bumps: selectedPart === ComponentType.BUMPS || hoveredPart === ComponentType.BUMPS,
  };

  const partDetails = {
    [ComponentType.SUBSTRATE]: "The ABF (Ajinomoto Build-up Film) Substrate acts as the base, providing mechanical stability and routing signals from the chip package to the PCB via BGA balls.",
    [ComponentType.INTERPOSER]: "The Silicon Interposer is a passive silicon layer containing Through-Silicon Vias (TSVs). It allows high-density interconnects between the Logic die and HBM that wouldn't be possible on a standard organic substrate.",
    [ComponentType.LOGIC]: "Dual Logic Dies (SoC/ASIC) form the computational core. Placed side-by-side, they communicate via the interposer's ultra-short wiring.",
    [ComponentType.HBM]: "8 High Bandwidth Memory (HBM3e) stacks provide massive memory capacity and throughput, critical for AI training and inference workloads.",
    [ComponentType.BUMPS]: "Micro Bumps (top) and C4 Bumps (bottom) are the solder connections. Micro bumps allow extremely high I/O density between the dies and the interposer."
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      
      {/* Header */}
      <header className="absolute top-0 left-0 z-10 p-6 w-full flex justify-between items-start pointer-events-none">
        <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            CoWoS Architecture
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
            Advanced Packaging: 2x Logic Dies + 8x HBM Stacks
            </p>
        </div>
        <div className="pointer-events-auto flex gap-2">
           <a 
             href="https://www.tsmc.com/english/dedicatedFoundry/technology/advanced_packaging" 
             target="_blank" 
             rel="noreferrer"
             className="bg-slate-800/80 backdrop-blur hover:bg-slate-700 border border-slate-700 text-xs px-3 py-2 rounded-full transition-colors"
           >
             Reference: TSMC CoWoS
           </a>
        </div>
      </header>

      {/* Main 3D Viewport */}
      <main className="flex-1 relative">
        <Scene 
            exploded={exploded} 
            opacity={1} 
            showLabels={showLabels} 
            showThermal={showThermal}
            highlights={highlights}
            onHover={setHoveredPart}
        />
      </main>

      {/* Overlay UI Controls */}
      <aside className="absolute top-24 left-6 z-10 flex flex-col gap-4 w-72 pointer-events-none">
        
        {/* Component List / Legend */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl pointer-events-auto">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers size={14} /> Layers
            </h3>
            <div className="space-y-1">
                {[
                    { id: ComponentType.LOGIC, icon: Cpu, color: 'text-blue-400' },
                    { id: ComponentType.HBM, icon: Database, color: 'text-gray-300' },
                    { id: ComponentType.INTERPOSER, icon: Grid3X3, color: 'text-slate-400' },
                    { id: ComponentType.BUMPS, icon: Box, color: 'text-yellow-500' },
                    { id: ComponentType.SUBSTRATE, icon: Layers, color: 'text-emerald-500' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setSelectedPart(selectedPart === item.id ? null : item.id)}
                        onMouseEnter={() => setHoveredPart(item.id)}
                        onMouseLeave={() => setHoveredPart(null)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-3 border
                        ${highlights[Object.keys(highlights).find(k => ComponentType[k.toUpperCase() as keyof typeof ComponentType] === item.id) as keyof HighlightState] 
                            ? 'bg-slate-700/50 border-slate-500 text-white shadow-lg' 
                            : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                    >
                        <item.icon size={16} className={item.color} />
                        {item.id}
                    </button>
                ))}
            </div>
        </div>

        {/* Contextual Info Card */}
        {(hoveredPart || selectedPart) && (
             <div className="bg-slate-900/90 backdrop-blur-md border-l-4 border-blue-500 rounded-r-xl p-4 shadow-2xl pointer-events-auto transition-all animate-in slide-in-from-left-4 duration-300">
                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <Info size={14} />
                    {hoveredPart || selectedPart}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                    {partDetails[hoveredPart || selectedPart || ComponentType.LOGIC]}
                </p>
             </div>
        )}

      </aside>

      {/* Bottom Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-3xl px-6 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl flex items-center gap-6 pointer-events-auto justify-between">
            
            {/* Explode Slider */}
            <div className="flex-1">
                <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                    <span className="flex items-center gap-2"><ZoomIn size={14}/> Assembly View</span>
                    <span className="flex items-center gap-2">Exploded View <Layers size={14}/></span>
                </div>
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01"
                    value={exploded}
                    onChange={(e) => setExploded(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                />
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6 border-l border-slate-700 pl-6">
                
                {/* Labels Toggle */}
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                        <input 
                            type="checkbox" 
                            checked={showLabels} 
                            onChange={(e) => setShowLabels(e.target.checked)}
                            className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-slate-700 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                        <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-4 transition-transform"></div>
                    </div>
                    <span className="text-xs font-medium text-slate-300 group-hover:text-white">Labels</span>
                </label>

                {/* Thermal Mode Toggle */}
                <button 
                  onClick={() => setShowThermal(!showThermal)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium
                    ${showThermal 
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]' 
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                    }`}
                >
                   <Flame size={14} className={showThermal ? 'animate-pulse' : ''} />
                   Thermal Sim
                </button>

            </div>

        </div>
      </div>

    </div>
  );
};

export default App;
