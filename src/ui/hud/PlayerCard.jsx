import React, { useState } from 'react';
import { CLASSES } from '../../game/data/classes';
import { PATCHES } from '../../game/data/patches';
import { PlayerIcon, IconAttack, IconDefend, IconInfo } from '../components';

export const PlayerCard = React.memo(({ player, isActive, attackMode, setAttackMode, moves, playerPositions, onManage }) => {
    const [showAbilityMenu, setShowAbilityMenu] = useState(false);
    
    // Derived Data
    const classDef = CLASSES[player.classID] || CLASSES.firewall;
    const primary = classDef.color;
    
    const layout = playerPositions[player.id] || { left: 0, width: 100 };
    const borderColor = isActive ? '#00FF41' : '#004411';
    const shadow = isActive ? `0 0 20px #00FF41` : 'none';
    const nameColor = isActive ? primary : '#888';

    const handleAbilitySelect = (abilityID) => {
        setAttackMode(abilityID);
        setShowAbilityMenu(false);
    };

    return (
        <div 
            className="player-card-wrapper"
            style={{ left: `${layout.left}px`, width: `${layout.width}px` }}
        >
            {/* ABILITY POPUP */}
            {isActive && showAbilityMenu && (
                <div className="ability-menu">
                    <div style={{fontSize: '0.7rem', color: '#666', textAlign: 'center', borderBottom: '1px solid #333', paddingBottom: '3px'}}>
                        SELECT PROGRAM
                    </div>
                    {player.loadout.map((abilityID, idx) => {
                        if (!abilityID) return null;
                        const patch = PATCHES[abilityID];
                        if (!patch) return null;
                        return (
                            <button 
                                key={idx}
                                className="ability-btn"
                                onClick={() => handleAbilitySelect(abilityID)}
                            >
                                {patch.name}
                                <span style={{float:'right', color:'#666'}}>
                                    {patch.damage ? `${patch.damage.min}-${patch.damage.max}` : 'N/A'}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div 
                className="player-card"
                style={{ border: `1px solid ${borderColor}`, boxShadow: shadow }}
            >
                {/* TOP BAR */}
                <div className="card-top-bar">
                    <div style={{ marginRight: '10px' }}><PlayerIcon classID={player.classID} size={28} /></div>
                    <span className="card-name" style={{ color: nameColor }}>
                        {player.name}
                    </span>
                    <div className="card-bytes">{player.bytes}B</div>
                    <button className="manage-btn" title="Manage Software" onClick={() => onManage(player.id)}>
                        <IconInfo /> 
                    </button>
                </div>

                {/* VITALS */}
                <div className="vitals-container">
                    <div className="hp-bar-bg">
                        <div 
                            className="hp-fill" 
                            style={{ 
                                width: `${(player.hp / player.maxHp) * 100}%`, 
                                background: player.hp < 30 ? '#ff0044' : '#00ff41' 
                            }} 
                        />
                        <div className="hp-text">
                            {player.hp} / {player.maxHp}
                        </div>
                    </div>
                </div>

                {/* ACTIONS */}
                {isActive && (
                    <div className="card-actions">
                        <button 
                            className={`action-btn ${showAbilityMenu || attackMode ? 'active' : ''}`}
                            style={showAbilityMenu || attackMode ? { background: primary, borderColor: primary } : {}}
                            onClick={() => setShowAbilityMenu(!showAbilityMenu)}
                            title="ATTACK MENU"
                        >
                            <IconAttack />
                        </button>
                        <button 
                            className="action-btn"
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
});