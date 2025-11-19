import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stage, ContactShadows } from '@react-three/drei';
import CoWoSModel from './CoWoSModel';
import { LayerProps, HighlightState, ComponentType } from '../types';

interface SceneProps extends LayerProps {
    highlights: HighlightState;
    onHover: (part: ComponentType | null) => void;
}

const Scene: React.FC<SceneProps> = (props) => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-black">
      <Canvas shadows camera={{ position: [12, 12, 12], fov: 35 }}>
        <Suspense fallback={null}>
            <Environment preset="city" />
            
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 20, 10]} angle={0.2} penumbra={1} intensity={1.5} castShadow />
            <pointLight position={[-10, 10, -10]} intensity={0.5} color="#4d7cff" />
            
            <group position={[0, -1, 0]}>
                <CoWoSModel {...props} />
            </group>
            
            <ContactShadows opacity={0.4} scale={30} blur={2.5} far={4} resolution={256} color="#000000" />
            
            <OrbitControls 
                minPolarAngle={0} 
                maxPolarAngle={Math.PI / 2.1} 
                enableZoom={true}
                enablePan={false}
                minDistance={5}
                maxDistance={30}
            />
        </Suspense>
      </Canvas>
      
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 pointer-events-none">
        Left Click: Rotate • Right Click: Pan • Scroll: Zoom
      </div>
    </div>
  );
};

export default Scene;
