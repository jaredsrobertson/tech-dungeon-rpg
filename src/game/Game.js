import { CLASSES } from './data/classes';
import { moves } from './moves';

export const KernelPanic = {
  name: 'terminal-exe',
  minPlayers: 1,
  maxPlayers: 6,

  setup: () => {
    const lobbyState = {};
    Object.keys(CLASSES).forEach(key => lobbyState[key] = null);

    return {
        players: {},
        enemies: {},
        lobbyState,
        activeEntity: null,
        phase: 'lobby',
        depth: 1,
        shopStock: [], // NEW
        log: ['> SYSTEM BOOT', '> AWAITING PROTOCOL SELECTION...'],
        eventCount: 0,
        lastEvent: null
    };
  },

  moves: moves
};