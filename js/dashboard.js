/* ============================================================
   VenueFlow — Operations Dashboard Controller
   ============================================================ */

const DashboardView = (() => {
  let container = null;
  let initialized = false;

  function init(el) {
    container = el;
    initialized = false;
    render();
  }

  function render() {
    if (!container) return;
    const data = VenueData.getSnapshot();

    container.innerHTML = `
      <div class="dashboard-view" id="dash-root">
        <!-- Header -->
        <div id="dash-header-area">${renderHeader(data)}</div>

        <!-- KPI Row -->
        <div id="dash-kpi-area">${renderKPIs(data)}</div>

        <!-- Main Grid -->
        <div class="dash-grid">
          <!-- Heatmap -->
          <div class="dash-panel">
            <div class="dash-panel__header">
              <div class="dash-panel__title">
                🗺️ Live Crowd Heatmap
                <span class="badge badge--blue"><span class="live-dot" style="width:6px;height:6px;margin-right:4px"></span> Real-time</span>
              </div>
            </div>
            <div class="dash-panel__body dash-panel__body--flush">
              <canvas class="dash-heatmap-canvas" id="dash-heatmap"></canvas>
            </div>
          </div>

          <!-- Zone Monitor -->
          <div class="dash-panel">
            <div class="dash-panel__header">
              <div class="dash-panel__title">📊 Zone Monitor</div>
              <span class="badge badge--amber" id="dash-zone-alert-count">${data.zones.filter(z => z.occupancy > 0.85).length} alerts</span>
            </div>
            <div class="dash-panel__body dash-panel__body--flush">
              <div class="zone-grid" id="dash-zone-grid">
                ${data.zones.filter(z => z.type === 'seating' || z.type === 'concourse').map(z => renderZoneCard(z)).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Second Row -->
        <div class="dash-grid">
          <!-- Wait Time Chart -->
          <div class="dash-panel">
            <div class="dash-panel__header">
              <div class="dash-panel__title">⏱️ Wait Time Trends</div>
              <span class="badge badge--green">Last 30 min</span>
            </div>
            <div class="dash-panel__body">
              <canvas class="dash-wait-canvas" id="dash-wait-chart"></canvas>
            </div>
          </div>

          <!-- Incidents -->
          <div class="dash-panel">
            <div class="dash-panel__header">
              <div class="dash-panel__title">🚨 Incidents & Alerts</div>
              <span class="badge badge--${data.incidents.filter(i => i.severity === 'critical').length > 0 ? 'red' : 'amber'}" id="dash-incident-count">
                ${data.incidents.filter(i => i.status === 'active').length} active
              </span>
            </div>
            <div class="dash-panel__body dash-panel__body--flush">
              <div class="incident-list" id="dash-incident-list">
                ${data.incidents.map(inc => renderIncidentItem(inc)).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Third Row -->
        <div class="dash-bottom-grid">
          <!-- Concession Wait Times -->
          <div class="dash-panel">
            <div class="dash-panel__header">
              <div class="dash-panel__title">🍔 Concession Waits</div>
            </div>
            <div class="dash-panel__body">
              <canvas class="chart-canvas" id="dash-bar-chart"></canvas>
            </div>
          </div>

          <!-- Capacity Donut -->
          <div class="dash-panel">
            <div class="dash-panel__header">
              <div class="dash-panel__title">🏟️ Capacity Distribution</div>
            </div>
            <div class="dash-panel__body">
              <canvas class="donut-canvas" id="dash-donut-chart"></canvas>
            </div>
          </div>

          <!-- Staff & Satisfaction -->
          <div class="dash-panel">
            <div class="dash-panel__header">
              <div class="dash-panel__title">👥 Staff & Satisfaction</div>
            </div>
            <div class="dash-panel__body">
              <canvas class="gauge-canvas" id="dash-gauge-chart"></canvas>
              <div style="margin-top: 12px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                  <span style="font-size:var(--text-sm);color:var(--color-text-secondary)">Staff Deployed</span>
                  <span style="font-size:var(--text-sm);font-weight:700;color:var(--color-text-primary)" id="dash-staff-count">${data.staff.deployed} / ${data.staff.total}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-bar__fill" id="dash-staff-bar" style="width:${Math.round(data.staff.deployed/data.staff.total*100)}%; background:var(--gradient-purple)"></div>
                </div>
                <div class="staff-grid" style="margin-top:12px" id="dash-staff-grid">
                  ${Object.entries(data.staff.zones).slice(0, 4).map(([zone, count]) => `
                    <div class="staff-zone">
                      <span class="staff-zone__name">${zone.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                      <span class="staff-zone__count">${count}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Gate Throughput Monitor (Feature 4: Smart Ingress/Egress) -->
        <div class="dash-grid" style="margin-top:0">
          <div class="dash-panel dash-grid__full">
            <div class="dash-panel__header">
              <div class="dash-panel__title">🚪 Gate Throughput Monitor</div>
              <span class="badge badge--blue"><span class="live-dot" style="width:6px;height:6px;margin-right:4px"></span> Live</span>
            </div>
            <div class="dash-panel__body">
              <div id="dash-gate-monitor">${renderGateMonitor(data)}</div>
            </div>
          </div>
        </div>

        <!-- Exit Wave Management -->
        <div class="dash-grid" style="margin-top:0">
          <div class="dash-panel dash-grid__full">
            <div class="dash-panel__header">
              <div class="dash-panel__title">🚶 Staggered Exit Management</div>
              <span class="badge badge--purple">Anti-bottleneck</span>
            </div>
            <div class="dash-panel__body">
              <div id="dash-exit-waves">${renderExitWaves(data)}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (!initialized) {
      bindDelegatedEvents();
      initialized = true;
    }

    renderCharts(data);
  }

  function bindDelegatedEvents() {
    container.addEventListener('click', (e) => {
      const ackBtn = e.target.closest('.btn-primary');
      if (ackBtn && ackBtn.textContent.trim() === 'Acknowledge') {
        ackBtn.textContent = '✓ Acknowledged';
        ackBtn.classList.remove('btn-primary');
        ackBtn.classList.add('btn-secondary');
        ackBtn.disabled = true;
        return;
      }
      const deployBtn = e.target.closest('.btn-secondary');
      if (deployBtn && deployBtn.textContent.trim() === 'Deploy Staff') {
        deployBtn.textContent = '✓ Dispatched';
        deployBtn.disabled = true;
        return;
      }
    });
  }

  function renderHeader(data) {
    const m = data.match;
    const statusText = m.status === 'LIVE' ? `${m.minute}'` :
                       m.status === 'HALFTIME' ? 'HT' :
                       m.status === 'SECOND_HALF' ? `${m.minute}'` :
                       m.status === 'FULL_TIME' ? 'FT' : 'Pre-Game';

    return `
      <div class="dash-header">
        <div class="dash-header__title">
          <span class="text-gradient-blue">⚡</span> VenueFlow Command Center
        </div>
        <div class="dash-header__match">
          <span class="dash-header__match-teams">${m.homeTeam} vs ${m.awayTeam}</span>
          <span class="dash-header__match-score">${m.homeScore} : ${m.awayScore}</span>
          <span class="dash-header__match-time">
            ${m.status !== 'FULL_TIME' && m.status !== 'PRE_GAME' ? '<span class="live-dot" style="margin-right:6px"></span>' : ''}
            ${statusText}
          </span>
        </div>
      </div>
    `;
  }

  function renderKPIs(data) {
    const m = data.match;
    const avgWait = Math.round([...data.concessions, ...data.restrooms].reduce((s, c) => s + c.waitTime, 0) / (data.concessions.length + data.restrooms.length));
    const activeIncidents = data.incidents.filter(i => i.status === 'active').length;

    return `
      <div class="kpi-row stagger">
        <div class="kpi-card kpi-card--blue">
          <div class="kpi-card__label">Total Attendance</div>
          <div class="kpi-card__value stat-value">${m.attendance.toLocaleString()}</div>
          <div class="kpi-card__sub">${Math.round(m.attendance / m.capacity * 100)}% of ${m.capacity.toLocaleString()}</div>
        </div>
        <div class="kpi-card kpi-card--green">
          <div class="kpi-card__label">Venue Capacity</div>
          <div class="kpi-card__value stat-value--green">${Math.round(m.attendance / m.capacity * 100)}%</div>
          <div class="kpi-card__sub">${(m.capacity - m.attendance).toLocaleString()} seats available</div>
        </div>
        <div class="kpi-card kpi-card--amber">
          <div class="kpi-card__label">Avg Wait Time</div>
          <div class="kpi-card__value stat-value--amber">${avgWait}<span style="font-size:var(--text-lg)">m</span></div>
          <div class="kpi-card__sub">${avgWait <= 8 ? '✅ Below target' : '⚠️ Above target'}</div>
        </div>
        <div class="kpi-card kpi-card--red">
          <div class="kpi-card__label">Active Incidents</div>
          <div class="kpi-card__value stat-value--red">${activeIncidents}</div>
          <div class="kpi-card__sub">${data.incidents.filter(i => i.severity === 'critical').length} critical</div>
        </div>
        <div class="kpi-card kpi-card--purple">
          <div class="kpi-card__label">Fan Satisfaction</div>
          <div class="kpi-card__value stat-value--purple">${data.satisfaction.toFixed(1)}</div>
          <div class="kpi-card__sub">out of 10.0</div>
        </div>
      </div>
    `;
  }

  function renderZoneCard(zone) {
    const pct = Math.round(zone.occupancy * 100);
    const color = pct > 90 ? 'var(--color-red)' : pct > 75 ? 'var(--color-orange)' : pct > 50 ? 'var(--color-yellow)' : 'var(--color-green)';
    const statusClass = pct > 90 ? 'zone-card--critical' : pct > 80 ? 'zone-card--warning' : '';
    const people = Math.round(zone.occupancy * zone.capacity);

    return `
      <div class="zone-card ${statusClass}">
        <div class="zone-card__header">
          <span class="zone-card__name">${zone.name}</span>
          <span class="zone-card__pct" style="color:${color}">${pct}%</span>
        </div>
        <div class="zone-card__bar">
          <div class="zone-card__bar-fill" style="width:${pct}%; background:${color}"></div>
        </div>
        <div class="zone-card__meta">
          <span>${people.toLocaleString()} / ${zone.capacity.toLocaleString()}</span>
          <span>${zone.type}</span>
        </div>
      </div>
    `;
  }

  function renderIncidentItem(inc) {
    return `
      <div class="incident-item">
        <div class="incident-item__dot incident-item__dot--${inc.severity}"></div>
        <div class="incident-item__content">
          <div class="incident-item__header">
            <span class="incident-item__title">${inc.title}</span>
            <span class="incident-item__time">${inc.time}</span>
          </div>
          <div class="incident-item__desc">${inc.desc}</div>
          ${inc.status === 'active' ? `
            <div class="incident-item__actions">
              <button class="btn btn-sm btn-primary">Acknowledge</button>
              <button class="btn btn-sm btn-secondary">Deploy Staff</button>
            </div>
          ` : `
            <span class="badge badge--green" style="margin-top:6px">Resolved</span>
          `}
        </div>
      </div>
    `;
  }

  function renderCharts(data) {
    requestAnimationFrame(() => {
      // Heatmap
      const heatmapCanvas = document.getElementById('dash-heatmap');
      if (heatmapCanvas) {
        HeatmapRenderer.render(heatmapCanvas, data, {
          showLabels: true,
          showUserPosition: false,
          showFlowParticles: true,
          showPitch: true,
          compact: false,
        });
      }

      // Wait time line chart
      const waitCanvas = document.getElementById('dash-wait-chart');
      if (waitCanvas) {
        const top3 = data.concessions.slice(0, 3);
        Charts.lineChart(waitCanvas, {
          labels: data.waitTimeHistory.labels,
          datasets: top3.map((c, i) => ({
            label: c.name,
            data: data.waitTimeHistory.datasets[c.id] || [],
            color: ['#00D4FF', '#FFB800', '#A855F7'][i],
          })),
          yLabel: 'm',
          title: '',
          showDots: false,
        });
      }

      // Bar chart
      const barCanvas = document.getElementById('dash-bar-chart');
      if (barCanvas) {
        const foodItems = data.concessions.filter(c => c.type === 'food');
        Charts.barChart(barCanvas, {
          labels: foodItems.map(c => c.name.split(' ')[0]),
          values: foodItems.map(c => c.waitTime),
          colors: foodItems.map(c => {
            if (c.waitTime <= 5) return '#22C55E';
            if (c.waitTime <= 10) return '#EAB308';
            if (c.waitTime <= 15) return '#F97316';
            return '#EF4444';
          }),
          title: 'Current Wait (min)',
        });
      }

      // Donut chart
      const donutCanvas = document.getElementById('dash-donut-chart');
      if (donutCanvas) {
        const seatZones = data.zones.filter(z => z.type === 'seating');
        Charts.donutChart(donutCanvas, {
          segments: seatZones.map((z, i) => ({
            label: z.name.replace(' Stand', ''),
            value: Math.round(z.occupancy * z.capacity),
            color: ['#00D4FF', '#FFB800', '#A855F7', '#22C55E'][i],
          })),
          centerValue: `${Math.round(data.match.attendance / 1000)}K`,
          centerLabel: 'Total',
          title: '',
        });
      }

      // Gauge chart
      const gaugeCanvas = document.getElementById('dash-gauge-chart');
      if (gaugeCanvas) {
        Charts.gaugeChart(gaugeCanvas, {
          value: data.satisfaction,
          maxVal: 10,
          label: 'Fan Satisfaction',
          color: data.satisfaction >= 8 ? '#22C55E' : data.satisfaction >= 6 ? '#EAB308' : '#EF4444',
          suffix: '',
        });
      }
    });
  }

  // =====================================================
  //  Gate Throughput & Exit Wave Renderers
  // =====================================================

  function renderGateMonitor(data) {
    const gates = data.gateThroughput;
    if (!gates) return '';
    return `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-sm)">
        ${Object.entries(gates).map(([gateId, gt]) => {
          const gateName = gateId.replace('gate-', 'Gate ').replace(/\b\w/g, c => c.toUpperCase());
          const statusColor = gt.status === 'optimal' ? 'green' : gt.status === 'normal' ? 'yellow' : 'red';
          return `
            <div class="zone-card ${gt.status === 'congested' ? 'zone-card--critical' : gt.status === 'normal' ? 'zone-card--warning' : ''}">
              <div class="zone-card__header">
                <span class="zone-card__name">🚪 ${gateName}</span>
                <span class="badge badge--${statusColor}" style="font-size:8px">${gt.status}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;text-align:center;margin:8px 0">
                <div>
                  <div style="font-family:var(--font-heading);font-size:var(--text-lg);font-weight:800;color:var(--color-${statusColor})">${gt.waitMin}</div>
                  <div style="font-size:8px;color:var(--color-text-muted);text-transform:uppercase">Wait</div>
                </div>
                <div>
                  <div style="font-family:var(--font-heading);font-size:var(--text-lg);font-weight:800;color:var(--color-text-primary)">${gt.queueLength}</div>
                  <div style="font-size:8px;color:var(--color-text-muted);text-transform:uppercase">Queue</div>
                </div>
                <div>
                  <div style="font-family:var(--font-heading);font-size:var(--text-lg);font-weight:800;color:var(--color-text-primary)">${gt.throughput}</div>
                  <div style="font-size:8px;color:var(--color-text-muted);text-transform:uppercase">PPL/min</div>
                </div>
              </div>
              <div class="progress-bar">
                <div class="progress-bar__fill" style="width:${Math.min(100, gt.queueLength / 1.2)}%; background:var(--color-${statusColor})"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderExitWaves(data) {
    const waves = data.exitWindows;
    if (!waves || waves.length === 0) return '<p style="color:var(--color-text-muted);font-size:var(--text-sm)">Exit waves will appear at match end.</p>';
    return `
      <div style="display:flex;flex-direction:column;gap:var(--space-sm)">
        ${waves.map(w => {
          const fillPct = Math.round((w.assigned / w.capacity) * 100);
          return `
            <div style="display:flex;align-items:center;gap:var(--space-md);padding:var(--space-sm) var(--space-md);background:var(--color-bg-elevated);border-radius:var(--radius-md)">
              <div style="width:12px;height:12px;border-radius:50%;background:var(--color-${w.color});flex-shrink:0"></div>
              <div style="flex:1">
                <div style="font-size:var(--text-sm);font-weight:700;color:var(--color-text-primary)">${w.label}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${w.sections}</div>
              </div>
              <div style="text-align:center;min-width:60px">
                <div style="font-family:var(--font-heading);font-size:var(--text-base);font-weight:800;color:var(--color-accent-blue)">${w.departureDisplay}</div>
                <div style="font-size:8px;color:var(--color-text-muted);text-transform:uppercase">Depart</div>
              </div>
              <div style="flex:1;max-width:120px">
                <div class="progress-bar">
                  <div class="progress-bar__fill" style="width:${fillPct}%; background:var(--color-${w.color})"></div>
                </div>
                <div style="font-size:8px;color:var(--color-text-muted);margin-top:2px">${w.assigned.toLocaleString()} / ${w.capacity.toLocaleString()}</div>
              </div>
              <div style="min-width:50px;text-align:right">
                <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-text-secondary)">${w.recommendedGate}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function update(data) {
    if (!container) return;

    // Smart update — only refresh dynamic sections, preserve scroll
    const headerArea = document.getElementById('dash-header-area');
    if (headerArea) headerArea.innerHTML = renderHeader(data);

    const kpiArea = document.getElementById('dash-kpi-area');
    if (kpiArea) kpiArea.innerHTML = renderKPIs(data);

    const zoneGrid = document.getElementById('dash-zone-grid');
    if (zoneGrid) {
      zoneGrid.innerHTML = data.zones.filter(z => z.type === 'seating' || z.type === 'concourse').map(z => renderZoneCard(z)).join('');
    }

    const zoneAlertCount = document.getElementById('dash-zone-alert-count');
    if (zoneAlertCount) zoneAlertCount.textContent = `${data.zones.filter(z => z.occupancy > 0.85).length} alerts`;

    const incidentList = document.getElementById('dash-incident-list');
    if (incidentList) incidentList.innerHTML = data.incidents.map(inc => renderIncidentItem(inc)).join('');

    const incidentCount = document.getElementById('dash-incident-count');
    if (incidentCount) incidentCount.textContent = `${data.incidents.filter(i => i.status === 'active').length} active`;

    const staffCount = document.getElementById('dash-staff-count');
    if (staffCount) staffCount.textContent = `${data.staff.deployed} / ${data.staff.total}`;

    const staffBar = document.getElementById('dash-staff-bar');
    if (staffBar) staffBar.style.width = `${Math.round(data.staff.deployed/data.staff.total*100)}%`;

    // Gate Throughput (Feature 4)
    const gateMon = document.getElementById('dash-gate-monitor');
    if (gateMon) gateMon.innerHTML = renderGateMonitor(data);

    const exitWaves = document.getElementById('dash-exit-waves');
    if (exitWaves) exitWaves.innerHTML = renderExitWaves(data);

    renderCharts(data);
  }

  function destroy() {}

  return { init, update, destroy };
})();
