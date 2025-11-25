import React from 'react';
import { SHAPES_2D, COLOR_PAIRS, get2DShapePoints } from '../game/constants';

export const IconAttack = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M14.5 5.5L3 17 5.5 19.5 17 8zM19 3L5 17 7 19 21 5z"/></svg>;
export const IconDefend = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4zm0 10.9c-2.8 0-5-2.2-5-5h10c0 2.8-2.2 5-5 5z"/></svg>;

// Optimized: Wrapped in React.memo to prevent unnecessary DOM patching
export const PlayerIcon = React.memo(({ visuals, size = 45 }) => {
    // Use provided visuals or fall back to default
    const colors = visuals ? COLOR_PAIRS[visuals.colorIdx] : COLOR_PAIRS[0];
    const shapeType = visuals ? SHAPES_2D[visuals.iconShapeIdx] : SHAPES_2D[0];
    
    // Adjust internal size and radius for consistent visual weight
    const internalSize = size; // The SVG viewBox size
    const cx = internalSize / 2;
    const cy = internalSize / 2;
    const r = internalSize * 0.42; // Slightly larger radius for better fill

    const shapeData = get2DShapePoints(shapeType, cx, cy, r);
    
    return (
        <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={internalSize} height={internalSize} viewBox={`0 0 ${internalSize} ${internalSize}`} style={{ overflow: 'visible' }}>
                {/* Glow effect filter */}
                <filter id={`glow-icon-${visuals?.colorIdx || 0}`}>
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <g filter={`url(#glow-icon-${visuals?.colorIdx || 0})`}>
                    {shapeType === 'circle' ? (
                        // Removed stroke and strokeWidth for no border
                        <circle cx={cx} cy={cy} r={r} fill={colors.p} fillOpacity="0.8" />
                    ) : (
                        // Removed stroke and strokeWidth for no border
                        <polygon points={shapeData} fill={colors.p} fillOpacity="0.8" />
                    )}
                </g>
            </svg>
        </div>
    );
});