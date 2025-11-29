import React, { useEffect, useState, useRef } from 'react';
import { generateGlitchText } from '../../game/constants';
import { useFluidLayout } from '../../hooks/useFluidLayout';
import { AudioSystem } from '../../engine/audio/AudioSystem';
import { TunnelRenderer } from '../../engine/renderer/renderer';
import { HUD } from '../hud/HUD';
import { SoftwareManager } from '../menus/SoftwareManager';
import { MerchantView } from '../menus/MerchantView';

export const CombatView = ({ G, moves }) => {
  const [selectedAbility, setSelectedAbility] = useState(null);
  const [hoveredEnemy, setHoveredEnemy] = useState(null);
  const [isWarping, setIsWarping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visualSeed, setVisualSeed] = useState(0);
  
  // NEW STATE FOR MANAGER
  const [managingPlayerId, setManagingPlayerId] = useState(null);
  
  const [speechQueue, setSpeechQueue] = useState([]);
  const [speakingId, setSpeakingId] = useState(null);
  const [currentSpeech, setCurrentSpeech] = useState('');

  const { positions: playerPositions, uiScale, isTooSmall } = useFluidLayout(G.players, G.activeEntity);
  const prevPhaseRef = useRef(G.phase);

  useEffect(() => {
      if (prevPhaseRef.current === 'lobby' && G.phase === 'combat') {
          setVisualSeed(Math.floor(Math.random() * 100000));
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
      if (G.phase !== 'combat') return;
      
      if (G.activeEntity && G.enemies[G.activeEntity]) {
          const enemy = G.enemies[G.activeEntity];
          if (!enemy || enemy.hp <= 0) { moves.enemyAttack(G.activeEntity); return; }
          
          if (!enemy.isCharging) { 
              moves.enemySelectTarget(G.activeEntity); 
          } else {
              const timer = setTimeout(() => { moves.enemyAttack(G.activeEntity); }, 2000); 
              return () => clearTimeout(timer);
          }
      }
      
      if (G.activeEntity && G.enemies[G.activeEntity]) setSelectedAbility(null);
      
  }, [G.activeEntity, G.phase, G.enemies]);

  useEffect(() => {
     if (!speakingId && speechQueue.length > 0) {
         const next = speechQueue[0];
         if (G.enemies[next.id] && G.enemies[next.id].hp > 0) {
             setSpeakingId(next.id);
             setCurrentSpeech(next.text);
         } else {
             setSpeechQueue(q => q.slice(1));
         }
     }
  }, [speakingId, speechQueue, G.enemies]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const onKey = (e) => {
        if (isWarping || speakingId) return;
        
        const key = e.key.toLowerCase();
        const activePlayer = G.players[G.activeEntity];
        const isPlayerTurn = activePlayer && G.activeEntity && !G.activeEntity.startsWith('e') && G.activeEntity !== 'boss';

        // 1. Global Toggles
        if (key === 'escape') { 
            if (managingPlayerId) setManagingPlayerId(null);
            else setMenuOpen(m => !m);
            setSelectedAbility(null);
            return;
        }

        // 2. Victory / Navigation
        if (G.phase === 'victory' && (key === ' ' || key === 'enter')) {
            handleNextSector();
            return;
        }

        // 3. Combat Controls (Only during Player Turn)
        if (!menuOpen && !managingPlayerId && isPlayerTurn) {
            
            // DEFEND
            if (key === 'd') { 
                moves.defend(); 
                setSelectedAbility(null);
            }

            // ABILITIES (1, 2, 3)
            if (['1', '2', '3'].includes(key)) {
                const slotIdx = parseInt(key) - 1;
                const abilityID = activePlayer.loadout[slotIdx];
                
                if (abilityID) {
                    // Smart Cast: If only 1 enemy or Boss exists, attack immediately
                    const livingEnemies = Object.values(G.enemies).filter(e => e.hp > 0);
                    if (livingEnemies.length === 1) {
                        moves.useAbility(livingEnemies[0].id, abilityID);
                    } else {
                        // Otherwise enter targeting mode
                        setSelectedAbility(abilityID);
                    }
                }
            }
            
            // CANCEL TARGETING
            if (key === 'backspace' || key === 'delete') {
                setSelectedAbility(null);
            }
        }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isWarping, speakingId, menuOpen, managingPlayerId, G.activeEntity, G.phase, G.players, G.enemies]);

  const handleNextSector = () => {
      if (isWarping) return;
      setIsWarping(true);
      setTimeout(() => { 
          moves.nextRoom(); 
          setTimeout(() => {
              // Only queue speech if it's a combat room (not merchant)
              if (G.depth % 10 !== 0) {
                  setSpeechQueue([
                      { id: 'e1', text: generateGlitchText() }, 
                      { id: 'e2', text: generateGlitchText() }
                  ]);
              }
              setIsWarping(false);
          }, 1000); 
      }, 1500);
  };

  const handleEnemyClick = (id) => {
      if (selectedAbility) {
          moves.useAbility(id, selectedAbility);
          setSelectedAbility(null);
      }
  };

  if (isTooSmall) {
      return (
          <div className="title-container" style={{textAlign:'center', padding:'20px'}}>
              <h1 style={{color:'#cc0044', fontSize:'2rem', marginBottom:'20px'}}>SYSTEM REQUIREMENTS NOT MET</h1>
              <p style={{color:'#ccc', fontFamily:'monospace'}}>TERMINAL TOO NARROW. EXPAND VIEWPORT.</p>
          </div>
      );
  }

  return (
    <>
      <AudioSystem G={G} />
      
      {/* RENDERER */}
      <TunnelRenderer 
        enemies={Object.values(G.enemies)} 
        players={G.players}
        targetedEnemy={hoveredEnemy} 
        activeEntity={G.activeEntity}
        isWarping={isWarping}
        depth={G.depth}
        visualSeed={visualSeed} 
        speakingId={speakingId}
        speechText={currentSpeech}
        onSpeechEnd={() => { setSpeakingId(null); setSpeechQueue(q => q.slice(1)); }}
        onEnemyClick={handleEnemyClick}
        onEnemyHover={setHoveredEnemy}
        onBackgroundClick={() => setSelectedAbility(null)}
        attackMode={!!selectedAbility} 
        uiScale={uiScale}
        playerPositions={playerPositions} 
      />

      {/* HUD (Pass onManage) */}
      <HUD 
        G={G} 
        moves={moves} 
        playerPositions={playerPositions} 
        selectedAbility={selectedAbility} 
        setSelectedAbility={setSelectedAbility} 
        isWarping={isWarping}
        onManage={setManagingPlayerId} 
      />

      <div style={{position:'fixed', top:0, left:0, width:'100%', padding:'20px', display:'flex', justifyContent:'flex-end', zIndex:10000, pointerEvents:'none'}}>
          <button className="btn-title" style={{width: 'auto', padding:'5px 15px', fontSize:'0.8rem', pointerEvents:'auto', background:'rgba(0,0,0,0.8)', border:'1px solid #333'}} onClick={() => setMenuOpen(true)}>
              MENU [ESC]
          </button>
      </div>

      {/* MERCHANT OVERLAY */}
      {G.phase === 'merchant' && !isWarping && (
          <MerchantView G={G} moves={moves} />
      )}

      {/* SOFTWARE MANAGER OVERLAY */}
      {managingPlayerId && (
          <SoftwareManager 
              G={G} 
              moves={moves} 
              playerID={managingPlayerId} 
              onClose={() => setManagingPlayerId(null)} 
          />
      )}

      {/* PAUSE MENU */}
      {menuOpen && (
        <div className="modal-overlay">
          <div className="pause-menu">
            <h2 style={{color:'#00ff41', marginBottom: 20}}>PAUSED</h2>
            <button className="btn-title" style={{width:'100%', marginBottom: 10}} onClick={() => setMenuOpen(false)}>RESUME</button>
            <button className="btn-title" style={{width:'100%', borderColor:'red', color:'red'}} onClick={() => window.location.reload()}>REBOOT SYSTEM</button>
          </div>
        </div>
      )}

      {/* GAME OVER / VICTORY MODALS */}
      {G.phase === 'defeat' && (
          <div className="modal-overlay">
              <div className="defeat-modal">
                  <h1 style={{fontSize:'4rem', color:'#cc0044', marginBottom:20, textShadow: '0 0 10px #cc0044'}}>SYSTEM FAILURE</h1>
                  <button className="btn-title" style={{borderColor: '#cc0044', color: '#cc0044'}} onClick={() => window.location.reload()}>[ REBOOT SYSTEM ]</button>
              </div>
          </div>
      )}

      {G.phase === 'victory' && !isWarping && (
          <div className="modal-overlay">
              <div className="victory-modal">
                  <h1 style={{fontSize:'4rem', color:'#00ff41', marginBottom:20}}>SECTOR CLEARED</h1>
                  <button className="btn-title" onClick={handleNextSector}>PROCEED [SPACE]</button>
              </div>
          </div>
      )}
    </>
  );
};