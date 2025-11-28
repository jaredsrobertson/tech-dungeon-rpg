import React, { useState } from 'react';
import { audio } from '../engine/audio/audio';
import { LobbyView } from './menus/LobbyView';
import { CombatView } from './views/CombatView';
import { TitleBackground } from './menus/TitleBackground'; // Import the new component

export function KernelBoard({ G, moves, playerID }) {
  const [gameStarted, setGameStarted] = useState(false);

  const handleNewGame = () => {
      audio.init();
      setGameStarted(true);
  };

  // --- TITLE SCREEN ---
  if (!gameStarted) {
      return (
          <>
            {/* The Animated Grid Background */}
            <TitleBackground />

            {/* The UI Overlay */}
            <div className="title-screen-layer">
                
                {/* 3D Tilted Text */}
                <div className="retro-3d-wrapper">
                    <h1 className="retro-3d-title">TERMINAL</h1>
                    <div className="retro-subtitle">SYSTEM BREACH DETECTED</div>
                </div>

                {/* Menu Buttons */}
                <div className="title-menu">
                    <button className="btn-retro" onClick={handleNewGame}>
                        NEW GAME
                    </button>
                    <button className="btn-retro" disabled>
                        JOIN GAME
                    </button>
                    <button className="btn-retro" disabled>
                        LOAD GAME
                    </button>
                    <button className="btn-retro" disabled>
                        CONFIG
                    </button>
                </div>

                <div style={{ position: 'absolute', bottom: 30, opacity: 0.4, fontSize: '0.7rem', color: '#fff', letterSpacing: '2px' }}>
                    © 1987 WINDOW95 // V.0.9
                </div>
            </div>
          </>
      );
  }

  // Routing Logic
  if (G.phase === 'lobby') {
      return <LobbyView G={G} moves={moves} playerID={playerID} />;
  }

  return <CombatView G={G} moves={moves} />;
}