/* ============================================================
   VenueFlow — Lightweight Canvas Charts
   ============================================================ */

const Charts = (() => {

  const COLORS = [
    '#00D4FF', '#FFB800', '#A855F7', '#22C55E',
    '#EF4444', '#F97316', '#EC4899', '#6366F1',
  ];

  // --- Utility ---
  function setupCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    return { ctx, w: rect.width, h: rect.height };
  }

  // --- Line Chart ---
  function lineChart(canvas, data, options = {}) {
    const { ctx, w, h } = setupCanvas(canvas);
    const {
      labels = [],
      datasets = [],  // [{ label, data, color }]
      showGrid = true,
      showDots = true,
      smoothing = 0.3,
      yMin = null,
      yMax = null,
      showArea = true,
      title = '',
      yLabel = '',
    } = { ...data, ...options };

    const padding = { top: title ? 35 : 15, right: 15, bottom: 35, left: 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    // Title
    if (title) {
      ctx.font = '600 13px Inter, sans-serif';
      ctx.fillStyle = '#F1F5F9';
      ctx.textAlign = 'left';
      ctx.fillText(title, padding.left, 20);
    }

    // Compute y range
    let allValues = datasets.flatMap(d => d.data || []);
    const computedMin = yMin !== null ? yMin : Math.max(0, Math.min(...allValues) - 2);
    const computedMax = yMax !== null ? yMax : Math.max(...allValues) + 2;
    const yRange = computedMax - computedMin || 1;

    // Grid
    if (showGrid) {
      const gridLines = 5;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartH / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();

        // Y labels
        const val = computedMax - (yRange / gridLines) * i;
        ctx.font = '500 9px Inter, sans-serif';
        ctx.fillStyle = '#64748B';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(val) + (yLabel ? yLabel : ''), padding.left - 6, y + 3);
      }
    }

    // X labels
    if (labels.length > 0) {
      const step = Math.max(1, Math.floor(labels.length / 8));
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'center';
      labels.forEach((label, i) => {
        if (i % step === 0 || i === labels.length - 1) {
          const x = padding.left + (chartW / Math.max(1, labels.length - 1)) * i;
          ctx.fillText(label, x, h - padding.bottom + 16);
        }
      });
    }

    // Data lines
    datasets.forEach((dataset, di) => {
      const vals = dataset.data || [];
      if (vals.length < 2) return;
      const color = dataset.color || COLORS[di % COLORS.length];
      const points = vals.map((v, i) => ({
        x: padding.left + (chartW / Math.max(1, vals.length - 1)) * i,
        y: padding.top + chartH - ((v - computedMin) / yRange) * chartH,
      }));

      // Area fill
      if (showArea) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          const cpx1 = prev.x + (curr.x - prev.x) * smoothing;
          const cpx2 = curr.x - (curr.x - prev.x) * smoothing;
          ctx.bezierCurveTo(cpx1, prev.y, cpx2, curr.y, curr.x, curr.y);
        }
        ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
        ctx.lineTo(points[0].x, padding.top + chartH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        grad.addColorStop(0, color.replace(')', ', 0.2)').replace('rgb', 'rgba'));
        grad.addColorStop(1, color.replace(')', ', 0.01)').replace('rgb', 'rgba'));
        // Simple alpha approach
        ctx.fillStyle = `${color}15`;
        ctx.fill();
      }

      // Line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx1 = prev.x + (curr.x - prev.x) * smoothing;
        const cpx2 = curr.x - (curr.x - prev.x) * smoothing;
        ctx.bezierCurveTo(cpx1, prev.y, cpx2, curr.y, curr.x, curr.y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dots
      if (showDots && vals.length <= 20) {
        points.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#0a0e1a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }

      // Last value label
      const last = points[points.length - 1];
      ctx.font = '700 10px Inter, sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(vals[vals.length - 1] + (yLabel || ''), last.x + 6, last.y + 3);
    });
  }

  // --- Bar Chart ---
  function barChart(canvas, data, options = {}) {
    const { ctx, w, h } = setupCanvas(canvas);
    const {
      labels = [],
      values = [],
      colors = [],
      maxValue = null,
      title = '',
      horizontal = false,
    } = { ...data, ...options };

    const padding = { top: title ? 35 : 15, right: 15, bottom: 30, left: horizontal ? 90 : 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    if (title) {
      ctx.font = '600 13px Inter, sans-serif';
      ctx.fillStyle = '#F1F5F9';
      ctx.textAlign = 'left';
      ctx.fillText(title, padding.left, 20);
    }

    const max = maxValue || Math.max(...values, 1);

    if (horizontal) {
      const barH = Math.min(24, (chartH / values.length) * 0.7);
      const gap = (chartH / values.length);

      values.forEach((val, i) => {
        const barW = (val / max) * chartW;
        const y = padding.top + gap * i + (gap - barH) / 2;
        const color = colors[i] || COLORS[i % COLORS.length];

        // Bar
        const grad = ctx.createLinearGradient(padding.left, 0, padding.left + barW, 0);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '80');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(padding.left, y, barW, barH, [0, 4, 4, 0]);
        ctx.fill();

        // Label
        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.textAlign = 'right';
        ctx.fillText(labels[i] || '', padding.left - 8, y + barH / 2 + 3);

        // Value
        ctx.font = '700 10px Inter, sans-serif';
        ctx.fillStyle = '#F1F5F9';
        ctx.textAlign = 'left';
        ctx.fillText(val, padding.left + barW + 6, y + barH / 2 + 3);
      });
    } else {
      const barW = Math.min(32, (chartW / values.length) * 0.6);
      const gap = chartW / values.length;

      values.forEach((val, i) => {
        const barH2 = (val / max) * chartH;
        const x = padding.left + gap * i + (gap - barW) / 2;
        const y = padding.top + chartH - barH2;
        const color = colors[i] || COLORS[i % COLORS.length];

        const grad = ctx.createLinearGradient(0, y, 0, y + barH2);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '40');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH2, [4, 4, 0, 0]);
        ctx.fill();

        // Label
        ctx.font = '500 9px Inter, sans-serif';
        ctx.fillStyle = '#64748B';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i] || '', x + barW / 2, h - padding.bottom + 14);

        // Value
        ctx.font = '700 9px Inter, sans-serif';
        ctx.fillStyle = '#F1F5F9';
        ctx.fillText(val, x + barW / 2, y - 6);
      });
    }
  }

  // --- Donut Chart ---
  function donutChart(canvas, data, options = {}) {
    const { ctx, w, h } = setupCanvas(canvas);
    const {
      segments = [],  // [{ label, value, color }]
      centerLabel = '',
      centerValue = '',
      title = '',
    } = { ...data, ...options };

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = (title ? h * 0.5 + 12 : h / 2);
    const radius = Math.min(cx, cy) * 0.7;
    const thickness = radius * 0.3;

    if (title) {
      ctx.font = '600 13px Inter, sans-serif';
      ctx.fillStyle = '#F1F5F9';
      ctx.textAlign = 'center';
      ctx.fillText(title, cx, 20);
    }

    const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    let angle = -Math.PI / 2;

    segments.forEach((seg, i) => {
      const sliceAngle = (seg.value / total) * Math.PI * 2;
      const color = seg.color || COLORS[i % COLORS.length];

      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle, angle + sliceAngle);
      ctx.arc(cx, cy, radius - thickness, angle + sliceAngle, angle, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      angle += sliceAngle;
    });

    // Center text
    if (centerValue) {
      ctx.font = '800 22px Outfit, sans-serif';
      ctx.fillStyle = '#F1F5F9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(centerValue, cx, cy - 6);
    }
    if (centerLabel) {
      ctx.font = '500 10px Inter, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(centerLabel, cx, cy + 14);
    }

    // Legend
    const legendY = cy + radius + 15;
    const legendItemW = Math.min(130, w / Math.min(segments.length, 3));
    const cols = Math.min(segments.length, 3);
    const startX = cx - (cols * legendItemW) / 2;

    segments.forEach((seg, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const lx = startX + col * legendItemW + 8;
      const ly = legendY + row * 16;

      if (ly < h - 5) {
        ctx.fillStyle = seg.color || COLORS[i % COLORS.length];
        ctx.beginPath();
        ctx.arc(lx, ly, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '500 9px Inter, sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.textAlign = 'left';
        ctx.fillText(`${seg.label} (${seg.value})`, lx + 10, ly + 3);
      }
    });
  }

  // --- Gauge Chart ---
  function gaugeChart(canvas, data, options = {}) {
    const { ctx, w, h } = setupCanvas(canvas);
    const {
      value = 0,
      maxVal = 100,
      label = '',
      color = '#00D4FF',
      suffix = '%',
    } = { ...data, ...options };

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h * 0.6;
    const radius = Math.min(cx * 0.85, cy * 0.85);
    const thickness = radius * 0.22;
    const startAngle = Math.PI * 0.8;
    const endAngle = Math.PI * 2.2;
    const sweepAngle = endAngle - startAngle;
    const fillAngle = startAngle + (value / maxVal) * sweepAngle;

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, fillAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value text
    ctx.font = '800 28px Outfit, sans-serif';
    ctx.fillStyle = '#F1F5F9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(value)}${suffix}`, cx, cy - 5);

    if (label) {
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(label, cx, cy + 20);
    }
  }

  return { lineChart, barChart, donutChart, gaugeChart };
})();
