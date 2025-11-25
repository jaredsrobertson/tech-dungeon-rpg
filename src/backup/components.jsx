import React from 'react';
import { SHAPES_2D, COLOR_PAIRS, get2DShapePoints } from './constants';

export const IconAttack = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M14.5 5.5L3 17 5.5 19.5 17 8zM19 3L5 17 7 19 21 5z"/></svg>;
export const IconDefend = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4zm0 10.9c-2.8 0-5-2.2-5-5h10c0 2.8-2.2 5-5 5z"/></svg>;

// Optimized: Wrapped in React.memo to prevent unnecessary DOM patching
export const PlayerIcon = React.memo(({ id, size = 40, visualSeed = 0 }) => {
    const idNum = parseInt(id) || 0;
    
    const totalSeed = (idNum * 2) + visualSeed; 
    const colorIndex = Math.floor(totalSeed) % COLOR_PAIRS.length;
    const colors = COLOR_PAIRS[colorIndex];
    
    const shapeIdx = (idNum + Math.floor(visualSeed)) % SHAPES_2D.length;
    const shapeType = SHAPES_2D[shapeIdx];
    
    const cx = size / 2, cy = size / 2, r = size * 0.4;
    const shapeData = get2DShapePoints(shapeType, cx, cy, r);
    
    return (
        <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
                <filter id={`glow-icon-${id}`}><feGaussianBlur stdDeviation="2" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <g filter={`url(#glow-icon-${id})`}>
                    {shapeType === 'circle' ? (
                        <circle cx={cx} cy={cy} r={r} fill={colors.s} fillOpacity="0.2" stroke={colors.p} strokeWidth="2" />
                    ) : (
                        <polygon points={shapeData} fill={colors.s} fillOpacity="0.2" stroke={colors.p} strokeWidth="2" />
                    )}
                </g>
            </svg>
        </div>
    );
});