import React, { useState } from 'react';
import { PATCHES } from '../../game/data/patches';

export const SoftwareManager = ({ G, moves, playerID, onClose }) => {
    const player = G.players[playerID];
    const [selectedSlot, setSelectedSlot] = useState(null);

    const handleInventoryClick = (patchID) => {
        if (selectedSlot !== null) {
            moves.equipAbility(patchID, selectedSlot);
            setSelectedSlot(null);
        }
    };

    const handleSlotClick = (index) => {
        if (player.loadout[index]) {
            moves.unequipAbility(index);
            setSelectedSlot(null);
        } else {
            setSelectedSlot(index === selectedSlot ? null : index);
        }
    };

    if (!player) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h2 className="modal-title">
                        MANAGE: <span style={{color: '#00ff41'}}>{player.name}</span>
                    </h2>
                    <button className="btn-title btn-small" onClick={onClose}>CLOSE [ESC]</button>
                </div>

                <div className="modal-body">
                    {/* LEFT PANEL */}
                    <div className="panel-left">
                        <h3 style={{color: '#888', marginBottom: '15px'}}>ACTIVE MEMORY</h3>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: 'auto'}}>
                            {[0, 1, 2].map(i => {
                                const isLocked = i >= player.activeSlots;
                                const content = player.loadout[i];
                                const patch = content ? PATCHES[content] : null;
                                const isSelected = selectedSlot === i;

                                return (
                                    <div 
                                        key={i} 
                                        className="slot-item"
                                        onClick={() => !isLocked && handleSlotClick(i)}
                                        style={{
                                            border: isSelected ? '1px solid #fff' : (isLocked ? '1px dashed #333' : '1px solid #555'),
                                            background: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                                            cursor: isLocked ? 'not-allowed' : 'pointer',
                                            opacity: isLocked ? 0.3 : 1
                                        }}
                                    >
                                        {isLocked ? <span style={{color: '#444'}}>LOCKED</span> : 
                                         patch ? <div style={{textAlign:'center', color:'#00ff41'}}>{patch.name}</div> : 
                                         <span style={{color: '#444'}}>{isSelected ? '> SELECT <' : 'EMPTY'}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT PANEL */}
                    <div className="panel-right">
                        <h3 style={{color: '#888', marginBottom: '20px'}}>STORAGE</h3>
                        <div className="inventory-grid">
                            {player.inventory.map((patchID, idx) => {
                                const patch = PATCHES[patchID];
                                return (
                                    <div 
                                        key={idx}
                                        className="inventory-item"
                                        onClick={() => handleInventoryClick(patchID)}
                                        style={{ 
                                            cursor: selectedSlot !== null ? 'pointer' : 'default',
                                            opacity: selectedSlot !== null ? 1 : 0.6
                                        }}
                                    >
                                        <div style={{color: '#fff', fontSize: '0.9rem'}}>{patch.name}</div>
                                        <div style={{color: '#666', fontSize: '0.7rem'}}>{patch.type}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};