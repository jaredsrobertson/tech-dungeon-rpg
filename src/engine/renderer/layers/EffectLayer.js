import { DIALOGUE_LENGTH } from '../../../game/constants';

export const drawSpeechBubble = (ctx, x, y, text) => {
    const padding = 10;
    const fontSize = 14;
    const font = `${fontSize}px monospace`;
    
    ctx.font = font;
    
    const charWidth = ctx.measureText('0').width;
    const boxWidth = (charWidth * DIALOGUE_LENGTH) + (padding * 2);
    const boxHeight = fontSize + padding * 2 + 10;

    const boxX = x - boxWidth / 2;
    const boxY = y - boxHeight;

    ctx.save();
    ctx.fillStyle = '#050505';
    ctx.strokeStyle = '#cc0044';
    ctx.lineWidth = 1;
    // PERFORMANCE FIX: Removed shadowBlur
    
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
    
    const currentTextWidth = ctx.measureText(text).width;
    
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#cc0044';
        const cx = x + (currentTextWidth / 2) + 5;
        ctx.fillRect(cx, boxY + padding + 2, 8, fontSize);
    }

    ctx.restore();
};

export const drawFloatingText = (ctx, texts) => {
  texts.forEach(ft => {
    // Note: Update logic is handled in RenderLoop.js via pool, not here
    
    ctx.save(); 
    ctx.globalAlpha = ft.life; 
    
    const scale = 1 + Math.sin((1 - ft.life) * 15) * 0.3; 
    
    // PERFORMANCE FIX: Round to integer to save Font Cache
    const fontSize = Math.floor(60 * scale);
    ctx.font = `bold ${fontSize}px monospace`; 
    
    ctx.textAlign = "center"; 
    
    // PERFORMANCE FIX: Retro shadow instead of strokeText
    ctx.fillStyle = '#000'; 
    ctx.fillText(ft.text, ft.x + 2, ft.y + 2); // Simple drop shadow
    
    ctx.fillStyle = ft.color; 
    ctx.fillText(ft.text, ft.x, ft.y); 
    ctx.restore();
  });
};

export const drawFPS = (ctx, perf, width, height) => {
    ctx.save();
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 140, 95);
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 140, 95);

    ctx.fillStyle = '#00ff41'; 
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const x = 10;
    let y = 10;
    const lh = 15;

    const fpsColor = perf.avgFps < 30 ? '#ff0000' : (perf.avgFps < 55 ? '#ffff00' : '#00ff41');
    ctx.fillStyle = fpsColor;
    ctx.fillText(`AVG FPS: ${perf.avgFps}`, x, y);
    y += lh;
    
    ctx.fillStyle = perf.minFps < 20 ? '#ff0000' : '#888';
    ctx.fillText(`1% LOW:  ${perf.minFps}`, x, y);
    y += lh + 5;

    ctx.fillStyle = '#0088aa';
    ctx.fillText(`PARTICLES: ${perf.particleCount}`, x, y);
    y += lh;
    
    ctx.fillStyle = perf.textCount > 10 ? '#ffff00' : '#0088aa';
    ctx.fillText(`FLT TEXT : ${perf.textCount}`, x, y);
    y += lh;

    ctx.restore();
};