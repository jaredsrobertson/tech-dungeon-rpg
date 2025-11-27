import { useState, useEffect, useRef } from 'react';
import { THEME } from '../game/constants';

const MIN_WIDTH = 768; // Minimum screen width before showing warning

export const useFluidLayout = (players = {}, activeEntity = null) => {
    const [layoutState, setLayoutState] = useState({
        positions: {},
        uiScale: 1,
        isTooSmall: false
    });

    // Use a ref to store the latest state for the animation frame
    const stateRef = useRef({ players, activeEntity });

    // Update ref when props change
    useEffect(() => {
        stateRef.current = { players, activeEntity };
        // Trigger a calc on prop change to ensure immediate response
        calculateLayout(); 
    }, [players, activeEntity]);

    const calculateLayout = () => {
        const width = window.innerWidth;
        const { players, activeEntity } = stateRef.current;

        // 1. Check Min Width
        if (width < MIN_WIDTH) {
            setLayoutState(prev => ({ ...prev, isTooSmall: true }));
            return;
        }

        // 2. Calculate UI Scale (Legacy support)
        const baseWidth = 1600;
        const uiScale = Math.min(1, width / baseWidth);

        // 3. Calculate Fluid Positions
        const playerIds = Object.keys(players);
        const numPlayers = playerIds.length;
        
        if (numPlayers === 0) {
            setLayoutState({ positions: {}, uiScale, isTooSmall: false });
            return;
        }

        const { SIDE_PADDING, GAP, FLEX_ACTIVE, FLEX_INACTIVE, MAX_INACTIVE_WIDTH } = THEME.PLAYER;
        const totalPadding = SIDE_PADDING * 2;
        const totalGap = Math.max(0, numPlayers - 1) * GAP;
        const availableSpace = width - totalPadding - totalGap;

        let totalFlex = 0;
        playerIds.forEach(pid => {
            const isActive = pid === activeEntity;
            totalFlex += isActive ? FLEX_ACTIVE : FLEX_INACTIVE;
        });

        // Calculate Pixels Per Flex Unit
        let pxPerFlex = availableSpace / totalFlex;

        // Constraint: Cap the size so cards don't get massive (e.g. 1 player mode)
        // Standard inactive card is 1 unit. It shouldn't exceed MAX_INACTIVE_WIDTH.
        const maxPxPerFlex = MAX_INACTIVE_WIDTH;
        pxPerFlex = Math.min(pxPerFlex, maxPxPerFlex);

        // Recalculate total used width to determine centering offset
        const totalContentWidth = (totalFlex * pxPerFlex) + totalGap;
        const startOffset = (width - totalContentWidth) / 2;

        const newPositions = {};
        let currentX = startOffset;

        playerIds.forEach(pid => {
            const isActive = pid === activeEntity;
            const cardWidth = pxPerFlex * (isActive ? FLEX_ACTIVE : FLEX_INACTIVE);
            
            newPositions[pid] = {
                x: currentX + (cardWidth / 2), // Center X for 3D
                left: currentX,                // Left for CSS
                width: cardWidth               // Width for CSS
            };
            
            currentX += cardWidth + GAP;
        });

        setLayoutState({
            positions: newPositions,
            uiScale,
            isTooSmall: false
        });
    };

    useEffect(() => {
        let animationFrameId;
        
        const onResize = () => {
            // Throttle via RequestAnimationFrame
            cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(calculateLayout);
        };

        window.addEventListener('resize', onResize);
        
        // Initial Calculation
        calculateLayout();

        return () => {
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return layoutState;
};