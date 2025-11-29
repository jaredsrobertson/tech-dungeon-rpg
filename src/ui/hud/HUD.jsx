import React, { useMemo } from 'react';
import { CLASSES } from '../../game/data/classes';
import { THEME } from '../../game/constants';
import { PlayerIcon } from '../components';
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
          <div className="hud-turn-order">
              <span style={{color:'#666', fontSize:'0.7rem', marginRight:'5px'}}>SEQ:</span>
              {turnOrder.map((entity) => {
                  const isActive = entity.id === G.activeEntity;
                  const isEnemy = entity.id.startsWith('e') || entity.id === 'boss';
                  const color = isEnemy ? '#ff0055' : (CLASSES[entity.classID]?.color || '#00ff41');
                  
                  return (
                      <div key={entity.id} 
                           className="turn-entity"
                           style={{
                              border: `2px solid ${isActive ? '#fff' : color}`,
                              background: isActive ? color : 'rgba(0,0,0,0.5)',
                              opacity: isActive ? 1 : 0.6,
                              transform: isActive ? 'scale(1.15)' : 'scale(1)'
                           }}>
                           {isEnemy ? 
                              <span style={{ color: isActive ? '#000' : color, fontWeight:'bold', fontSize:'0.7rem' }}>
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
      <div className="combat-log">
          {G.log.slice(-5).map((log, i) => (
              <div key={i} className="log-entry" style={{ opacity: 0.5 + (i/5)*0.5 }}>
                  {log}
              </div>
          ))}
      </div>

      {/* 3. Player Cards Container */}
      <div className="cards-container" style={{ height: `${THEME.PLAYER.CARD_HEIGHT_BASE}px` }}>
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