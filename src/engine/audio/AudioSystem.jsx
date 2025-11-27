// src/engine/audio/AudioSystem.jsx
import { useEffect, useRef } from 'react';
import { audio } from './audio'; 

export const AudioSystem = ({ G }) => {
  const lastEventId = useRef(0);
  const victoryPlayed = useRef(false);

  useEffect(() => {
    if (G.lastEvent && G.lastEvent.id !== lastEventId.current) {
      const event = G.lastEvent;
      lastEventId.current = event.id;

      switch (event.type) {
        case 'PLAYER_ATTACK':
          audio.playerAttack(event.isCrit);
          break;
        case 'ENEMY_ATTACK':
          audio.enemyAttack();
          break;
        // ADDED: New case for charging sound
        case 'ENEMY_CHARGE':
          audio.charge();
          break;
        case 'PLAYER_DEFEND':
        case 'BLOCK':
          audio.defend();
          break;
        case 'PLAYER_DAMAGED':
          audio.playerDamaged();
          break;
        case 'ENEMY_DEATH':
          audio.enemyDeath();
          break;
        case 'PLAYER_DEATH':
          audio.playerDeath();
          break;
        case 'WARP':
          audio.warp();
          break;
        case 'VICTORY':
          if (!victoryPlayed.current) {
            audio.victory();
            victoryPlayed.current = true;
          }
          break;
        default:
          break;
      }
    }

    if (G.phase !== 'victory') {
      victoryPlayed.current = false;
    }

  }, [G.lastEvent, G.phase]);

  return null; 
};