import React, { useRef, useState, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

const FloatingTextItem = ({ id, x, y, z, text, color, onComplete }) => {
  const ref = useRef();
  const [opacity, setOpacity] = useState(1);

  useFrame((state, delta) => {
    if (ref.current) {
      // Float Up
      ref.current.position.y += delta * 30; // Speed
      // Fade Out
      const newOp = opacity - (delta * 0.8);
      setOpacity(newOp);
      
      if (ref.current.material) {
        ref.current.material.opacity = Math.max(0, newOp);
        ref.current.material.transparent = true;
      }

      if (newOp <= 0) {
        onComplete(id);
      }
    }
  });

  return (
    <Text
      ref={ref}
      position={[x, y, z]}
      fontSize={24} // Large, readable text
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={1}
      outlineColor="#000000"
    >
      {text}
    </Text>
  );
};

export const FloatingNumbers = ({ enemies, players, playerPositions }) => {
  const [events, setEvents] = useState([]);
  const prevEnemies = useRef({});
  const prevPlayers = useRef({});

  // Detect HP Changes
  useLayoutEffect(() => {
    const newEvents = [];

    // Check Enemies
    enemies.forEach(e => {
      const prev = prevEnemies.current[e.id];
      if (prev && e.hp < prev.hp) {
        const dmg = prev.hp - e.hp;
        newEvents.push({
          id: Math.random(),
          x: e.x, y: e.y + 50, z: -e.distance + 50, // Spawn slightly in front
          text: `-${dmg}`,
          color: '#ff0000'
        });
      }
      prevEnemies.current[e.id] = { ...e };
    });

    // Check Players
    Object.values(players).forEach(p => {
      const prev = prevPlayers.current[p.id];
      const pos = playerPositions[p.id];
      if (prev && p.hp < prev.hp && pos) {
        const dmg = prev.hp - p.hp;
        // Map 2D screen pos to rough 3D world pos for text
        const worldX = pos.x - window.innerWidth / 2;
        newEvents.push({
          id: Math.random(),
          x: worldX, y: -50, z: 200,
          text: `-${dmg}`,
          color: '#ff0044'
        });
      }
      prevPlayers.current[p.id] = { ...p };
    });

    if (newEvents.length > 0) {
      setEvents(prev => [...prev, ...newEvents]);
    }
  }, [enemies, players, playerPositions]);

  const removeEvent = (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <group>
      {events.map(ev => (
        <FloatingTextItem 
          key={ev.id}
          {...ev}
          onComplete={removeEvent}
        />
      ))}
    </group>
  );
};