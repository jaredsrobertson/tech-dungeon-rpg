import React from 'react';
import { get2DShapePoints } from '../game/constants';
import { CLASSES } from '../game/data/classes';

export const IconAttack = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M14.5 5.5L3 17 5.5 19.5 17 8zM19 3L5 17 7 19 21 5z"/></svg>;
export const IconDefend = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4zm0 10.9c-2.8 0-5-2.2-5-5h10c0 2.8-2.2 5-5 5z"/></svg>;
export const IconInfo = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>;
export const IconSpecial1 = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.5 2.52l2.3 2.3C21.62 15.43 22 13.78 22 12c0-5.18-3.95-9.45-9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-5.06.5-9 4.76-9 9.95 0 5.52 4.47 10 9.99 10 3.31 0 6.24-1.61 8.06-4.09l-2.6-2.6C16.5 17.88 14.39 19 12 19z"/></svg>;
export const IconSpecial2 = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M7 11h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>;

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