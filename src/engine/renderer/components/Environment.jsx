import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { TUNNEL_DEPTH, GRID_SPACING } from '../../../game/constants';

const TunnelGrid = ({ isWarping }) => {
  const groupRef = useRef();
  
  // Create rings for the tunnel
  const numRings = 20;
  // Use a cached geometry to save memory
  const ringGeo = useRef(new THREE.EdgesGeometry(new THREE.BoxGeometry(1000, 1000, 0))).current;
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const speed = isWarping ? 2000 : 100;
    const cameraZ = 500; // Match the camera position in renderer.jsx
    
    groupRef.current.children.forEach((mesh, i) => {
      mesh.position.z += speed * delta;
      
      // FIXED: Reset ring only after it passes BEHIND the camera (Z > 500)
      // This creates the seamless "flying through" effect
      if (mesh.position.z > cameraZ + 100) {
        mesh.position.z = - (numRings * GRID_SPACING) + cameraZ;
      }
      
      // Fade opacity based on distance from camera
      // We calculate distance relative to the camera, not world 0
      const dist = Math.abs(mesh.position.z - cameraZ);
      const opacity = 1 - (dist / TUNNEL_DEPTH);
      
      if (mesh.material) {
        mesh.material.opacity = Math.max(0, Math.min(0.5, opacity));
        mesh.material.transparent = true;
        mesh.material.color.set(isWarping ? '#00ffff' : '#00ff41');
      }
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: numRings }).map((_, i) => (
        <lineSegments 
          key={i} 
          geometry={ringGeo} 
          // Start them spread out correctly behind the camera
          position={[0, 0, -(i * GRID_SPACING)]}
        >
          <lineBasicMaterial color="#00ff41" transparent opacity={0.5} />
        </lineSegments>
      ))}
    </group>
  );
};

export const Environment = ({ isWarping }) => {
  return (
    <group>
      <color attach="background" args={['#050505']} />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={isWarping ? 5 : 1} />
      <TunnelGrid isWarping={isWarping} />
      <fog attach="fog" args={['#050505', 0, TUNNEL_DEPTH - 500]} />
    </group>
  );
};