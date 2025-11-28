import React from 'react';
import { CLASSES } from '../../game/data/classes'; 
import { PlayerIcon } from '../components';
import { audio } from '../../engine/audio/audio';

export const LobbyView = ({ G, moves, playerID }) => {
  const canStart = Object.values(G.lobbyState).some(id => id !== null);
  
  // Helpers to count
  const myHeroes = Object.values(G.lobbyState).filter(pid => String(pid) === String(playerID)).length;
  const availableHeroes = Object.values(G.lobbyState).filter(pid => pid === null).length;

  const handleCardClick = (classID, isClaimed, isMine) => {
    if (!isClaimed) {
        moves.claimHero(classID);
    } else if (isMine) {
        moves.releaseHero(classID);
    } 
  };

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

        <div className="lobby-actions" style={{display: 'flex', gap: '20px', marginTop: '20px'}}>
            {availableHeroes > 0 && (
                <button className="btn-title btn-small" onClick={() => { moves.claimAllHeroes(); }}>
                    SELECT ALL AVAILABLE
                </button>
            )}
            {myHeroes > 0 && (
                <button className="btn-title btn-small btn-danger" onClick={() => { moves.releaseAllHeroes(); }}>
                    DESELECT ALL
                </button>
            )}
        </div>

        <div className="lobby-footer">
            <button 
                className="btn-title" 
                disabled={!canStart} 
                onClick={() => { moves.startRun(); }}
                style={{ width: '300px', marginTop: '30px' }}
            >
                [ JACK IN ]
            </button>
        </div>
    </div>
  );
};