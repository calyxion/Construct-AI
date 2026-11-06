import React, { useState, useEffect, useRef } from 'react';
import { Box, Layers } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import axios from 'axios';

function WorkerDot({ position, status }) {
  const meshRef = useRef();
  
  // Make them bob up and down slightly
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.2;
    }
  });

  const color = status === 'WARNING' ? '#f59e0b' : '#34d399';
  
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
      <pointLight distance={3} intensity={5} color={color} />
    </mesh>
  );
}

function ScaffoldingStructure() {
  return (
    <mesh position={[0, 1.5, -3]}>
      <boxGeometry args={[10, 3, 2]} />
      <meshStandardMaterial color="#0f172a" wireframe opacity={0.3} transparent />
    </mesh>
  );
}

export default function BimDigitalTwinPage() {
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    const fetchBim = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/bim/coordinates');
        setWorkers(res.data.workers);
      } catch (e) {
        console.warn('Failed to fetch BIM data', e);
      }
    };
    fetchBim();
    const int = setInterval(fetchBim, 2000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="space-y-6 flex flex-col h-[85vh]">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-[10px] font-black font-mono uppercase tracking-wider">PHASE 4</div>
          <span className="text-[11px] text-slate-500 font-mono">React Three Fiber / WebGL</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase flex items-center gap-2.5">
          <Box className="w-6 h-6 text-indigo-400" /> BIM 4D Digital Twin
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">Live visualization of worker telemetry mapped onto a 3D construction site geometry.</p>
      </div>

      <div className="glass-panel border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.05)] rounded-2xl flex-1 relative overflow-hidden">
        {/* Overlay UI */}
        <div className="absolute top-6 left-6 z-10 pointer-events-none">
          <h3 className="text-indigo-400 font-black font-mono uppercase text-sm mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4"/> Navisworks Integration (Simulated)
          </h3>
          <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-3 rounded text-xs font-mono text-slate-300">
            <div>Tracking: {workers.length} entities in 3D space</div>
            <div>Camera: Orbit Free-Cam Enabled</div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-900">
          <Canvas camera={{ position: [15, 10, 15], fov: 50 }}>
            <color attach="background" args={['#020617']} />
            <ambientLight intensity={0.2} />
            <directionalLight position={[10, 10, 5]} intensity={0.5} />
            
            <ScaffoldingStructure />
            
            {workers.map((w) => (
              <WorkerDot key={w.id} position={w.position} status={w.status} />
            ))}

            <Grid 
              renderOrder={-1} 
              position={[0, 0, 0]} 
              infiniteGrid 
              cellSize={1} 
              cellThickness={0.5} 
              sectionSize={5} 
              sectionThickness={1} 
              cellColor="#1e293b" 
              sectionColor="#334155" 
              fadeDistance={50} 
            />
            <OrbitControls autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2.1} />
            <Environment preset="night" />
          </Canvas>
        </div>
      </div>
    </div>
  );
}
