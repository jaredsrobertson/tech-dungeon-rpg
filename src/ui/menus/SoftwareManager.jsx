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
            <div style={{ 
                width: '800px', height: '600px', 
                background: 'rgba(10, 10, 12, 0.95)', 
                border: '1px solid #00ff41',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 0 30px rgba(0,255,65,0.1)'
            }}>
                {/* HEADER */}
                <div style={{padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h2 style={{color: '#fff', fontSize: '1.5rem'}}>
                        MANAGE SOFTWARE :: <span style={{color: '#00ff41'}}>{player.name}</span>
                    </h2>
                    <button className="btn-title btn-small" onClick={onClose}>CLOSE [ESC]</button>
                </div>

                <div style={{flex: 1, display: 'flex', overflow: 'hidden'}}>
                    
                    {/* LEFT: LOADOUT & STATS */}
                    <div style={{width: '40%', padding: '20px', borderRight: '1px solid #333', background: 'rgba(0,0,0,0.3)', display:'flex', flexDirection:'column'}}>
                        
                        {/* ACTIVE SLOTS */}
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
                                        onClick={() => !isLocked && handleSlotClick(i)}
                                        style={{
                                            height: '70px', 
                                            border: isSelected ? '1px solid #fff' : (isLocked ? '1px dashed #333' : '1px solid #555'),
                                            background: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: isLocked ? 'not-allowed' : 'pointer',
                                            opacity: isLocked ? 0.3 : 1
                                        }}
                                    >
                                        {isLocked ? (
                                            <span style={{color: '#444'}}>LOCKED (LVL {i === 1 ? 5 : 10})</span>
                                        ) : patch ? (
                                            <div style={{textAlign: 'center'}}>
                                                <div style={{color: '#00ff41', fontWeight: 'bold'}}>{patch.name}</div>
                                                <div style={{fontSize: '0.7rem', color: '#888'}}>
                                                    {patch.damage ? `DMG: ${patch.damage.min}-${patch.damage.max}` : patch.desc}
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{color: '#444'}}>{isSelected ? '> SELECT PATCH <' : 'EMPTY SLOT'}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* KERNEL STATS & PASSIVES */}
                        <div style={{paddingTop: '20px', borderTop: '1px solid #333'}}>
                            <h3 style={{color: '#888', marginBottom: '10px'}}>KERNEL STATS</h3>
                            <div style={{fontSize: '0.9rem', color: '#ccc', lineHeight: '1.6'}}>
                                <div>HP: {player.hp} / {player.maxHp}</div>
                                <div>SPEED: {player.speed}</div>
                                <div>BYTES: {player.bytes}</div>
                            </div>
                            
                            <div style={{marginTop: '15px'}}>
                                <div style={{color: '#888', fontSize: '0.8rem', marginBottom:'5px'}}>INSTALLED HARDWARE:</div>
                                {player.passives.length === 0 ? <span style={{color:'#444', fontSize:'0.7rem'}}>NONE</span> : (
                                    <div style={{display:'flex', flexWrap:'wrap', gap:'5px'}}>
                                        {player.passives.map((pid, idx) => (
                                            <span key={idx} style={{
                                                background:'#003311', color:'#00ff41', fontSize:'0.75rem', 
                                                padding:'2px 6px', border:'1px solid #005522', borderRadius:'3px'
                                            }}>
                                                {PATCHES[pid]?.name || pid}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: INVENTORY */}
                    <div style={{flex: 1, padding: '20px', overflowY: 'auto'}}>
                        <h3 style={{color: '#888', marginBottom: '20px'}}>STORAGE</h3>
                        {player.inventory.length === 0 ? (
                            <div style={{color: '#444', fontStyle: 'italic'}}>No patches in storage.</div>
                        ) : (
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px'}}>
                                {player.inventory.map((patchID, idx) => {
                                    const patch = PATCHES[patchID];
                                    if (!patch) return null;
                                    return (
                                        <div 
                                            key={idx}
                                            onClick={() => handleInventoryClick(patchID)}
                                            style={{
                                                border: '1px solid #333', padding: '10px',
                                                background: 'rgba(30,30,30,0.5)',
                                                cursor: selectedSlot !== null ? 'pointer' : 'default',
                                                opacity: selectedSlot !== null ? 1 : 0.6,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{color: '#fff', fontSize: '0.9rem', marginBottom: '5px'}}>{patch.name}</div>
                                            <div style={{color: '#666', fontSize: '0.7rem'}}>{patch.type}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};