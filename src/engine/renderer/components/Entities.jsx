import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import { CLASSES } from '../../../game/data/classes';
import { THEME } from '../../../game/constants';

const PlayerMesh = ({ player, position, isActive }) => {
  const meshRef = useRef();
  const classDef = CLASSES[player.classID] || CLASSES.firewall;
  const color = classDef.color || '#00ff41';

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Idle Rotation
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 1.0;
      
      // Floating effect
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 20;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[50, 0]} />
        <meshStandardMaterial 
            color={color} 
            wireframe={!isActive} 
            emissive={color}
            emissiveIntensity={isActive ? 2 : 0.5}
        />
      </mesh>
      {/* Simple Name Tag */}
      <Text 
        position={[0, -80, 0]} 
        fontSize={20} 
        color={isActive ? '#ffffff' : '#888888'}
        anchorX="center" 
        anchorY="middle"
      >
        {player.name}
      </Text>
    </group>
  );
};

const EnemyMesh = ({ enemy, isActive, onClick, onPointerOver }) => {
  const meshRef = useRef();
  const isBoss = enemy.type === 'boss';
  const color = isBoss ? '#ff0000' : '#ff0055';
  const size = isBoss ? 150 : 60;

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Rotate enemies
      meshRef.current.rotation.x -= delta * 0.3;
      meshRef.current.rotation.y -= delta * 0.8;
      
      // Charging shake effect
      if (enemy.isCharging) {
        meshRef.current.position.x += (Math.random() - 0.5) * 5;
      }
    }
  });

  return (
    <group position={[enemy.x, enemy.y, -enemy.distance]}>
      <mesh 
        ref={meshRef} 
        onClick={() => onClick(enemy.id)}
        onPointerOver={() => onPointerOver(enemy.id)}
        onPointerOut={() => onPointerOver(null)}
      >
        {isBoss ? (
           // Boss is a denser geometry
           <icosahedronGeometry args={[size, 1]} />
        ) : (
           <dodecahedronGeometry args={[size, 0]} />
        )}
        <meshStandardMaterial 
          color={color} 
          wireframe 
          emissive={color}
          emissiveIntensity={enemy.isCharging ? 3 : 1}
        />
      </mesh>
      
      {/* Health Bar using HTML overlay for sharpness */}
      <Html position={[0, -size - 20, 0]} center>
        <div style={{ 
          color: color, 
          fontFamily: 'monospace', 
          fontSize: '0.8rem',
          textShadow: `0 0 5px ${color}`,
          whiteSpace: 'nowrap'
        }}>
          {enemy.name} <br/>
          [{enemy.hp} / {enemy.maxHp}]
        </div>
      </Html>
    </group>
  );
};

export const EntityManager = ({ players, enemies, activeEntity, onEnemyClick, onEnemyHover, playerPositions }) => {
  return (
    <>
      {/* RENDER PLAYERS */}
      {Object.values(players).map((player) => {
        // Map 2D UI positions to 3D world space approximately
        // In a full implementation, we would unproject using the camera, 
        // but for now we map screen X to world X.
        const posData = playerPositions[player.id];
        const x = posData ? (posData.x - window.innerWidth / 2) : 0;
        const y = -150; // Fixed height for players
        
        return (
            <PlayerMesh 
                key={player.id} 
                player={player} 
                position={[x, y, 200]} // Players are close to camera
                isActive={activeEntity === player.id}
            />
        );
      })}

      {/* RENDER ENEMIES */}
      {enemies.map((enemy) => (
        <EnemyMesh 
            key={enemy.id} 
            enemy={enemy} 
            isActive={activeEntity === enemy.id}
            onClick={onEnemyClick}
            onPointerOver={onEnemyHover}
        />
      ))}
    </>
  );
};