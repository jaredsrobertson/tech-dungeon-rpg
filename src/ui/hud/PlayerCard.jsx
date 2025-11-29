import React, { useState } from 'react';
import { CLASSES } from '../../game/data/classes';
import { PATCHES } from '../../game/data/patches';
import { THEME } from '../../game/constants';
import { PlayerIcon, IconAttack, IconDefend, IconSpecial1, IconSpecial2, IconInfo } from '../components';

export const PlayerCard = ({ player, isActive, attackMode, setAttackMode, moves, playerPositions, onManage }) => {
    const [showAbilityMenu, setShowAbilityMenu] = useState(false);
    
    const classDef = CLASSES[player.classID] || CLASSES.firewall;
    const primary = classDef.color;
    const dim = '#444'; 

    const standardGreen = '#00FF41';
    const cardBorderColor = isActive ? standardGreen : '#004411';
    const cardTextColor = isActive ? primary : '#888'; 
    const cardShadow = isActive ? `0 0 20px ${standardGreen}` : 'none';

    const layout = playerPositions[player.id] || { left: 0, width: 100 };

    const btnStyle = {
        flex: 1, border: `1px solid ${dim}`, background: 'transparent',
        color: '#888', 
        cursor: 'pointer', transition: 'all 0.2s',
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0,
        borderRadius: '2px'
    };
    
    const activeBtnStyle = { ...btnStyle, background: primary, color: '#000', border: `1px solid ${primary}` };

    return (
        <div style={{ 
            position: 'absolute', 
            left: `${layout.left}px`, 
            width: `${layout.width}px`, 
            height: '100%',
            pointerEvents: 'auto',
            transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }}>
            {/* ABILITY POPUP MENU */}
            {isActive && showAbilityMenu && (
                <div style={{
                    position: 'absolute', bottom: '110%', left: 0, width: '100%',
                    background: 'rgba(0,0,0,0.9)', border: '1px solid #00ff41',
                    padding: '5px', display: 'flex', flexDirection: 'column', gap: '5px',
                    zIndex: 20
                }}>
                    <div style={{fontSize:'0.7rem', color:'#666', textAlign:'center', borderBottom:'1px solid #333', paddingBottom:'3px'}}>SELECT PROGRAM</div>
                    {player.loadout.map((abilityID, idx) => {
                        if (!abilityID) return null;
                        const patch = PATCHES[abilityID];
                        if (!patch) return null;
                        return (
                            <button 
                                key={idx}
                                style={{
                                    background: 'transparent', border: '1px solid #333', color: '#fff',
                                    padding: '8px', cursor: 'pointer', textAlign: 'left',
                                    fontSize: '0.8rem', fontFamily: 'monospace'
                                }}
                                onClick={() => {
                                    setAttackMode(abilityID); // Passing ID now
                                    setShowAbilityMenu(false);
                                }}
                            >
                                {patch.name}
                                <span style={{float:'right', color:'#666'}}>{patch.damage ? `${patch.damage.min}-${patch.damage.max}` : 'N/A'}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div style={{ 
                width: '100%', height: '100%', 
                background: 'rgba(5, 5, 5, 0.9)', 
                border: `1px solid ${cardBorderColor}`,
                display: 'flex', flexDirection: 'column',
                boxShadow: cardShadow,
                overflow: 'hidden',
                borderRadius: '4px'
            }}>
                {/* Top Bar */}
                <div style={{ 
                    display: 'flex', alignItems: 'center', 
                    padding: '5px 8px', background: 'rgba(0,0,0,0.3)',
                    borderBottom: '1px solid #222',
                    height: '40px'
                }}>
                    <div style={{ marginRight: '10px' }}><PlayerIcon classID={player.classID} size={28} /></div>
                    <span style={{ 
                        color: cardTextColor, fontWeight: 'bold', fontSize: '0.8rem', 
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', 
                        flex: 1 
                    }}>
                        {player.name}
                    </span>
                    <div style={{fontSize: '0.7rem', color: '#0088aa', fontWeight:'bold', marginRight: '8px'}}>
                        {player.bytes}B
                    </div>
                    {/* MANAGE BUTTON */}
                    <button style={{
                        background:'transparent', border:'none', color:'#666', cursor:'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} title="Manage Software" onClick={() => onManage(player.id)}>
                        <IconInfo /> 
                    </button>
                </div>

                {/* Vitals */}
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ width: '100%', height: '14px', background: '#1a0505', position: 'relative', border: '1px solid #333' }}>
                        <div style={{ 
                            width: `${(player.hp / player.maxHp) * 100}%`, height: '100%', 
                            background: player.hp < 30 ? '#ff0044' : '#00ff41', 
                            transition: 'width 0.3s' 
                        }} />
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: '900', color: '#fff', textShadow: '0 0 2px #000', pointerEvents:'none'
                        }}>
                            {player.hp} / {player.maxHp}
                        </div>
                    </div>
                </div>

                {/* Action Row */}
                {isActive && (
                    <div style={{ 
                        flex: 1, display: 'flex', gap: '8px', padding: '0 10px 10px 10px', 
                        animation: 'fade-in 0.5s' 
                    }}>
                        <button 
                            style={showAbilityMenu || attackMode ? activeBtnStyle : btnStyle}
                            onClick={() => { setShowAbilityMenu(!showAbilityMenu); }}
                            title="ATTACK MENU"
                        >
                            <IconAttack />
                        </button>
                        <button 
                            style={btnStyle}
                            onClick={() => { moves.defend(); setShowAbilityMenu(false); }}
                            title="DEFEND"
                        >
                            <IconDefend />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};