const fs = require('fs');

const cssPath = 'c:/Users/Chetan/Documents/arise2/client/src/index.css';
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Replace the entire :root block with the new cinematic cyan/blue theme
const rootRegex = /:root\s*\{[\s\S]*?--radius-xl:\s*16px;\s*\}/;
const newRoot = `:root {
  /* Surface hierarchy - Deep cinematic blues */
  --bg-base:     #010308;
  --bg-page:     #020611;
  --bg-card:     rgba(4, 14, 28, 0.6);
  --bg-elevated: rgba(6, 24, 48, 0.75);
  --bg-overlay:  rgba(2, 8, 20, 0.85);

  /* Borders - Glowing cyan */
  --border-default: rgba(0, 229, 255, 0.15);
  --border-hover:   rgba(0, 229, 255, 0.35);
  --border-active:  rgba(0, 229, 255, 0.8);
  --border-subtle:  rgba(0, 229, 255, 0.05);

  /* Text */
  --text-primary:   #e0f7fa;
  --text-secondary: #80cbe3;
  --text-muted:     #4a8296;
  --text-dimmed:    #2a5061;

  /* Accents - Shifted from Amber to Cyan/Blue */
  --amber:      #00e5ff; /* Reusing the amber variable name but injecting cyan */
  --amber-dim:  rgba(0, 229, 255, 0.15);
  --amber-glow: rgba(0, 229, 255, 0.4);
  
  --cyan:       #00e5ff;
  --cyan-dim:   rgba(0, 229, 255, 0.15);
  
  --violet:     #0077ff;
  --violet-dim: rgba(0, 119, 255, 0.15);
  
  --red:        #ff0055;
  --red-dim:    rgba(255, 0, 85, 0.15);
  
  --green:      #00ffaa;
  --green-dim:  rgba(0, 255, 170, 0.15);

  /* Cinematic Shadows & Glows */
  --shadow-card:     0 4px 24px rgba(0, 119, 255, 0.15), inset 0 0 0 1px rgba(0, 229, 255, 0.2), inset 0 0 20px rgba(0, 229, 255, 0.05);
  --shadow-elevated: 0 8px 32px rgba(0, 119, 255, 0.25), inset 0 0 0 1px rgba(0, 229, 255, 0.3), inset 0 0 30px rgba(0, 229, 255, 0.1);
  --shadow-hover:    0 12px 40px rgba(0, 229, 255, 0.3), inset 0 0 0 1px rgba(0, 229, 255, 0.5), inset 0 0 40px rgba(0, 229, 255, 0.15);
  --blur-card:       backdrop-filter: blur(24px) saturate(120%);

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-kn:   'Noto Sans Kannada', sans-serif;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
}`;
css = css.replace(rootRegex, newRoot);

// 2. Body background
const bodyRegex = /body\s*\{[\s\S]*?-moz-osx-font-smoothing: grayscale;\s*\}/;
const newBody = `body {
  background: var(--bg-base);
  background-image: 
    radial-gradient(ellipse at 50% -20%, rgba(0, 119, 255, 0.15), transparent 50%),
    radial-gradient(ellipse at 50% 120%, rgba(0, 229, 255, 0.15), transparent 50%);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;
css = css.replace(bodyRegex, newBody);

// 3. Card styles
const cardRegex = /\.arise-card\s*\{[\s\S]*?border-color 0\.2s ease;\s*\}/;
const newCard = `.arise-card {
  background: var(--bg-card);
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(24px) saturate(120%);
  -webkit-backdrop-filter: blur(24px) saturate(120%);
  transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
  position: relative;
  overflow: hidden;
}`;
css = css.replace(cardRegex, newCard);

// 4. Update the Spatial Grid to match the Cyan/Blue vibe
const gridRegex = /\.arise-3d-grid\s*\{[\s\S]*?transparent 100%\);\s*\}/;
if (gridRegex.test(css)) {
  const newGrid = `.arise-3d-grid {
  position: absolute;
  width: 200vw;
  height: 200vh;
  left: -50vw;
  top: 0vh;
  background-image: 
    linear-gradient(rgba(0, 229, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 229, 255, 0.08) 1px, transparent 1px);
  background-size: 80px 80px;
  transform: rotateX(70deg) translateY(0);
  animation: gridMove 15s linear infinite;
  mask-image: linear-gradient(to bottom, transparent 0%, black 40%, black 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 40%, black 60%, transparent 100%);
}`;
  css = css.replace(gridRegex, newGrid);
}

// 5. Append the Cinematic Orb and glowing border utility classes if not exists
if (!css.includes('.cinematic-orb')) {
  css += `
/* ── CINEMATIC ORB ─────────────────────── */
.cinematic-orb-container {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cinematic-orb {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #001133, #0055ff, #00e5ff, #001133, #0055ff, #00e5ff, #001133);
  filter: blur(1px) drop-shadow(0 0 15px rgba(0, 229, 255, 0.6));
  animation: orbSpin 4s linear infinite;
  position: absolute;
  inset: 0;
}

.cinematic-orb-inner {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #00e5ff, #0033aa 60%, #000 90%);
  box-shadow: inset 0 0 10px rgba(255,255,255,0.5);
  z-index: 1;
}

.cinematic-orb-highlight {
  position: absolute;
  top: 10%;
  left: 20%;
  width: 30%;
  height: 20%;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  filter: blur(2px);
  transform: rotate(-45deg);
  z-index: 2;
}

@keyframes orbSpin {
  100% { transform: rotate(360deg); }
}

/* ── NEUMORPHIC GLOW PANELS ────────────── */
.glass-panel-cyan {
  background: rgba(4, 18, 38, 0.4);
  border: 1px solid rgba(0, 229, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 119, 255, 0.2), inset 0 0 20px rgba(0, 229, 255, 0.05);
  border-radius: 24px;
  backdrop-filter: blur(20px);
  position: relative;
}
.glass-panel-cyan::before {
  content: '';
  position: absolute;
  top: -1px; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.8), transparent);
}
.glass-panel-cyan::after {
  content: '';
  position: absolute;
  bottom: -1px; left: 20%; right: 20%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 119, 255, 0.6), transparent);
}
`;
}

// Write the updated CSS
fs.writeFileSync(cssPath, css, 'utf8');
console.log('Cinematic Theme applied to index.css!');
