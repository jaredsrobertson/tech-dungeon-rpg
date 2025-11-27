import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { audio } from '../engine/audio/audio';
import { AudioSystem } from '../engine/audio/AudioSystem';
import { PlayerIcon, IconAttack, IconDefend, IconInfo, IconSpecial1, IconSpecial2 } from './components';
import { TunnelRenderer } from '../engine/renderer/renderer';
import { CLASSES, generateGlitchText, THEME } from '../game/constants';
import { useFluidLayout } from '../hooks/useFluidLayout'; // Import new hook

export function KernelBoard({ G, moves, playerID }) {
  // --- 1. STATE HOOKS ---
  const [gameStarted, setGameStarted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [attackMode, setAttackMode] = useState(false);
  const [hoveredEnemy, setHoveredEnemy] = useState(null);
  const [isWarping, setIsWarping] = useState(false);
  const [isTransitioning, setTransitioning] = useState(false);
  const [visualSeed, setVisualSeed] = useState(0);
  const [speechQueue, setSpeechQueue] = useState([]);
  const [speakingId, setSpeakingId] = useState(null);
  const [currentSpeech, setCurrentSpeech] = useState('');
  
  // NEW: Use the hook for layout logic
  const { positions: playerPositions, uiScale, isTooSmall } = useFluidLayout(G.players, G.activeEntity);

  const prevPhaseRef = useRef(G.phase);

  // --- 2. MEMOIZED DATA ---
  const enemiesList = useMemo(() => Object.values(G.enemies || {}), [G.enemies]);
  const playersList = useMemo(() => G.players, [G.players]);
  
  const turnOrder = useMemo(() => {
    return [...Object.values(G.players), ...Object.values(G.enemies)]
      .filter(e => e.hp > 0)
      .sort((a, b) => b.speed - a.speed);
  }, [G.players, G.enemies]);

  // --- 3. CALLBACKS & EFFECTS ---
  const handleNewGame = () => {
      audio.init();
      setGameStarted(true);
      setVisualSeed(Math.floor(Math.random() * 100000));
      audio.warp(); 
  };

  const handleLockedOption = () => {
      if (audio.ctx) {
        const osc = audio.ctx.createOscillator();
        const gain = audio.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, audio.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audio.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, audio.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audio.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audio.masterGain);
        osc.start(); osc.stop(audio.ctx.currentTime + 0.15);
      }
  };

  const handleCardClick = (classID, isClaimed, isMine) => {
      if (!isClaimed) {
          audio.blip();
          moves.claimHero(classID);
      } else if (isMine) {
          audio.blip();
          moves.releaseHero(classID);
      } else {
          handleLockedOption();
      }
  };

  const handleNextSector = useCallback(() => {
      setIsWarping(true);
      setTimeout(() => { 
          moves.nextRoom(); 
          setTimeout(() => {
              setSpeechQueue([
                  { id: 'e1', text: generateGlitchText() }, 
                  { id: 'e2', text: generateGlitchText() }
              ]);
              setIsWarping(false);
          }, 1000); 
      }, 1500);
  }, [moves]);

  useEffect(() => {
      if (gameStarted) {
          audio.init();
      }
  }, [gameStarted]);

  useEffect(() => {
      if (prevPhaseRef.current === 'lobby' && G.phase === 'combat') {
          setTimeout(() => {
              setSpeechQueue([
                  { id: 'e1', text: generateGlitchText() }, 
                  { id: 'e2', text: generateGlitchText() }
              ]);
          }, 800);
      }
      prevPhaseRef.current = G.phase;
  }, [G.phase]);

  useEffect(() => {
      if (G.phase !== 'combat' || isTransitioning) return;
      if (G.activeEntity && G.activeEntity.startsWith('e')) {
          const enemy = G.enemies[G.activeEntity];
          if (!enemy || enemy.hp <= 0) { moves.enemyAttack(G.activeEntity); return; }
          if (!enemy.isCharging) { moves.enemySelectTarget(G.activeEntity); } 
          else {
              const timer = setTimeout(() => { moves.enemyAttack(G.activeEntity); }, 800); 
              return () => clearTimeout(timer);
          }
      }
      if (G.activeEntity && G.activeEntity.startsWith('e')) setAttackMode(false);
  }, [G.activeEntity, G.phase, isTransitioning, G.enemies, moves]);

  useEffect(() => {
     if (gameStarted && !speakingId && speechQueue.length > 0) {
         const next = speechQueue[0];
         if (G.enemies[next.id] && G.enemies[next.id].hp > 0) {
             setSpeakingId(next.id);
             setCurrentSpeech(next.text);
         } else {
             setSpeechQueue(q => q.slice(1));
         }
     }
  }, [gameStarted, speakingId, speechQueue, G.enemies]);

  useEffect(() => {
    const onKey = (e) => {
        if (!gameStarted || isWarping || speakingId) return;
        const key = e.key.toLowerCase();
        if (key === 'escape') { audio.blip(); setMenuOpen(m => !m); setAttackMode(false); } 
        else if (!menuOpen && G.activeEntity && !G.activeEntity.startsWith('e')) {
            if (key === 'a') { audio.blip(); setAttackMode(m => !m); }
            if (key === 'd') { moves.defend(); setAttackMode(false); }
            if (attackMode && (key === '1' || key === '2')) {
                const enemies = Object.values(G.enemies);
                const target = enemies[parseInt(key)-1];
                if (target && target.hp > 0) { moves.attack(target.id); setAttackMode(false); }
            }
        }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameStarted, isWarping, speakingId, menuOpen, attackMode, G.activeEntity, G.enemies, moves]);

  useEffect(() => {
      if (G.phase === 'combat') {
          setTransitioning(true);
          const t = setTimeout(() => setTransitioning(false), 1000);
          return () => clearTimeout(t);
      }
  }, [G.activeEntity, G.phase]);

  // --- 4. CONDITIONAL RENDER LOGIC ---

  // Mobile / Too Small Block
  if (isTooSmall) {
      return (
          <div className="title-container" style={{textAlign:'center', padding:'20px'}}>
              <h1 style={{color:'#cc0044', fontSize:'2rem', marginBottom:'20px'}}>SYSTEM REQUIREMENTS NOT MET</h1>
              <p style={{color:'#ccc', fontFamily:'monospace'}}>
                  DISPLAY TERMINAL TOO NARROW.<br/>
                  PLEASE EXPAND VIEWPORT OR ROTATE DEVICE.<br/>
                  MIN WIDTH: 768px
              </p>
          </div>
      );
  }

  if (!gameStarted) {
      return (
          <div className="title-container">
              <h1 className="logo-main" data-text="TERMINAL.EXE">TERMINAL.EXE</h1>
              <div className="menu-list">
                  <button className="btn-title" onClick={handleNewGame}>[ NEW GAME ]</button>
                  <button className="btn-title" onClick={handleLockedOption} disabled>[ LOAD GAME ]</button>
                  <button className="btn-title" onClick={handleLockedOption} disabled>[ JOIN GAME ]</button>
                  <button className="btn-title" onClick={handleLockedOption} disabled>[ SETTINGS ]</button>
              </div>
              <div style={{ marginTop: '50px', opacity: 0.5, fontSize: '0.7rem' }}>
                  SYS.AUD.REQ // PERMISSION REQUIRED
              </div>
          </div>
      );
  }

  if (G.phase === 'lobby') {
      const canStart = Object.values(G.lobbyState).some(id => id !== null);
      
      return (
          <div className="lobby-container">
              <h1 className="logo-main" style={{ fontSize: '2.5rem', marginBottom: '2rem' }} data-text="SELECT PROTOCOLS">SELECT PROTOCOLS</h1>
              
              <div className="class-grid">
                  {Object.keys(CLASSES).map(classID => {
                      const def = CLASSES[classID];
                      const owner = G.lobbyState[classID];
                      const isClaimed = owner !== null;
                      const isMine = isClaimed && (String(owner) === String(playerID));
                      
                      let cardClass = 'class-card';
                      if (isMine) cardClass += ' claimed';
                      else if (isClaimed) cardClass += ' locked';

                      return (
                          <div 
                            key={classID} 
                            className={cardClass}
                            onClick={() => handleCardClick(classID, isClaimed, isMine)}
                          >
                              <div className="class-icon">
                                  <PlayerIcon classID={classID} size={80} />
                              </div>
                              <div className="class-info">
                                  <h3>{def.name}</h3>
                                  <span className="class-role">[{def.role}]</span>
                                  <p className="class-desc">{def.ability.desc}</p>
                                  <div className="class-stats">
                                      <span>HP: {def.hp}</span>
                                  </div>
                              </div>
                              <div className="class-actions">
                                  {!isClaimed && (
                                      <button className="btn-title btn-small">INITIALIZE</button>
                                  )}
                                  {isMine && (
                                      <button className="btn-title btn-small btn-danger">DISCONNECT</button>
                                  )}
                                  {isClaimed && !isMine && (
                                      <div className="locked-label">LOCKED // P{owner}</div>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>

              <div className="lobby-footer">
                  <button 
                      className="btn-title" 
                      disabled={!canStart} 
                      onClick={() => { audio.warp(); moves.startRun(); }}
                      style={{ width: '300px', marginTop: '30px' }}
                  >
                      [ JACK IN ]
                  </button>
              </div>
          </div>
      );
  }

  return (
    <>
      <AudioSystem G={G} />

      {!isWarping && turnOrder.length > 0 && (
          <div style={{
              position: 'fixed', top: '15px', left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10000,
              background: 'rgba(0,0,0,0.6)', padding: '5px 15px', borderRadius: '4px',
              border: '1px solid #333'
          }}>
              <span style={{color:'#666', fontSize:'0.7rem', marginRight:'5px'}}>SEQ:</span>
              {turnOrder.map((entity, i) => {
                  const isActive = entity.id === G.activeEntity;
                  const isEnemy = entity.id.startsWith('e');
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
                              <span style={{color: isActive ? '#000' : color, fontWeight:'bold', fontSize:'0.7rem'}}>{entity.name[0]}</span> 
                              : <PlayerIcon classID={entity.classID} size={20} />
                          }
                      </div>
                  );
              })}
          </div>
      )}

      <TunnelRenderer 
        enemies={enemiesList} 
        players={playersList}
        targetedEnemy={hoveredEnemy} 
        activeEntity={G.activeEntity}
        isTransitioning={isTransitioning} 
        isWarping={isWarping}
        depth={G.depth}
        visualSeed={visualSeed} 
        speakingId={speakingId}
        speechText={currentSpeech}
        onSpeechEnd={() => { setSpeakingId(null); setSpeechQueue(q => q.slice(1)); }}
        onEnemyClick={(id) => { if(attackMode) { moves.attack(id); setAttackMode(false); } }}
        onEnemyHover={setHoveredEnemy}
        onBackgroundClick={() => setAttackMode(false)}
        attackMode={attackMode}
        uiScale={uiScale}
        playerPositions={playerPositions} 
      />
      
      <div style={{position:'fixed', top:0, left:0, width:'100%', padding:'20px', display:'flex', justifyContent:'flex-end', zIndex:10000, pointerEvents:'none'}}>
          <button className="btn-title" style={{width: 'auto', padding:'5px 15px', fontSize:'0.8rem', pointerEvents:'auto', background:'rgba(0,0,0,0.8)', border:'1px solid #333'}} onClick={() => setMenuOpen(true)}>
              MENU
          </button>
      </div>

      {!isWarping && (
        <div style={{ position: 'fixed', top: '80px', right: '20px', width: '250px', pointerEvents: 'none', textAlign: 'right', zIndex: 10000 }}>
            {G.log.slice(-5).map((log, i) => (
                <div key={i} style={{ marginBottom: '4px', color: '#00ccff', fontSize: '0.7rem', opacity: 0.5 + (i/5)*0.5, textShadow: '0 0 2px #00ccff' }}>
                    {log}
                </div>
            ))}
        </div>
      )}

      {!isWarping && (
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
                        transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' // Smooth layout animation
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

                            {/* Vitals: HP and XP */}
                            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {/* HP Bar - Prominent */}
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
                                {/* XP Bar - Thin */}
                                <div style={{ width: '100%', height: '4px', background: '#001122', position: 'relative' }}>
                                    <div style={{ width: '45%', height: '100%', background: '#0088aa' }} />
                                </div>
                            </div>

                            {/* Action Row - Only visible when active */}
                            {isActive && (
                                <div style={{ 
                                    flex: 1, display: 'flex', gap: '8px', padding: '0 10px 10px 10px', 
                                    animation: 'fade-in 0.5s' 
                                }}>
                                    <button 
                                        style={attackMode ? activeBtnStyle : btnStyle}
                                        onClick={() => { audio.blip(); setAttackMode(!attackMode); }}
                                        title="ATTACK"
                                    >
                                        <IconAttack />
                                    </button>
                                    <button 
                                        style={btnStyle}
                                        onClick={() => moves.defend()}
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
      )}

      {/* NEW: Defeat Modal */}
      {G.phase === 'defeat' && (
          <div className="modal-overlay">
              <div style={{textAlign:'center', border: '2px solid #cc0044', padding: '40px', background: 'rgba(0,0,0,0.9)'}}>
                  <h1 style={{fontSize:'4rem', color:'#cc0044', marginBottom:20, textShadow: '0 0 10px #cc0044'}}>SYSTEM FAILURE</h1>
                  <p style={{color: '#fff', marginBottom: '30px', fontFamily: 'monospace'}}>CRITICAL KERNEL PANIC // DATA LOST</p>
                  <button 
                    className="btn-title" 
                    style={{borderColor: '#cc0044', color: '#cc0044'}}
                    onClick={() => window.location.reload()}
                  >
                      [ REBOOT SYSTEM ]
                  </button>
              </div>
          </div>
      )}

      {G.phase === 'victory' && !isWarping && (
          <div className="modal-overlay">
              <div style={{textAlign:'center'}}>
                  <h1 style={{fontSize:'4rem', color:'#00ff41', marginBottom:20}}>SECTOR CLEARED</h1>
                  <button className="btn-title" onClick={handleNextSector}>PROCEED &gt;&gt;</button>
              </div>
          </div>
      )}

      {menuOpen && (
        <div className="modal-overlay">
          <div style={{width: 300, border: '2px solid #00ff41', background: '#000', padding: 20, textAlign: 'center'}}>
            <h2 style={{color:'#00ff41', marginBottom: 20}}>PAUSED</h2>
            <button className="btn-title" style={{width:'100%', marginBottom: 10}} onClick={() => setMenuOpen(false)}>RESUME</button>
            <button className="btn-title" style={{width:'100%', borderColor:'red', color:'red'}} onClick={() => window.location.reload()}>REBOOT SYSTEM</button>
          </div>
        </div>
      )}
    </>
  );
}