import React, { useMemo } from 'react';
import { CLASSES } from '../../game/data/classes';
import { THEME } from '../../game/constants';
import { PlayerIcon, IconAttack, IconDefend, IconSpecial1, IconSpecial2, IconInfo } from '../components';
import { audio } from '../../engine/audio/audio';

export const HUD = ({ G, moves, playerPositions, attackMode, setAttackMode, isWarping }) => {
  
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
                  
                  // FIXED: Specifically check for boss ID or 'e' prefix
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
                              <span style={{color: isActive ? '#000' : color, fontWeight:'bold', fontSize:'0.7rem'}}>
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

      {/* 3. Player Cards */}
      <div style={{ 
          position: 'fixed', bottom: '10px', 
          width: '100%', 
          height: `${THEME.PLAYER.CARD_HEIGHT_BASE}px`,
          zIndex: 10000,
          pointerEvents: 'none'
      }}>
          {Object.values(G.players).map(player => {
              const isActive = G.activeEntity === player.id;
              const classDef = CLASSES[player.classID] || CLASSES.firewall;
              const primary = classDef.color;
              const dim = '#444'; 

              const standardGreen = '#00FF41';
              const cardBorderColor = isActive ? standardGreen : '#004411';
              const cardTextColor = isActive ? primary : '#888'; 
              const cardShadow = isActive ? `0 0 20px ${standardGreen}` : 'none';

              // Get layout from hook data
              const layout = playerPositions[player.id] || { left: 0, width: 100 };

              const btnStyle = {
                  flex: 1, border: `1px solid ${dim}`, background: 'transparent',
                  color: '#888', 
                  cursor: 'pointer', transition: 'all 0.2s',
                  height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                  borderRadius: '2px'
              };
              
              const activeBtnStyle = { ...btnStyle, background: primary, color: '#000', border: `1px solid ${primary}` };

              return (
                  <div key={player.id} style={{ 
                      position: 'absolute', 
                      left: `${layout.left}px`, 
                      width: `${layout.width}px`, 
                      height: '100%',
                      pointerEvents: 'auto',
                      transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' 
                  }}>
                      <div style={{ 
                          width: '100%', height: '100%', 
                          background: 'rgba(5, 5, 5, 0.9)', 
                          border: `1px solid ${cardBorderColor}`,
                          display: 'flex', flexDirection: 'column',
                          boxShadow: cardShadow,
                          overflow: 'hidden',
                          borderRadius: '4px'
                      }}>
                          {/* Top Bar: Icon, Name, Expand */}
                          <div style={{ 
                              display: 'flex', alignItems: 'center', 
                              padding: '5px 8px', background: 'rgba(0,0,0,0.3)',
                              borderBottom: '1px solid #222',
                              height: '40px'
                          }}>
                              <div style={{ marginRight: '10px' }}><PlayerIcon classID={player.classID} size={28} /></div>
                              <span style={{ 
                                  color: cardTextColor, fontWeight: 'bold', fontSize: '0.8rem', 
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', 
                                  flex: 1 
                              }}>
                                  {player.name}
                              </span>
                              <button style={{
                                  background:'transparent', border:'none', color:'#666', cursor:'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }} title="Info">
                                  <IconInfo />
                              </button>
                          </div>

                          {/* Vitals: HP */}
                          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ width: '100%', height: '14px', background: '#1a0505', position: 'relative', border: '1px solid #333' }}>
                                  <div style={{ 
                                      width: `${(player.hp / player.maxHp) * 100}%`, height: '100%', 
                                      background: player.hp < 30 ? '#ff0044' : '#00ff41', 
                                      transition: 'width 0.3s' 
                                  }} />
                                  <div style={{
                                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '0.65rem', fontWeight: '900', color: '#fff', textShadow: '0 0 2px #000', pointerEvents:'none'
                                  }}>
                                      {player.hp} / {player.maxHp}
                                  </div>
                              </div>
                              {/* XP / Energy (Visual Only) */}
                              <div style={{ width: '100%', height: '4px', background: '#001122', position: 'relative' }}>
                                  <div style={{ width: '45%', height: '100%', background: '#0088aa' }} />
                              </div>
                          </div>

                          {/* Action Row */}
                          {isActive && (
                              <div style={{ 
                                  flex: 1, display: 'flex', gap: '8px', padding: '0 10px 10px 10px', 
                                  animation: 'fade-in 0.5s' 
                              }}>
                                  <button 
                                      style={attackMode ? activeBtnStyle : btnStyle}
                                      onClick={() => { setAttackMode(!attackMode); }}
                                      title="ATTACK"
                                  >
                                      <IconAttack />
                                  </button>
                                  <button 
                                      style={btnStyle}
                                      onClick={() => { moves.defend(); }}
                                      title="DEFEND"
                                  >
                                      <IconDefend />
                                  </button>
                                  <button style={{ ...btnStyle, borderColor: '#333', color: '#444' }} disabled>
                                      <IconSpecial1 />
                                  </button>
                                  <button style={{ ...btnStyle, borderColor: '#333', color: '#444' }} disabled>
                                      <IconSpecial2 />
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              );
          })}
      </div>
    </>
  );
};