import React from 'react';
import { PATCHES } from '../../game/data/patches';

export const MerchantView = ({ G, moves }) => {
    const player = G.players[G.activeEntity];
    const stock = G.shopStock || ['sys_bash', 'overclock_v1', 'hardened_kernel']; 

    if (!player) return null;

    return (
        <div className="merchant-overlay">
            <h1 className="lobby-title" style={{color: '#FFD700', textShadow: '0 0 15px #FFD700'}}>MERCHANT NODE</h1>
            <p style={{color: '#888', marginBottom: '40px'}}>EXCHANGE DATA FOR UPGRADES</p>

            <div className="merchant-content">
                {/* SHOP LIST */}
                <div style={{flex: 2, overflowY: 'auto'}}>
                    <h3 style={{color: '#FFD700', borderBottom: '1px solid #555', paddingBottom: '10px', marginBottom: '20px'}}>AVAILABLE SOFTWARE</h3>
                    <div className="shop-grid">
                        {stock.map((itemID, idx) => {
                            const item = PATCHES[itemID];
                            const cost = 100;
                            const canAfford = player.bytes >= cost;

                            return (
                                <div key={idx} className="shop-item">
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

                {/* STATUS & RECYCLE */}
                <div style={{flex: 1, borderLeft: '1px solid #333', paddingLeft: '30px', display: 'flex', flexDirection: 'column'}}>
                    <div style={{marginBottom: '30px'}}>
                        <h3 style={{color: '#fff'}}>USER: <span style={{color: '#00ff41'}}>{player.name}</span></h3>
                        <div style={{fontSize: '1.5rem', color: '#0088aa', marginTop: '10px'}}>{player.bytes} BYTES</div>
                        <button className="btn-title btn-small" onClick={() => moves.nextRoom()} style={{marginTop: '20px'}}>
                            LEAVE NODE
                        </button>
                    </div>

                    <div style={{flex: 1, borderTop: '1px solid #333', paddingTop: '20px'}}>
                        <h3 style={{color: '#cc0044', marginBottom: '10px'}}>RECYCLE BIN</h3>
                        <p style={{fontSize: '0.8rem', color: '#666', marginBottom: '15px'}}>Scrap for 50 Bytes.</p>
                        <div style={{overflowY: 'auto', maxHeight: '300px'}}>
                            {player.inventory.map((item, idx) => (
                                <div key={idx} style={{display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #222'}}>
                                    <span style={{color: '#ccc'}}>{PATCHES[item].name}</span>
                                    <button 
                                        style={{background: 'transparent', border: '1px solid #cc0044', color: '#cc0044', cursor: 'pointer'}}
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