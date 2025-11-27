import React, { useState, useEffect } from 'react';
import { audio } from '../engine/audio/audio';
import { LobbyView } from './menus/LobbyView';
import { CombatView } from './views/CombatView';

export function KernelBoard({ G, moves, playerID }) {
  const [gameStarted, setGameStarted] = useState(false);

  // Audio initialization handler
  const handleNewGame = () => {
      audio.init();
      setGameStarted(true);
      audio.warp(); 
  };

  // Game Start Screen
  if (!gameStarted) {
      return (
          <div className="title-container">
              <h1 className="logo-main" data-text="TERMINAL.EXE">TERMINAL.EXE</h1>
              <div className="menu-list">
                  <button className="btn-title" onClick={handleNewGame}>[ NEW GAME ]</button>
                  <button className="btn-title" disabled>[ LOAD GAME ]</button>
                  <button className="btn-title" disabled>[ SETTINGS ]</button>
              </div>
              <div style={{ marginTop: '50px', opacity: 0.5, fontSize: '0.7rem' }}>
                  SYS.AUD.REQ // PERMISSION REQUIRED
              </div>
          </div>
      );
  }

  // Routing Logic
  if (G.phase === 'lobby') {
      return <LobbyView G={G} moves={moves} playerID={playerID} />;
  }

  return <CombatView G={G} moves={moves} />;
}