/* ============================================================
   VenueFlow — Canvas-based Stadium Heatmap Renderer
   ============================================================ */

const HeatmapRenderer = (() => {

  // --- Color stops for density gradient ---
  const HEAT_COLORS = [
    { stop: 0.0, r: 34, g: 197, b: 94 },   // green
    { stop: 0.35, r: 234, g: 179, b: 8 },   // yellow
    { stop: 0.65, r: 249, g: 115, b: 22 },  // orange
    { stop: 1.0, r: 239, g: 68, b: 68 },    // red
  ];

  function lerpColor(value) {
    const v = Math.max(0, Math.min(1, value));
    let lower = HEAT_COLORS[0], upper = HEAT_COLORS[HEAT_COLORS.length - 1];
    for (let i = 0; i < HEAT_COLORS.length - 1; i++) {
      if (v >= HEAT_COLORS[i].stop && v <= HEAT_COLORS[i + 1].stop) {
        lower = HEAT_COLORS[i];
        upper = HEAT_COLORS[i + 1];
        break;
      }
    }
    const range = upper.stop - lower.stop || 1;
    const t = (v - lower.stop) / range;
    return {
      r: Math.round(lower.r + (upper.r - lower.r) * t),
      g: Math.round(lower.g + (upper.g - lower.g) * t),
      b: Math.round(lower.b + (upper.b - lower.b) * t),
    };
  }

  // --- Draw Stadium Outline ---
  function drawStadium(ctx, w, h, padding) {
    const sx = padding;
    const sy = padding;
    const sw = w - padding * 2;
    const sh = h - padding * 2;
    const rx = sw * 0.22;
    const ry = sh * 0.22;

    ctx.beginPath();
    // Draw rounded rectangle (stadium shape)
    ctx.moveTo(sx + rx, sy);
    ctx.lineTo(sx + sw - rx, sy);
    ctx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + ry);
    ctx.lineTo(sx + sw, sy + sh - ry);
    ctx.quadraticCurveTo(sx + sw, sy + sh, sx + sw - rx, sy + sh);
    ctx.lineTo(sx + rx, sy + sh);
    ctx.quadraticCurveTo(sx, sy + sh, sx, sy + sh - ry);
    ctx.lineTo(sx, sy + ry);
    ctx.quadraticCurveTo(sx, sy, sx + rx, sy);
    ctx.closePath();
    return { sx, sy, sw, sh, rx, ry };
  }

  // --- Draw football pitch ---
  function drawPitch(ctx, cx, cy, pw, ph) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;

    // Pitch outline
    ctx.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph);

    // Center line
    ctx.beginPath();
    ctx.moveTo(cx - pw / 2, cy);
    ctx.lineTo(cx + pw / 2, cy);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, ph * 0.14, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    // Penalty areas
    const paW = pw * 0.4;
    const paH = ph * 0.15;
    ctx.strokeRect(cx - paW / 2, cy - ph / 2, paW, paH);
    ctx.strokeRect(cx - paW / 2, cy + ph / 2 - paH, paW, paH);

    // Goal areas
    const gaW = pw * 0.18;
    const gaH = ph * 0.06;
    ctx.strokeRect(cx - gaW / 2, cy - ph / 2, gaW, gaH);
    ctx.strokeRect(cx - gaW / 2, cy + ph / 2 - gaH, gaW, gaH);
  }

  // --- Main render function ---
  function render(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const {
      showLabels = true,
      showPitch = true,
      showUserPosition = false,
      showFlowParticles = false,
      interactive = false,
      selectedZone = null,
      compact = false,
    } = options;

    const padding = compact ? 15 : 30;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Stadium body
    const stadium = drawStadium(ctx, w, h, padding);
    ctx.fillStyle = 'rgba(10, 14, 26, 0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Football pitch
    if (showPitch) {
      const cx = w / 2;
      const cy = h / 2;
      const pw = stadium.sw * 0.48;
      const ph = stadium.sh * 0.55;

      // Pitch fill
      ctx.save();
      ctx.fillStyle = 'rgba(22, 101, 52, 0.2)';
      ctx.fillRect(cx - pw / 2, cy - ph / 2, pw, ph);
      ctx.restore();

      drawPitch(ctx, cx, cy, pw, ph);
    }

    // Heat zones
    if (data && data.zones) {
      data.zones.forEach(zone => {
        if (zone.type === 'vip') return; // don't heatmap VIP
        const zx = zone.x * w;
        const zy = zone.y * h;
        const zw = zone.w * w;
        const zh = zone.h * h;

        const color = lerpColor(zone.occupancy);
        const alpha = 0.15 + zone.occupancy * 0.45;

        // Draw heatmap blob with radial gradient
        const grad = ctx.createRadialGradient(zx, zy, 0, zx, zy, Math.max(zw, zh) * 0.8);
        grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
        grad.addColorStop(0.6, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.4})`);
        grad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(zx, zy, zw * 0.9, zh * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Selected zone highlight
        if (selectedZone === zone.id) {
          ctx.strokeStyle = 'rgba(0, 212, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.ellipse(zx, zy, zw * 0.7, zh * 0.7, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Zone labels — only for seating and concourse types, skip gates
        if (showLabels && !compact && (zone.type === 'seating' || zone.type === 'concourse')) {
          const fontSize = Math.max(9, Math.min(12, w * 0.018));
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const pct = `${Math.round(zone.occupancy * 100)}%`;
          // Abbreviate concourse names to avoid overlap
          const labelText = zone.type === 'concourse'
            ? zone.name.replace(' Concourse', ' Conc.')
            : zone.name;

          ctx.font = `600 ${fontSize}px Inter, sans-serif`;
          const tm = ctx.measureText(labelText);
          const lw = Math.max(tm.width + 12, 50);

          ctx.fillStyle = 'rgba(10, 14, 26, 0.82)';
          ctx.beginPath();
          ctx.roundRect(zx - lw / 2, zy - fontSize - 4, lw, fontSize * 2 + 8, 4);
          ctx.fill();

          ctx.fillStyle = '#F1F5F9';
          ctx.fillText(labelText, zx, zy - 3);
          
          ctx.font = `700 ${fontSize - 1}px Inter, sans-serif`;
          const pctColor = lerpColor(zone.occupancy);
          ctx.fillStyle = `rgb(${pctColor.r}, ${pctColor.g}, ${pctColor.b})`;
          ctx.fillText(pct, zx, zy + fontSize - 1);
        }
      });
    }

    // Concession and restroom markers
    if (data && !compact) {
      const allPOI = [...(data.concessions || []), ...(data.restrooms || [])];
      allPOI.forEach(poi => {
        const px = poi.x * w;
        const py = poi.y * h;
        const fontSize = Math.max(11, Math.min(16, w * 0.022));

        ctx.font = `${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(poi.icon, px, py);
      });
    }

    // Gate markers
    if (data && data.zones) {
      data.zones.filter(z => z.type === 'gate').forEach(gate => {
        const gx = gate.x * w;
        const gy = gate.y * h;
        const fontSize = compact ? 8 : 10;

        ctx.font = `700 ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Gate icon
        const label = gate.name.replace(/Gate (\w).*/, '$1');
        const size = compact ? 14 : 20;
        ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(gx, gy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#00D4FF';
        ctx.fillText(label, gx, gy);
      });
    }

    // User position
    if (showUserPosition && data && data.userPosition) {
      const ux = data.userPosition.x * w;
      const uy = data.userPosition.y * h;
      const now = Date.now() / 1000;
      const pulse = Math.sin(now * 3) * 0.3 + 0.7;

      // Pulse ring
      ctx.beginPath();
      ctx.arc(ux, uy, 14 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 212, 255, ${0.15 * pulse})`;
      ctx.fill();

      // Dot
      ctx.beginPath();
      ctx.arc(ux, uy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00D4FF';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      if (!compact) {
        ctx.font = '600 10px Inter, sans-serif';
        ctx.fillStyle = '#00D4FF';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', ux, uy - 14);
      }
    }

    // Flow particles (dashboard mode)
    if (showFlowParticles && data) {
      drawFlowParticles(ctx, w, h, data);
    }

    // Legend
    if (!compact) {
      drawLegend(ctx, w, h);
    }
  }

  // --- Flow particles ---
  let particles = [];
  function drawFlowParticles(ctx, w, h, data) {
    if (particles.length < 40) {
      // Create particles
      for (let i = particles.length; i < 40; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          life: Math.random(),
          speed: 0.5 + Math.random() * 1,
        });
      }
    }

    particles.forEach(p => {
      p.x += p.vx * p.speed;
      p.y += p.vy * p.speed;
      p.life -= 0.005;

      if (p.x < 0 || p.x > w || p.y < 0 || p.y > h || p.life <= 0) {
        // Reset particle
        p.x = w * 0.5 + (Math.random() - 0.5) * w * 0.6;
        p.y = h * 0.5 + (Math.random() - 0.5) * h * 0.6;
        p.vx = (Math.random() - 0.5) * 1.5;
        p.vy = (Math.random() - 0.5) * 1.5;
        p.life = 0.8 + Math.random() * 0.2;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 212, 255, ${p.life * 0.4})`;
      ctx.fill();
    });
  }

  // --- Legend ---
  function drawLegend(ctx, w, h) {
    const lx = w - 120;
    const ly = h - 35;
    const lw = 100;
    const lh = 10;

    ctx.fillStyle = 'rgba(10, 14, 26, 0.8)';
    ctx.beginPath();
    ctx.roundRect(lx - 10, ly - 18, lw + 20, lh + 32, 6);
    ctx.fill();

    ctx.font = '500 9px Inter, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.fillText('Crowd Density', lx + lw / 2, ly - 6);

    // Gradient bar
    const grad = ctx.createLinearGradient(lx, 0, lx + lw, 0);
    grad.addColorStop(0, 'rgb(34, 197, 94)');
    grad.addColorStop(0.35, 'rgb(234, 179, 8)');
    grad.addColorStop(0.65, 'rgb(249, 115, 22)');
    grad.addColorStop(1, 'rgb(239, 68, 68)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(lx, ly, lw, lh, 3);
    ctx.fill();

    ctx.font = '500 8px Inter, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'left';
    ctx.fillText('Low', lx, ly + lh + 10);
    ctx.textAlign = 'right';
    ctx.fillText('High', lx + lw, ly + lh + 10);
  }

  // --- Hit test for interactive zones ---
  function hitTest(canvas, mouseX, mouseY, zones) {
    const rect = canvas.getBoundingClientRect();
    const x = mouseX - rect.left;
    const y = mouseY - rect.top;
    const w = rect.width;
    const h = rect.height;

    for (const zone of zones) {
      const zx = zone.x * w;
      const zy = zone.y * h;
      const zw = zone.w * w * 0.7;
      const zh = zone.h * h * 0.7;
      const dx = (x - zx) / zw;
      const dy = (y - zy) / zh;
      if (dx * dx + dy * dy <= 1) {
        return zone;
      }
    }
    return null;
  }

  // =====================================================
  //  Wayfinding Route Rendering
  // =====================================================

  function renderRoute(canvas, route, navGraph) {
    if (!canvas || !route || !route.path || route.path.length < 2) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const nodes = navGraph.nodes;

    // Draw route segments
    for (let i = 0; i < route.path.length - 1; i++) {
      const fromNode = nodes[route.path[i]];
      const toNode = nodes[route.path[i + 1]];
      if (!fromNode || !toNode) continue;

      const fx = Math.max(0, Math.min(1, fromNode.x)) * w;
      const fy = Math.max(0, Math.min(1, fromNode.y)) * h;
      const tx = Math.max(0, Math.min(1, toNode.x)) * w;
      const ty = Math.max(0, Math.min(1, toNode.y)) * h;

      const segment = route.segments ? route.segments[i] : null;
      const crowdColor = segment ?
        (segment.crowdColor === 'green' ? '#22C55E' :
         segment.crowdColor === 'yellow' ? '#EAB308' : '#EF4444') : '#00D4FF';

      // Glow effect
      ctx.save();
      ctx.shadowColor = crowdColor;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = crowdColor;
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 4]);
      ctx.lineDashOffset = -(Date.now() / 50) % 12;

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.restore();

      // Arrow at midpoint
      const mx = (fx + tx) / 2;
      const my = (fy + ty) / 2;
      const angle = Math.atan2(ty - fy, tx - fx);

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(angle);
      ctx.fillStyle = crowdColor;
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Draw node markers along route
    route.path.forEach((nodeId, i) => {
      const node = nodes[nodeId];
      if (!node) return;
      const nx = Math.max(0, Math.min(1, node.x)) * w;
      const ny = Math.max(0, Math.min(1, node.y)) * h;

      const isStart = i === 0;
      const isEnd = i === route.path.length - 1;
      const size = (isStart || isEnd) ? 18 : 10;
      const color = isStart ? '#00D4FF' : isEnd ? '#22C55E' : 'rgba(255,255,255,0.6)';

      // Pulse for start and end
      if (isStart || isEnd) {
        const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(nx, ny, size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `${color}30`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(nx, ny, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#0a0e1a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      if (isStart || isEnd) {
        ctx.font = '600 10px Inter, sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(isStart ? 'START' : 'END', nx, ny - size);
      }
    });
  }

  // =====================================================
  //  AR Safety Overlay Rendering
  // =====================================================

  function renderAROverlay(canvas, arData) {
    if (!canvas || !arData) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    // Simulated camera background — dark gradient with scan lines
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0d1117');
    bgGrad.addColorStop(0.5, '#161b22');
    bgGrad.addColorStop(1, '#0d1117');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Scan lines
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 3) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Grid overlay
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.06)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Corner brackets (AR viewfinder)
    const bLen = 30;
    const bPad = 15;
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
    ctx.lineWidth = 2;
    // Top-left
    ctx.beginPath(); ctx.moveTo(bPad, bPad + bLen); ctx.lineTo(bPad, bPad); ctx.lineTo(bPad + bLen, bPad); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(w - bPad - bLen, bPad); ctx.lineTo(w - bPad, bPad); ctx.lineTo(w - bPad, bPad + bLen); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(bPad, h - bPad - bLen); ctx.lineTo(bPad, h - bPad); ctx.lineTo(bPad + bLen, h - bPad); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(w - bPad - bLen, h - bPad); ctx.lineTo(w - bPad, h - bPad); ctx.lineTo(w - bPad, h - bPad - bLen); ctx.stroke();

    // Traffic zones
    if (arData.trafficZones) {
      arData.trafficZones.forEach(tz => {
        const tx = tz.x * w;
        const ty = tz.y * h;
        const tr = tz.radius * Math.min(w, h);
        const color = tz.level === 'high' ? '239, 68, 68' :
                      tz.level === 'moderate' ? '234, 179, 8' : '34, 197, 94';

        // Traffic zone circle
        const grad = ctx.createRadialGradient(tx, ty, 0, tx, ty, tr);
        grad.addColorStop(0, `rgba(${color}, 0.3)`);
        grad.addColorStop(0.7, `rgba(${color}, 0.1)`);
        grad.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(tx, ty, tr, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing border
        const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.5;
        ctx.strokeStyle = `rgba(${color}, ${pulse})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
        const labelW = 110;
        ctx.beginPath();
        ctx.roundRect(tx - labelW / 2, ty - 18, labelW, 36, 6);
        ctx.fill();

        ctx.font = '600 10px Inter, sans-serif';
        ctx.fillStyle = `rgb(${color})`;
        ctx.textAlign = 'center';
        ctx.fillText(tz.area, tx, ty - 4);
        ctx.font = '500 9px Inter, sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(tz.tips, tx, ty + 10);
      });
    }

    // Friend markers
    if (arData.friends) {
      arData.friends.forEach(f => {
        const fx = f.x * w;
        const fy = f.y * h;

        // Ping circle
        const pingPhase = (Date.now() / 1000 + f.x * 10) % 2;
        if (pingPhase < 1) {
          ctx.beginPath();
          ctx.arc(fx, fy, 20 * pingPhase, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 212, 255, ${1 - pingPhase})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Avatar dot
        ctx.beginPath();
        ctx.arc(fx, fy, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(fx, fy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#00D4FF';
        ctx.fill();

        // Name tag
        ctx.font = '700 10px Inter, sans-serif';
        const nameWidth = ctx.measureText(f.name).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(fx - nameWidth / 2 - 8, fy - 28, nameWidth + 16, 18, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#00D4FF';
        ctx.textAlign = 'center';
        ctx.fillText(`${f.emoji} ${f.name}`, fx, fy - 16);

        // Distance
        ctx.font = '500 8px Inter, sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(`${f.distance}m away`, fx, fy + 22);
      });
    }

    // HUD — top status bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, 32);
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillStyle = '#00D4FF';
    ctx.textAlign = 'left';
    ctx.fillText('📡 AR SAFETY VIEW', 12, 20);
    ctx.textAlign = 'right';
    const now = new Date();
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`LIVE · ${now.toLocaleTimeString()}`, w - 12, 20);

    // Scanning animation line
    const scanY = (Date.now() / 20) % h;
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(w, scanY);
    ctx.stroke();
  }

  return { render, hitTest, lerpColor, renderRoute, renderAROverlay };
})();
