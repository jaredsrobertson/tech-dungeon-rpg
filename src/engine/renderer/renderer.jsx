import React from 'react';
import { Canvas } from '@react-three/fiber';
// DISABLED: Post-processing temporarily to fix WebGL crash
// import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Environment } from './components/Environment';
import { EntityManager } from './components/Entities';
import { FloatingNumbers } from './components/FloatingNumbers';

export const TunnelRenderer = React.memo(({ 
  enemies = [], 
  players = {}, 
  activeEntity = null, 
  isWarping = false, 
  onEnemyClick = () => {}, 
  onEnemyHover = () => {}, 
  onBackgroundClick = () => {}, 
  playerPositions = {} 
}) => {
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
      <Canvas 
        camera={{ position: [0, 0, 500], fov: 60 }}
        onPointerMissed={onBackgroundClick}
        gl={{ 
          antialias: true, 
          powerPreference: "high-performance",
          alpha: false 
        }}
      >
        {/* LIGHTING FIX: Move lights behind the camera (Z > 500) so they illuminate player faces */}
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 600]} intensity={1.5} distance={2000} />
        <directionalLight position={[0, 50, 600]} intensity={1.0} />
        
        {/* WORLD */}
        <Environment isWarping={isWarping} />
        
        {/* CHARACTERS */}
        <EntityManager 
            players={players}
            enemies={enemies}
            activeEntity={activeEntity}
            playerPositions={playerPositions}
            onEnemyClick={onEnemyClick}
            onEnemyHover={onEnemyHover}
        />

        {/* UI EFFECTS */}
        <FloatingNumbers 
            enemies={enemies}
            players={players}
            playerPositions={playerPositions}
        />
      </Canvas>
    </div>
  );
});