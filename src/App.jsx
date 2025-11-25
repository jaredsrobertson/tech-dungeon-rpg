import React from 'react';
import { Client } from 'boardgame.io/react';
import { KernelPanic } from './game/Game';
import { KernelBoard } from './ui/Board';

const KernelClient = Client({
  game: KernelPanic,
  board: KernelBoard,
  debug: false,
});

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <KernelClient playerID="0" />
    </div>
  );
}

export default App;