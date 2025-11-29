import React, { useMemo, useState } from 'react';
import { CLASSES } from '../../game/data/classes';
import { PATCHES } from '../../game/data/patches';
import { THEME } from '../../game/constants';
import { PlayerIcon, IconAttack, IconDefend, IconSpecial1, IconSpecial2, IconInfo } from '../components';
import { PlayerCard } from './PlayerCard';

export const HUD = ({ G, moves, playerPositions, selectedAbility, setSelectedAbility, isWarping, onManage }) => {
  const turnOrder = useMemo(() => {
    return [...Object.values(G.players), ...Object.values(G.enemies)]
      .filter(e => e.hp > 0)
      .sort((a, b) => b.speed - a.speed);
  }, [G.players, G.enemies]);

  if (isWarping) return null;

  return (
    <>
      {/* 1. Turn Order Bar */}
      {turnOrder.length > 0 && (
          <div style={{
              position: 'fixed', top: '15px', left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10000,
              background: 'rgba(0,0,0,0.6)', padding: '5px 15px', borderRadius: '4px',
              border: '1px solid #333'
          }}>
              <span style={{color:'#666', fontSize:'0.7rem', marginRight:'5px'}}>SEQ:</span>
              {turnOrder.map((entity) => {
                  const isActive = entity.id === G.activeEntity;
                  const isEnemy = entity.id.startsWith('e') || entity.id === 'boss';
                  const color = isEnemy ? '#ff0055' : (CLASSES[entity.classID]?.color || '#00ff41');
                  
                  return (
                      <div key={entity.id} style={{
                          width: 30, height: 30,
                          border: `2px solid ${isActive ? '#fff' : color}`,
                          background: isActive ? color : 'rgba(0,0,0,0.5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: isActive ? 1 : 0.6,
                          transform: isActive ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.3s'
                      }}>
                           {isEnemy ? 
                              <span style={{
                                  color: isActive ? '#000' : color, 
                                  fontWeight:'bold', 
                                  fontSize:'0.7rem'
                              }}>
                                  {entity.type === 'boss' ? 'B' : entity.name[0]}
                              </span> 
                              : <PlayerIcon classID={entity.classID} size={20} />
                          }
                      </div>
                  );
              })}
          </div>
      )}

      {/* 2. Combat Log */}
      <div style={{ position: 'fixed', top: '80px', right: '20px', width: '250px', pointerEvents: 'none', textAlign: 'right', zIndex: 10000 }}>
          {G.log.slice(-5).map((log, i) => (
              <div key={i} style={{ marginBottom: '4px', color: '#00ccff', fontSize: '0.7rem', opacity: 0.5 + (i/5)*0.5, textShadow: '0 0 2px #00ccff' }}>
                  {log}
              </div>
          ))}
      </div>

      {/* 3. Player Cards Container */}
      <div style={{ 
          position: 'fixed', bottom: '10px', 
          width: '100%', 
          height: `${THEME.PLAYER.CARD_HEIGHT_BASE}px`,
          zIndex: 10000,
          pointerEvents: 'none'
      }}>
          {Object.values(G.players).map(player => (
              <PlayerCard 
                  key={player.id}
                  player={player}
                  isActive={G.activeEntity === player.id}
                  attackMode={selectedAbility}
                  setAttackMode={setSelectedAbility}
                  moves={moves}
                  playerPositions={playerPositions}
                  onManage={onManage}
              />
          ))}
      </div>
    </>
  );
};