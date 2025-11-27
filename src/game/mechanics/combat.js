// src/game/mechanics/combat.js

export const getActiveEntities = (G) => [
  ...Object.values(G.players),
  ...Object.values(G.enemies)
].filter(e => e.hp > 0).sort((a, b) => b.speed - a.speed);

export const getNextId = (G, currentId) => {
  const order = getActiveEntities(G);
  const idx = order.findIndex(e => e.id === currentId);
  return order[(idx + 1) % order.length]?.id || order[0]?.id;
};

export const calculateDamage = (baseMin, baseMax, isCrit, isDefending) => {
  let dmg = (baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1)));
  if (isCrit) dmg *= 2;
  if (isDefending) dmg = Math.floor(dmg * 0.5);
  return dmg;
};

// Helper to standardizing event logging
export const triggerEvent = (G, type, payload = {}) => {
    G.eventCount = (G.eventCount || 0) + 1;
    G.lastEvent = { id: G.eventCount, type, ...payload };
};