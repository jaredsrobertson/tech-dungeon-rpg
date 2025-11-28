// src/engine/renderer/layers/EffectLayer.js
import { DIALOGUE_LENGTH } from '../../../game/constants';

export const drawSpeechBubble = (ctx, x, y, text) => {
    const padding = 10;
    const fontSize = 14;
    const font = `${fontSize}px monospace`;
    
    ctx.font = font;
    
    // Predetermined Width Calculation
    // Estimate char width for 'monospace' (approx via '0')
    const charWidth = ctx.measureText('0').width;
    const boxWidth = (charWidth * DIALOGUE_LENGTH) + (padding * 2);
    
    const boxHeight = fontSize + padding * 2 + 10;

    const boxX = x - boxWidth / 2;
    const boxY = y - boxHeight;

    ctx.save();
    ctx.fillStyle = '#050505';
    ctx.strokeStyle = '#cc0044';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxWidth, boxHeight);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 5, boxY + boxHeight);
    ctx.lineTo(x + 5, boxY + boxHeight);
    ctx.lineTo(x, boxY + boxHeight + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, boxY + boxHeight / 2);
    
    // Red Typing Indicator (Cursor)
    // We calculate position based on the currently displayed text
    const currentTextWidth = ctx.measureText(text).width;
    
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#cc0044';
        // Position cursor at the end of the current centered text
        const cx = x + (currentTextWidth / 2) + 5;
        ctx.fillRect(cx, boxY + padding + 2, 8, fontSize);
    }

    ctx.restore();
};

export const drawFloatingText = (ctx, texts) => {
  texts.forEach(ft => {
    ft.update(); 
    ctx.save(); ctx.globalAlpha = ft.life; 
    const scale = 1 + Math.sin((1 - ft.life) * 15) * 0.3; 
    ctx.font = `bold ${60 * scale}px monospace`; ctx.textAlign = "center"; 
    ctx.shadowColor = 'black'; ctx.shadowBlur = 10; ctx.lineWidth = 5; ctx.strokeStyle = '#000';
    ctx.strokeText(ft.text, ft.x, ft.y); ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y); 
    ctx.restore();
  });
};