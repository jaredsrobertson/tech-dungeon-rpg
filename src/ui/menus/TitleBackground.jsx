import React, { useEffect, useRef } from 'react';
import { NUM_PARTICLES, Particle } from '../../game/constants';
import { drawBackground, drawStars } from '../../engine/renderer/layers/BackgroundLayer';
import { drawGrid } from '../../engine/renderer/layers/EnvironmentLayer';

export const TitleBackground = () => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const stateRef = useRef({
        time: 0,
        particles: [],
        gradientCache: []
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        // TYPO FIXED HERE: was "constctx"
        const ctx = canvas.getContext('2d', { alpha: false });

        const resize = () => {
            // High-DPI support
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            
            // Reset transforms
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
            
            stateRef.current.gradientCache = [];
        };
        window.addEventListener('resize', resize);
        resize();

        const loop = () => {
            const dt = 0.016; // Fixed timestep for smooth title feel
            const state = stateRef.current;
            state.time += dt;

            // Use logical CSS pixels for drawing
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Camera Drift (Slightly faster/more disorienting for title)
            const driftX = Math.sin(state.time * 0.2) * width * 0.05;
            const driftY = Math.cos(state.time * 0.15) * height * 0.05;
            const cameraX = (width / 2) + driftX;
            const cameraY = (height * 0.35) + driftY;

            // Initialize particles if needed
            if (state.particles.length === 0) {
                state.particles = Array.from({ length: NUM_PARTICLES }, () => new Particle(width, height));
            }

            // Draw Layers
            drawBackground(ctx, width, height);
            
            // Warp factor 2.0 for a faster feeling tunnel
            drawStars(ctx, state.particles, width, height, 2.0, cameraX, cameraY);
            
            // Draw Grid
            drawGrid(ctx, width, height, 3000, state.gradientCache, state.time, cameraX, cameraY);

            // Add a Vignette for that "Dark/Threatening" feel
            // Note: HSL gradient wasn't standard, switching to radial
            const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.3, width / 2, height / 2, width * 0.8);
            vignette.addColorStop(0, 'rgba(0,0,0,0)');
            vignette.addColorStop(1, 'rgba(0,0,0,0.8)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, width, height);

            animationRef.current = requestAnimationFrame(loop);
        };

        animationRef.current = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} 
        />
    );
};