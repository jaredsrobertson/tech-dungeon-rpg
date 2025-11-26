import React from 'react';
import { CLASSES, get2DShapePoints } from '../game/constants';

export const IconAttack = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M14.5 5.5L3 17 5.5 19.5 17 8zM19 3L5 17 7 19 21 5z"/></svg>;
export const IconDefend = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4zm0 10.9c-2.8 0-5-2.2-5-5h10c0 2.8-2.2 5-5 5z"/></svg>;

// Optimized: Wrapped in React.memo to prevent unnecessary DOM patching
export const PlayerIcon = React.memo(({ classID, size = 45 }) => {
    // Look up class definition
    const classDef = CLASSES[classID] || CLASSES.firewall;
    const color = classDef.color;
    const shapeType = classDef.icon;
    
    const internalSize = size;
    const cx = internalSize / 2;
    const cy = internalSize / 2;
    const r = internalSize * 0.42;

    // Get Path String
    const shapePath = get2DShapePoints(shapeType, cx, cy, r);
    
    return (
        <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={internalSize} height={internalSize} viewBox={`0 0 ${internalSize} ${internalSize}`} style={{ overflow: 'visible' }}>
                <filter id={`glow-icon-${classID}`}>
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <g filter={`url(#glow-icon-${classID})`}>
                    {/* Render as Path */}
                    <path 
                        d={shapePath} 
                        fill={color} 
                        fillOpacity="0.8" 
                        stroke={color} 
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                </g>
            </svg>
        </div>
    );
});