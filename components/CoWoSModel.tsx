import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { LayerProps, HighlightState, ComponentType } from '../types';

// Updated Dimensions based on Area Calculation
// Total Component Area = ~59.2 units
// Target Interposer Area (1.3x) = ~77 units
// Component Bounding Box approx: 8.9(W) x 7.4(D)
// Interposer set to 9.6 x 8.0 = 76.8 units (Close to 1.3x target)
const DIMS = {
  SUBSTRATE: { w: 12, d: 10.5, h: 0.8 }, // Adjusted to fit Interposer
  INTERPOSER: { w: 9.6, d: 8.0, h: 0.3 },
  // Logic Dies (2 units, Top/Bottom arrangement)
  // "Smaller dimension" of Logic is 3.6
  LOGIC: { w: 5.5, d: 3.6, h: 0.25 }, 
  // HBM Width = 0.4 * Logic Smaller Side (3.6 * 0.4 = 1.44)
  HBM: { w: 1.44, d: 1.7, h: 0.85 }, 
  C4_SIZE: 0.15,
  MICRO_SIZE: 0.05,
};

interface CoWoSModelProps extends LayerProps {
  highlights: HighlightState;
  onHover: (part: ComponentType | null) => void;
}

const CoWoSModel: React.FC<CoWoSModelProps> = ({ exploded, opacity, showLabels, showThermal, highlights, onHover }) => {
  // Animation State
  const logicMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const hbmMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);

  // Calculate dynamic Y positions
  const explosionFactor = exploded * 4;
  const ySubstrate = 0;
  const yC4 = DIMS.SUBSTRATE.h / 2 + DIMS.C4_SIZE + (explosionFactor * 0.15);
  const yInterposer = yC4 + DIMS.C4_SIZE + DIMS.INTERPOSER.h / 2 + (explosionFactor * 0.2);
  const yMicro = yInterposer + DIMS.INTERPOSER.h / 2 + DIMS.MICRO_SIZE + (explosionFactor * 0.25);
  const yDies = yMicro + DIMS.MICRO_SIZE + DIMS.LOGIC.h / 2 + (explosionFactor * 0.3);
  const yHBM = yMicro + DIMS.MICRO_SIZE + DIMS.HBM.h / 2 + (explosionFactor * 0.3);

  // --- Geometry Layout Calculations ---
  
  // Logic Die Positions (Top and Bottom split along Z axis)
  const logicGap = 0.15;
  const logicPositions = [
    { x: 0, z: -(DIMS.LOGIC.d / 2 + logicGap / 2) }, // Top Die (North)
    { x: 0, z: (DIMS.LOGIC.d / 2 + logicGap / 2) }   // Bottom Die (South)
  ];

  // HBM Positions (8 Units: 4 Left, 4 Right)
  // Calculate offset based on new widths to ensure correct gap
  // Center of Logic (0) -> Edge of Logic (w/2) -> Gap (0.25) -> Edge of HBM -> Center of HBM (w/2)
  const hbmGap = 0.25;
  const hbmXOffset = (DIMS.LOGIC.w / 2) + hbmGap + (DIMS.HBM.w / 2); 
  
  // Spacing calculations for 4 units along Z axis
  // Increased spacing to 1.9 to accommodate larger HBM depth (1.7)
  const hbmSpacing = 1.9;
  const hbmStartZ = -((3 * hbmSpacing) / 2); // Center the group of 4 vertically
  
  const hbmPositions: {x: number, z: number}[] = [];
  
  // Left Bank (-X)
  for(let i=0; i<4; i++) hbmPositions.push({ x: -hbmXOffset, z: hbmStartZ + i * hbmSpacing });
  // Right Bank (+X)
  for(let i=0; i<4; i++) hbmPositions.push({ x: hbmXOffset, z: hbmStartZ + i * hbmSpacing });


  // --- Instanced Meshes Setup ---

  // 1. C4 Bumps (Substrate <-> Interposer)
  const c4Ref = useRef<THREE.InstancedMesh>(null);
  const c4Count = 2500; // Approx max count
  const dummyObj = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    if (!c4Ref.current) return;
    let i = 0;
    const gridW = DIMS.INTERPOSER.w * 0.9;
    const gridD = DIMS.INTERPOSER.d * 0.9;
    
    // Calculate rows/cols to keep bumps proportional (approx 0.35 spacing)
    const spacing = 0.35;
    const cols = Math.floor(gridW / spacing);
    const rows = Math.floor(gridD / spacing);
    
    const stepX = gridW / cols;
    const stepZ = gridD / rows;
    
    for (let x = 0; x <= cols; x++) {
      for (let z = 0; z <= rows; z++) {
        // Create a void in the very center for effect
        const cx = -gridW / 2 + x * stepX;
        const cz = -gridD / 2 + z * stepZ;
        
        dummyObj.position.set(cx, 0, cz);
        dummyObj.updateMatrix();
        c4Ref.current.setMatrixAt(i++, dummyObj.matrix);
      }
    }
    // Hide unused instances
    for (let j = i; j < c4Count; j++) {
        dummyObj.position.set(0, -1000, 0);
        dummyObj.updateMatrix();
        c4Ref.current.setMatrixAt(j, dummyObj.matrix);
    }
    c4Ref.current.instanceMatrix.needsUpdate = true;
  }, [dummyObj]);

  // 2. Micro Bumps (Interposer <-> Dies)
  const microRef = useRef<THREE.InstancedMesh>(null);
  const microCount = 15000; 

  useLayoutEffect(() => {
    if (!microRef.current) return;
    
    let idx = 0;
    const bumpSpacing = 0.25; 

    // A. Generate bumps under Logic Dies
    logicPositions.forEach(pos => {
        const cols = Math.floor(DIMS.LOGIC.w / bumpSpacing);
        const rows = Math.floor(DIMS.LOGIC.d / bumpSpacing);
        
        for(let i = 0; i < cols; i++) {
            for(let j = 0; j < rows; j++) {
                const x = pos.x - DIMS.LOGIC.w/2 + (i + 0.5) * bumpSpacing;
                const z = pos.z - DIMS.LOGIC.d/2 + (j + 0.5) * bumpSpacing;
                dummyObj.position.set(x, 0, z);
                dummyObj.scale.set(1,1,1);
                dummyObj.updateMatrix();
                microRef.current.setMatrixAt(idx++, dummyObj.matrix);
            }
        }
    });

    // B. Generate bumps under HBM Stacks
    hbmPositions.forEach(pos => {
        const cols = Math.floor(DIMS.HBM.w / bumpSpacing);
        const rows = Math.floor(DIMS.HBM.d / bumpSpacing);

        for(let i = 0; i < cols; i++) {
            for(let j = 0; j < rows; j++) {
                const x = pos.x - DIMS.HBM.w/2 + (i + 0.5) * bumpSpacing;
                const z = pos.z - DIMS.HBM.d/2 + (j + 0.5) * bumpSpacing;
                dummyObj.position.set(x, 0, z);
                dummyObj.scale.set(1,1,1);
                dummyObj.updateMatrix();
                microRef.current.setMatrixAt(idx++, dummyObj.matrix);
            }
        }
    });

    // Cleanup unused instances
    for(let i = idx; i < microCount; i++) {
         dummyObj.scale.set(0,0,0);
         dummyObj.position.set(0, -1000, 0);
         dummyObj.updateMatrix();
         microRef.current.setMatrixAt(i, dummyObj.matrix);
    }

    microRef.current.instanceMatrix.needsUpdate = true;
  }, [dummyObj, logicPositions, hbmPositions]);

  // 3. Thermal Particles System
  const particleCount = 150;
  const particleData = useMemo(() => {
      return new Array(particleCount).fill(0).map(() => ({
          x: 0, // Set dynamically in loop
          z: 0,
          speed: 0.02 + Math.random() * 0.05,
          offset: Math.random() * 10,
          type: Math.random() > 0.4 ? 'logic' : 'hbm' // Distribute between logic and hbm
      }));
  }, []);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    // 1. Pulse Logic Die Color
    if (logicMatRef.current) {
        if (showThermal) {
            const t = (Math.sin(time * 3) + 1) / 2;
            logicMatRef.current.color.setHSL(0.02 + t * 0.03, 1.0, 0.5); 
            logicMatRef.current.emissive.setHSL(0.02, 1.0, 0.2 + t * 0.3);
            logicMatRef.current.emissiveIntensity = 1;
        } else {
            logicMatRef.current.color.set(highlights.logic ? '#60a5fa' : '#2563eb');
            logicMatRef.current.emissive.setHex(0x000000);
        }
    }

    // 2. Pulse HBM Color
    if (hbmMatRef.current) {
        if (showThermal) {
             const t = (Math.sin(time * 2 + 1) + 1) / 2;
             hbmMatRef.current.color.setHSL(0.1 + t * 0.05, 1.0, 0.5); 
             hbmMatRef.current.emissive.setHSL(0.1, 1.0, 0.1 + t * 0.2);
             hbmMatRef.current.emissiveIntensity = 0.5;
        } else {
            hbmMatRef.current.color.set(highlights.hbm ? '#4b5563' : '#111827');
            hbmMatRef.current.emissive.setHex(0x000000);
        }
    }

    // 3. Animate Heat Particles
    if (particlesRef.current) {
        if (!showThermal) {
            particlesRef.current.visible = false;
        } else {
            particlesRef.current.visible = true;
            
            particleData.forEach((p, i) => {
                 const yRel = (time * p.speed + p.offset) % 3.0; 
                 const scale = 1.0 - (yRel / 3.0); 
                 
                 let x = 0, z = 0;

                 if (p.type === 'logic') {
                     // Random spot on Logic Dies
                     const dieIdx = i % 2;
                     const pos = logicPositions[dieIdx];
                     x = pos.x + (Math.random() - 0.5) * DIMS.LOGIC.w;
                     z = pos.z + (Math.random() - 0.5) * DIMS.LOGIC.d;
                 } else {
                     // Random spot on HBMs
                     const hbmIdx = i % 8;
                     const pos = hbmPositions[hbmIdx];
                     x = pos.x + (Math.random() - 0.5) * DIMS.HBM.w;
                     z = pos.z + (Math.random() - 0.5) * DIMS.HBM.d;
                 }

                 dummyObj.position.set(x, yDies + DIMS.LOGIC.h + yRel, z);
                 dummyObj.rotation.set(time + i, time + i, 0);
                 dummyObj.scale.set(scale * 0.12, scale * 0.12, scale * 0.12);
                 dummyObj.updateMatrix();
                 particlesRef.current!.setMatrixAt(i, dummyObj.matrix);
            });
            particlesRef.current.instanceMatrix.needsUpdate = true;
        }
    }

  });

  // Substrate Layers Calculation
  // Core takes 60% to leave room for SR layers while keeping total height constant
  const coreHeight = DIMS.SUBSTRATE.h * 0.6; 
  const buildupHeightTotal = DIMS.SUBSTRATE.h * 0.4; // Remaining 40%
  const singleSideStackHeight = buildupHeightTotal / 2; // 20% top, 20% bottom
  
  // To show 6 Copper layers per side interspersed with dielectric, we need 12 slices.
  // Sequence: Cu, Dielectric, Cu, Dielectric ... 
  const innerLayerCount = 12; 
  // We have 12 inner build-up layers + 1 outer SR layer per side
  const totalLayersPerSide = innerLayerCount + 1; 
  const layerHeight = singleSideStackHeight / totalLayersPerSide;

  return (
    <group>
      {/* 1. ABF Substrate Stack (Bottom) */}
      <group 
        position={[0, ySubstrate, 0]} 
        onPointerOver={(e) => { e.stopPropagation(); onHover(ComponentType.SUBSTRATE); }}
        onPointerOut={() => onHover(null)}
      >
        {/* Core Layer (Center) */}
        <mesh position={[0, 0, 0]}>
            <boxGeometry args={[DIMS.SUBSTRATE.w, coreHeight, DIMS.SUBSTRATE.d]} />
            <meshStandardMaterial 
               color="#8B4513"
               roughness={0.8}
               metalness={0.2}
               transparent
               opacity={Object.values(highlights).some(v => v) && !highlights.substrate ? 0.2 : 1}
            />
        </mesh>

        {/* Top Stack: Build-up Layers + SR Layer */}
        {Array.from({ length: innerLayerCount }).map((_, i) => {
            const yOffset = (coreHeight / 2) + (i * layerHeight) + (layerHeight / 2);
            // Even indices = Copper, Odd = Dielectric
            const isCopper = i % 2 === 0; 
            return (
                <mesh key={`top-${i}`} position={[0, yOffset, 0]}>
                    <boxGeometry args={[DIMS.SUBSTRATE.w, layerHeight, DIMS.SUBSTRATE.d]} />
                    <meshStandardMaterial 
                        color={isCopper ? '#ff9f00' : '#f3f4f6'} 
                        roughness={isCopper ? 0.3 : 0.9}
                        metalness={isCopper ? 0.9 : 0.0}
                        transparent
                        opacity={Object.values(highlights).some(v => v) && !highlights.substrate ? 0.2 : 1}
                    />
                </mesh>
            );
        })}
        {/* Top Solder Resist (SR) Layer - Outermost */}
        <mesh position={[0, (coreHeight / 2) + (innerLayerCount * layerHeight) + (layerHeight / 2), 0]}>
            <boxGeometry args={[DIMS.SUBSTRATE.w, layerHeight, DIMS.SUBSTRATE.d]} />
            <meshStandardMaterial 
                color="#064e3b" // Deep Green SR
                roughness={0.4}
                metalness={0.1}
                transparent
                opacity={Object.values(highlights).some(v => v) && !highlights.substrate ? 0.2 : 1}
            />
        </mesh>

        {/* Bottom Stack: Build-up Layers + SR Layer */}
        {Array.from({ length: innerLayerCount }).map((_, i) => {
            // Stack outwards from core
            const yOffset = -((coreHeight / 2) + (i * layerHeight) + (layerHeight / 2));
            const isCopper = i % 2 === 0;
            return (
                <mesh key={`bottom-${i}`} position={[0, yOffset, 0]}>
                    <boxGeometry args={[DIMS.SUBSTRATE.w, layerHeight, DIMS.SUBSTRATE.d]} />
                    <meshStandardMaterial 
                        color={isCopper ? '#ff9f00' : '#f3f4f6'}
                        roughness={isCopper ? 0.3 : 0.9}
                        metalness={isCopper ? 0.9 : 0.0}
                        transparent
                        opacity={Object.values(highlights).some(v => v) && !highlights.substrate ? 0.2 : 1}
                    />
                </mesh>
            );
        })}
        {/* Bottom Solder Resist (SR) Layer - Outermost */}
        <mesh position={[0, -((coreHeight / 2) + (innerLayerCount * layerHeight) + (layerHeight / 2)), 0]}>
            <boxGeometry args={[DIMS.SUBSTRATE.w, layerHeight, DIMS.SUBSTRATE.d]} />
            <meshStandardMaterial 
                color="#064e3b" // Deep Green SR
                roughness={0.4}
                metalness={0.1}
                transparent
                opacity={Object.values(highlights).some(v => v) && !highlights.substrate ? 0.2 : 1}
            />
        </mesh>

        {showLabels && <Html position={[DIMS.SUBSTRATE.w/2 - 1, 0, DIMS.SUBSTRATE.d/2]} className="pointer-events-none">
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded border border-green-500 whitespace-nowrap">ABF Substrate</div>
        </Html>}
      </group>

      {/* 2. C4 Bumps */}
      <instancedMesh 
        ref={c4Ref} 
        args={[undefined, undefined, c4Count]} 
        position={[0, yC4, 0]}
        onPointerOver={(e) => { e.stopPropagation(); onHover(ComponentType.BUMPS); }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[DIMS.C4_SIZE, 12, 12]} />
        <meshStandardMaterial 
          color={highlights.bumps ? '#fde047' : '#d97706'}
          metalness={0.8} 
          roughness={0.2}
          transparent
          opacity={Object.values(highlights).some(v => v) && !highlights.bumps ? 0.1 : 1}
        />
      </instancedMesh>

      {/* 3. Silicon Interposer */}
      <mesh 
        position={[0, yInterposer, 0]}
        onPointerOver={(e) => { e.stopPropagation(); onHover(ComponentType.INTERPOSER); }}
        onPointerOut={() => onHover(null)}
      >
        <boxGeometry args={[DIMS.INTERPOSER.w, DIMS.INTERPOSER.h, DIMS.INTERPOSER.d]} />
        <meshPhysicalMaterial 
            color={highlights.interposer ? '#e5e7eb' : '#6b7280'}
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={Object.values(highlights).some(v => v) && !highlights.interposer ? 0.2 : 0.9}
        />
        {showLabels && <Html position={[DIMS.INTERPOSER.w/2, 0, -DIMS.INTERPOSER.d/2]} className="pointer-events-none">
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded border border-gray-400 whitespace-nowrap">Si Interposer</div>
        </Html>}
      </mesh>

      {/* 4. Micro Bumps */}
      <instancedMesh 
        ref={microRef} 
        args={[undefined, undefined, microCount]} 
        position={[0, yMicro, 0]}
        onPointerOver={(e) => { e.stopPropagation(); onHover(ComponentType.BUMPS); }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[DIMS.MICRO_SIZE, 8, 8]} />
         <meshStandardMaterial 
          color={highlights.bumps ? '#fef08a' : '#b45309'}
          metalness={1} 
          roughness={0.2}
          transparent
          opacity={Object.values(highlights).some(v => v) && !highlights.bumps ? 0.1 : 1}
        />
      </instancedMesh>

      {/* 5. Logic Dies (2 Units, Top/Bottom) */}
      <group position={[0, yDies, 0]}>
          {logicPositions.map((pos, i) => (
             <mesh 
                key={i}
                position={[pos.x, 0, pos.z]}
                onPointerOver={(e) => { e.stopPropagation(); onHover(ComponentType.LOGIC); }}
                onPointerOut={() => onHover(null)}
              >
                <boxGeometry args={[DIMS.LOGIC.w, DIMS.LOGIC.h, DIMS.LOGIC.d]} />
                <meshStandardMaterial 
                  ref={i === 0 ? logicMatRef : undefined} 
                  attach="material"
                  color='#2563eb'
                  roughness={0.2}
                  metalness={0.4}
                  transparent
                  opacity={Object.values(highlights).some(v => v) && !highlights.logic ? 0.2 : 1}
                />
                <Html position={[0, DIMS.LOGIC.h, 0]} transform occlude distanceFactor={8}>
                   <div className="text-white text-[8px] font-bold tracking-widest bg-black/30 px-2 py-1 rounded backdrop-blur-sm border border-blue-500/30">
                     SoC Die {i+1}
                   </div>
                </Html>
             </mesh>
          ))}
      </group>
      
      {/* 6. HBM Stacks (8 Units, Left/Right Banks) */}
      <group position={[0, yHBM, 0]}>
      {hbmPositions.map((pos, idx) => (
            <group key={idx} position={[pos.x, 0, pos.z]}>
                <mesh
                    onPointerOver={(e) => { e.stopPropagation(); onHover(ComponentType.HBM); }}
                    onPointerOut={() => onHover(null)}
                >
                    <boxGeometry args={[DIMS.HBM.w, DIMS.HBM.h, DIMS.HBM.d]} />
                    <meshStandardMaterial 
                        ref={idx === 0 ? hbmMatRef : undefined}
                        attach="material"
                        color='#111827'
                        roughness={0.1}
                        metalness={0.6}
                        transparent
                        opacity={Object.values(highlights).some(v => v) && !highlights.hbm ? 0.2 : 1}
                    />
                </mesh>
                {/* HBM Layer lines */}
                {[...Array(7)].map((_, i) => (
                    <mesh key={i} position={[0, -DIMS.HBM.h/2 + (i+1) * (DIMS.HBM.h/8), 0]}>
                        <boxGeometry args={[DIMS.HBM.w + 0.01, 0.005, DIMS.HBM.d + 0.01]} />
                        <meshBasicMaterial color="#374151" />
                    </mesh>
                ))}
                {showLabels && idx === 0 && <Html position={[0, DIMS.HBM.h/2, 0]} className="pointer-events-none">
                     <div className="bg-black/70 text-white text-[8px] px-1 rounded whitespace-nowrap border border-slate-600">HBM3e</div>
                </Html>}
            </group>
      ))}
      </group>

      {/* 7. Heat Particles (Visual FX) */}
      <instancedMesh
        ref={particlesRef}
        args={[undefined, undefined, particleCount]}
        visible={false} 
      >
         <coneGeometry args={[0.05, 0.15, 6]} />
         <meshBasicMaterial color="#ff4500" transparent opacity={0.6} />
      </instancedMesh>

    </group>
  );
};

export default CoWoSModel;