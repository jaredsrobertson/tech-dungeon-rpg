import React from 'react';
import { PATCHES } from '../../game/data/patches';

export const MerchantView = ({ G, moves }) => {
    // Helper to get active player
    const player = G.players[G.activeEntity];
    
    // Generate a fixed set of items if G.shopStock isn't available yet (fallback)
    const stock = G.shopStock || ['sys_bash', 'overclock_v1', 'hardened_kernel']; 

    if (!player) return null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', zIndex: 50,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
            <h1 style={{color: '#FFD700', fontSize: '3rem', marginBottom: '10px', textShadow: '0 0 15px #FFD700'}}>MERCHANT NODE</h1>
            <p style={{color: '#888', marginBottom: '40px'}}>EXCHANGE DATA FOR UPGRADES</p>

            <div style={{
                display: 'flex', gap: '40px', width: '80%', maxWidth: '1000px', height: '60%',
                background: 'rgba(20,20,20,0.9)', border: '1px solid #FFD700', padding: '30px'
            }}>
                {/* SHOP LIST */}
                <div style={{flex: 2, overflowY: 'auto'}}>
                    <h3 style={{color: '#FFD700', borderBottom: '1px solid #555', paddingBottom: '10px', marginBottom: '20px'}}>AVAILABLE SOFTWARE</h3>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px'}}>
                        {stock.map((itemID, idx) => {
                            const item = PATCHES[itemID];
                            const cost = 100; // Static cost for now
                            const canAfford = player.bytes >= cost;

                            return (
                                <div key={idx} style={{
                                    border: '1px solid #444', padding: '15px', background: '#111',
                                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                                }}>
                                    <div>
                                        <div style={{color: '#fff', fontWeight: 'bold'}}>{item.name}</div>
                                        <div style={{color: '#666', fontSize: '0.8rem', margin: '5px 0'}}>{item.desc}</div>
                                    </div>
                                    <button 
                                        className="btn-title btn-small"
                                        disabled={!canAfford}
                                        onClick={() => moves.buyPatch(itemID, cost)}
                                        style={{marginTop: '10px', borderColor: canAfford ? '#FFD700' : '#333', color: canAfford ? '#FFD700' : '#333'}}
                                    >
                                        BUY {cost}B
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* PLAYER STATUS & RECYCLE */}
                <div style={{flex: 1, borderLeft: '1px solid #333', paddingLeft: '30px', display: 'flex', flexDirection: 'column'}}>
                    <div style={{marginBottom: '30px'}}>
                        <h3 style={{color: '#fff'}}>CURRENT USER: <span style={{color: '#00ff41'}}>{player.name}</span></h3>
                        <div style={{fontSize: '1.5rem', color: '#0088aa', marginTop: '10px'}}>{player.bytes} BYTES</div>
                        <button className="btn-title btn-small" onClick={() => moves.nextRoom()} style={{marginTop: '20px'}}>
                            LEAVE NODE
                        </button>
                    </div>

                    <div style={{flex: 1, borderTop: '1px solid #333', paddingTop: '20px'}}>
                        <h3 style={{color: '#cc0044', marginBottom: '10px'}}>RECYCLE BIN</h3>
                        <p style={{fontSize: '0.8rem', color: '#666', marginBottom: '15px'}}>Destroy software for 50 Bytes.</p>
                        <div style={{overflowY: 'auto', maxHeight: '300px'}}>
                            {player.inventory.map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px', borderBottom: '1px solid #222'
                                }}>
                                    <span style={{color: '#ccc'}}>{PATCHES[item].name}</span>
                                    <button 
                                        style={{background: 'transparent', border: '1px solid #cc0044', color: '#cc0044', cursor: 'pointer', padding: '2px 8px'}}
                                        onClick={() => moves.recyclePatch(item)}
                                    >
                                        SCRAP
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};