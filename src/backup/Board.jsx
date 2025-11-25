import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { audio } from './audio';
import { PlayerIcon, IconAttack, IconDefend } from './components';
import { TunnelRenderer } from './renderer';
import { SHAPES_2D, COLOR_PAIRS, generateGlitchText } from './constants';

const PLAYER_AVATAR_SIZE = 400;
const PLAYER_AVATAR_BOTTOM_OFFSET = 60; 

const getPlayerVisuals = (id, seed = 0) => {
    const idNum = parseInt(id) || 0;
    const totalSeed = (idNum * 2) + seed; 
    const colorIdx = Math.floor(totalSeed) % COLOR_PAIRS.length;
    const shapeIdx = (idNum + Math.floor(seed)) % SHAPES_2D.length;
    const shapeType = SHAPES_2D[shapeIdx];
    let clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'; 

    if (shapeType === 'triangle') clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
    else if (shapeType === 'invertedTriangle') clipPath = 'polygon(0% 0%, 100% 0%, 50% 100%)';
    else if (shapeType === 'hexagon') clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
    else if (shapeType === 'circle') clipPath = 'circle(50% at 50% 50%)';
    else if (shapeType === 'rhombus') clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

    return { colors: COLOR_PAIRS[colorIdx], shapeType, clipPath };
};

export function KernelBoard({ G, moves, playerID }) {
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
  const prevLogLen = useRef(0);
  const victoryPlayed = useRef(false);

  // --- PERFORMANCE OPTIMIZATION ---
  const enemiesList = useMemo(() => Object.values(G.enemies || {}), [G.enemies]);
  const playersList = useMemo(() => G.players, [G.players]);
  
  // --- TURN ORDER CALCULATION ---
  const turnOrder = useMemo(() => {
    return [...Object.values(G.players), ...Object.values(G.enemies)]
      .filter(e => e.hp > 0)
      .sort((a, b) => b.speed - a.speed);
  }, [G.players, G.enemies]);

  const handleNewGame = () => {
      audio.init();
      setGameStarted(true);
      setVisualSeed(Math.floor(Math.random() * 100000));
      audio.warp(); 
      
      setTimeout(() => {
          setSpeechQueue([
              { id: 'e1', text: generateGlitchText() }, 
              { id: 'e2', text: generateGlitchText() }
          ]);
      }, 800);
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

  const handleNextSector = useCallback(() => {
      audio.warp();
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
      if (G.phase !== 'combat' || isTransitioning) return;
      if (G.activeEntity.startsWith('e')) {
          const enemy = G.enemies[G.activeEntity];
          if (!enemy || enemy.hp <= 0) { moves.enemyAttack(G.activeEntity); return; }
          if (!enemy.isCharging) { moves.enemySelectTarget(G.activeEntity); } 
          else {
              const timer = setTimeout(() => { moves.enemyAttack(G.activeEntity); }, 800); 
              return () => clearTimeout(timer);
          }
      }
      if (G.activeEntity.startsWith('e')) setAttackMode(false);
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
    if (!gameStarted) return;
    const newLogCount = G.log.length;
    if (newLogCount > prevLogLen.current) {
      const latest = G.log.slice(prevLogLen.current);
      latest.forEach(entry => {
          if (entry.includes('CRIT!')) audio.playerAttack(true);
          else if (entry.includes('->') && (entry.includes('Firewall') || entry.includes('Daemon'))) audio.playerAttack(false);
          else if (entry.includes('DMG ->')) audio.enemyAttack();
          else if (entry.includes('SHIELDS UP')) audio.defend();
      });
    }
    prevLogLen.current = newLogCount;
    if (G.phase === 'victory' && !victoryPlayed.current) { audio.victory(); victoryPlayed.current = true; } 
    else if (G.phase !== 'victory') { victoryPlayed.current = false; }
  }, [G.log, G.phase, gameStarted]);

  useEffect(() => {
    const onKey = (e) => {
        if (!gameStarted || isWarping || speakingId) return;
        const key = e.key.toLowerCase();
        if (key === 'escape') { audio.blip(); setMenuOpen(m => !m); setAttackMode(false); } 
        else if (!menuOpen && (G.activeEntity === '0' || G.activeEntity === '1')) {
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
  }, [G.activeEntity]);

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

  return (
    <>
      {!isWarping && (
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
                  const color = isEnemy ? '#ff0055' : '#00ff41';
                  
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
                              : <PlayerIcon id={entity.id} size={20} visualSeed={visualSeed} />
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
            position: 'fixed', bottom: '10px', width: '100%', 
            display: 'flex', justifyContent: 'center', gap: '20px', zIndex: 10000 
        }}>
            {Object.values(G.players).map(player => {
                const isActive = G.activeEntity === player.id;
                const { colors } = getPlayerVisuals(player.id, visualSeed);
                const primary = colors.p;
                const dim = colors.s;

                const standardGreen = '#00FF41';
                const cardBorderColor = isActive ? standardGreen : '#004411';
                const cardTextColor = isActive ? primary : dim; 
                const cardShadow = isActive ? `0 0 15px ${standardGreen}` : 'none';

                const btnStyle = {
                    flex: 1, border: `1px solid ${dim}`, background: 'transparent',
                    color: dim, 
                    cursor: 'pointer', transition: 'all 0.2s',
                    height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                };
                
                const activeBtnStyle = { ...btnStyle, background: primary, color: '#000', border: `1px solid ${primary}` };

                return (
                    <div key={player.id} style={{ position: 'relative' }}>
                        <div style={{ 
                            position: 'absolute', bottom: PLAYER_AVATAR_BOTTOM_OFFSET, left: '50%', transform: 'translateX(-50%)',
                            width: PLAYER_AVATAR_SIZE, height: PLAYER_AVATAR_SIZE, pointerEvents: 'none', zIndex: 50
                        }}>
                        </div>

                        <div style={{ 
                            width: '350px', height: '90px', 
                            background: 'rgba(5, 5, 5, 0.85)', 
                            border: `1px solid ${cardBorderColor}`,
                            display: 'flex', alignItems: 'center',
                            boxShadow: cardShadow,
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{ 
                                width: '90px', height: '100%', padding: '2px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(0,0,0,0.3)'
                            }}>
                                <PlayerIcon id={player.id} size={70} visualSeed={visualSeed} />
                            </div>

                            <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ 
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                    padding: '0 12px', borderBottom: '1px solid #222' 
                                }}>
                                    <span style={{ color: cardTextColor, fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '1px', marginRight:'10px' }}>
                                        {player.name}
                                    </span>
                                    <div style={{ 
                                        flex: 1, height: '18px', background: '#002200', position: 'relative',
                                        border: `1px solid ${standardGreen}`
                                    }}>
                                        <div style={{ 
                                            width: `${(player.hp / player.maxHp) * 100}%`, height: '100%', 
                                            background: standardGreen, transition: 'width 0.3s' 
                                        }} />
                                        <div style={{
                                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.9rem', fontWeight: '900', color: '#fff', textShadow: '0 0 3px #000', pointerEvents:'none'
                                        }}>
                                            {player.hp} / {player.maxHp}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ flex: 1, display: 'flex', padding: '8px 16px', gap: '12px' }}>
                                    {isActive && !speakingId ? (
                                        <div style={{ width: '100%', display: 'flex', gap: '12px' }}>
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
                                                onMouseEnter={(e) => {e.currentTarget.style.color = primary; e.currentTarget.style.border = `1px solid ${primary}`}}
                                                onMouseLeave={(e) => {e.currentTarget.style.color = dim; e.currentTarget.style.border = `1px solid ${dim}`}}
                                                title="DEFEND"
                                            >
                                                <IconDefend />
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#444', letterSpacing: '2px' }}>
                                            {speakingId ? 'INCOMING DATA...' : 'WAITING...'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
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