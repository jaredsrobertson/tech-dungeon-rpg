// src/game/mechanics/grid.js
const CELL_WIDTH = 500;  
const CELL_HEIGHT = 350; 

// 5-SLOT LAYOUT (Center + 4 Corners)
export const GRID_SLOTS = [
    { id: 0, col: 0, row: 0 },          // Center
    { id: 1, col: -0.6, row: -0.6 },    // Top-Left
    { id: 2, col: 0.6, row: -0.6 },     // Top-Right
    { id: 3, col: -0.6, row: 0.6 },     // Bottom-Left
    { id: 4, col: 0.6, row: 0.6 }       // Bottom-Right
];

// Helper to get visual coordinates
const getSlotCoords = (slotId) => {
    const slot = GRID_SLOTS.find(s => s.id === slotId);
    if (!slot) return { x: 0, y: 0, gridSlot: { col: 0, row: 0 } };
    
    return {
        x: (slot.col * CELL_WIDTH) + (Math.random() * 40 - 20), 
        y: (slot.row * CELL_HEIGHT) + (Math.random() * 40 - 20),
        gridSlot: { col: slot.col, row: slot.row }
    };
};

/**
 * Calculates a new position for an entity.
 * - If empty slots exist, picks one.
 * - If full, picks a random enemy to swap with.
 */
export const assignSlot = (allEnemies, myId) => {
    // 1. Map current occupancy
    const slotMap = {};
    let myCurrentSlot = -1;

    allEnemies.forEach(e => {
        if (e.hp > 0 && e.slotIndex !== undefined) {
            slotMap[e.slotIndex] = e.id;
            if (e.id === myId) myCurrentSlot = e.slotIndex;
        }
    });

    // 2. Find empty slots
    const availableSlots = GRID_SLOTS.filter(s => !slotMap[s.id]);

    let targetSlotId;
    let swapWithId = null;

    if (availableSlots.length > 0) {
        // PREFER EMPTY: Pick random available
        const slot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
        targetSlotId = slot.id;
    } else {
        // SWAP: Pick any slot that isn't mine
        const otherSlots = GRID_SLOTS.filter(s => s.id !== myCurrentSlot);
        if (otherSlots.length === 0) return null; // Should essentially never happen
        
        const slot = otherSlots[Math.floor(Math.random() * otherSlots.length)];
        targetSlotId = slot.id;
        swapWithId = slotMap[targetSlotId];
    }

    // 3. Generate Coordinates
    const coords = getSlotCoords(targetSlotId);

    return {
        slotIndex: targetSlotId,
        gridSlot: coords.gridSlot,
        x: coords.x,
        y: coords.y,
        distance: 250 + Math.random() * 50,
        swapWithId // Caller handles the swap logic
    };
};