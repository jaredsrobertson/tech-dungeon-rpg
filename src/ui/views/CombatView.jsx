// src/ui/views/CombatView.jsx
import React, { useEffect, useState, useRef } from 'react';
import { generateGlitchText } from '../../game/constants';
import { useFluidLayout } from '../../hooks/useFluidLayout';
import { AudioSystem } from '../../engine/audio/AudioSystem';
import { TunnelRenderer } from '../../engine/renderer/renderer';
import { HUD } from '../hud/HUD';
import { SoftwareManager } from '../menus/SoftwareManager';
import { MerchantView } from '../menus/MerchantView';
import { PATCHES } from '../../game/data/patches';

// --- LOOT MODAL COMPONENT (Cleaned) ---
const LootModal = ({ G, playerID, onAccept }) => {
    // Find player by owner ID (Client ID)
    const myPlayerKey = Object.keys(G.players).find(k => G.players[k].owner === String(playerID));
    const result = G.encounterResults ? G.encounterResults[myPlayerKey] : null;
    const isAccepted = result ? result.accepted : false;

    const totalPlayers = Object.keys(G.players).length;
    const acceptedCount = G.encounterResults ? Object.values(G.encounterResults).filter(r => r.accepted).length : 0;

    return (
        <div className="modal-overlay">
            <div className="loot-modal">
                <h1 className="loot-title">SECTOR CLEARED</h1>
                
                {result ? (
                    <div className="loot-content">
                        <h3 className="loot-header">
                            REWARDS // {G.players[myPlayerKey]?.name}
                        </h3>
                        
                        <div className="loot-row">
                            <span className="loot-label">Bytes:</span>
                            <span className="loot-value">+{result.bytes}</span>
                        </div>

                        {result.items.length > 0 ? (
                            <div>
                                <div className="loot-section-title">PATCHES FOUND:</div>
                                {result.items.map((itemId, i) => (
                                    <div key={i} className="loot-item">
                                        {PATCHES[itemId]?.name || itemId}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="loot-empty">No software patches found.</div>
                        )}
                    </div>
                ) : (
                    <div className="loot-empty">Retrieving flight data...</div>
                )}

                <div className="loot-actions">
                    {!isAccepted ? (
                        <button className="btn-title" onClick={onAccept}>
                            ACCEPT LOOT
                        </button>
                    ) : (
                        <button className="btn-title" disabled style={{borderColor: '#555', color: '#555'}}>
                            WAITING FOR SQUAD ({acceptedCount}/{totalPlayers})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export const CombatView = ({ G, moves, playerID }) => {
  const [selectedAbility, setSelectedAbility] = useState(null);
  const [hoveredEnemy, setHoveredEnemy] = useState(null);
  const [isWarping, setIsWarping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visualSeed, setVisualSeed] = useState(0);
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

  useEffect(() => {
    const onKey = (e) => {
        if (isWarping || speakingId) return;
        
        const key = e.key.toLowerCase();
        const activePlayer = G.players[G.activeEntity];
        const isPlayerTurn = activePlayer && G.activeEntity && !G.activeEntity.startsWith('e') && G.activeEntity !== 'boss';

        if (key === 'escape') { 
            if (managingPlayerId) setManagingPlayerId(null);
            else setMenuOpen(m => !m);
            setSelectedAbility(null);
            return;
        }

        if (!menuOpen && !managingPlayerId && isPlayerTurn) {
            if (key === 'd') { 
                moves.defend(); 
                setSelectedAbility(null);
            }
            if (['1', '2', '3'].includes(key)) {
                const slotIdx = parseInt(key) - 1;
                const abilityID = activePlayer.loadout[slotIdx];
                if (abilityID) {
                    const livingEnemies = Object.values(G.enemies).filter(e => e.hp > 0);
                    if (livingEnemies.length === 1) {
                        moves.useAbility(livingEnemies[0].id, abilityID);
                    } else {
                        setSelectedAbility(abilityID);
                    }
                }
            }
            if (key === 'backspace' || key === 'delete') {
                setSelectedAbility(null);
            }
        }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isWarping, speakingId, menuOpen, managingPlayerId, G.activeEntity, G.phase, G.players, G.enemies]);

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

      {G.phase === 'merchant' && !isWarping && (
          <MerchantView G={G} moves={moves} />
      )}

      {managingPlayerId && (
          <SoftwareManager 
              G={G} 
              moves={moves} 
              playerID={managingPlayerId} 
              onClose={() => setManagingPlayerId(null)} 
          />
      )}

      {menuOpen && (
        <div className="modal-overlay">
          <div className="pause-menu">
            <h2 style={{color:'#00ff41', marginBottom: 20}}>PAUSED</h2>
            <button className="btn-title" style={{width:'100%', marginBottom: 10}} onClick={() => setMenuOpen(false)}>RESUME</button>
            <button className="btn-title" style={{width:'100%', borderColor:'red', color:'red'}} onClick={() => window.location.reload()}>REBOOT SYSTEM</button>
          </div>
        </div>
      )}

      {G.phase === 'defeat' && (
          <div className="modal-overlay">
              <div className="defeat-modal">
                  <h1 style={{fontSize:'4rem', color:'#cc0044', marginBottom:20, textShadow: '0 0 10px #cc0044'}}>SYSTEM FAILURE</h1>
                  <button className="btn-title" style={{borderColor: '#cc0044', color: '#cc0044'}} onClick={() => window.location.reload()}>[ REBOOT SYSTEM ]</button>
              </div>
          </div>
      )}

      {G.phase === 'victory' && !isWarping && (
          <LootModal 
              G={G} 
              playerID={playerID} 
              onAccept={() => moves.acceptLoot()} 
          />
      )}
    </>
  );
};