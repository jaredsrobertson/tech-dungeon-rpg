import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { generateGlitchText } from '../../game/constants';
import { useFluidLayout } from '../../hooks/useFluidLayout';
import { AudioSystem } from '../../engine/audio/AudioSystem';
import { audio } from '../../engine/audio/audio';
import { TunnelRenderer } from '../../engine/renderer/renderer';
import { HUD } from '../hud/HUD';

export const CombatView = ({ G, moves }) => {
  const [attackMode, setAttackMode] = useState(false);
  const [hoveredEnemy, setHoveredEnemy] = useState(null);
  const [isWarping, setIsWarping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visualSeed, setVisualSeed] = useState(0);
  
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
      if (G.activeEntity && G.activeEntity.startsWith('e')) {
          const enemy = G.enemies[G.activeEntity];
          if (!enemy || enemy.hp <= 0) { moves.enemyAttack(G.activeEntity); return; }
          
          if (!enemy.isCharging) { 
              moves.enemySelectTarget(G.activeEntity); 
          } else {
              // CHANGED: Increased pause from 800ms to 2000ms for theatrical effect
              // This gives the new "charging" sound and animation time to play out
              const timer = setTimeout(() => { moves.enemyAttack(G.activeEntity); }, 2000); 
              return () => clearTimeout(timer);
          }
      }
      if (G.activeEntity && G.activeEntity.startsWith('e')) setAttackMode(false);
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
        
        if (key === 'escape') { 
            audio.blip(); 
            setMenuOpen(m => !m); 
            setAttackMode(false); 
        } else if (!menuOpen && G.activeEntity && !G.activeEntity.startsWith('e')) {
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
  }, [isWarping, speakingId, menuOpen, attackMode, G.activeEntity, G.enemies]);

  const handleNextSector = () => {
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
        onEnemyClick={(id) => { if(attackMode) { moves.attack(id); setAttackMode(false); } }}
        onEnemyHover={setHoveredEnemy}
        onBackgroundClick={() => setAttackMode(false)}
        attackMode={attackMode}
        uiScale={uiScale}
        playerPositions={playerPositions} 
      />

      <HUD 
        G={G} 
        moves={moves} 
        playerPositions={playerPositions} 
        attackMode={attackMode} 
        setAttackMode={setAttackMode} 
        isWarping={isWarping}
      />

      <div style={{position:'fixed', top:0, left:0, width:'100%', padding:'20px', display:'flex', justifyContent:'flex-end', zIndex:10000, pointerEvents:'none'}}>
          <button className="btn-title" style={{width: 'auto', padding:'5px 15px', fontSize:'0.8rem', pointerEvents:'auto', background:'rgba(0,0,0,0.8)', border:'1px solid #333'}} onClick={() => setMenuOpen(true)}>
              MENU
          </button>
      </div>

      {G.phase === 'defeat' && (
          <div className="modal-overlay">
              <div style={{textAlign:'center', border: '2px solid #cc0044', padding: '40px', background: 'rgba(0,0,0,0.9)'}}>
                  <h1 style={{fontSize:'4rem', color:'#cc0044', marginBottom:20, textShadow: '0 0 10px #cc0044'}}>SYSTEM FAILURE</h1>
                  <button className="btn-title" style={{borderColor: '#cc0044', color: '#cc0044'}} onClick={() => window.location.reload()}>[ REBOOT SYSTEM ]</button>
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
};