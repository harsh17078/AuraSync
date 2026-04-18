/* ============================================================
   Insight-X — Attendee View Controller (Desktop + Mobile)
   Reference: YelloveOS-style full-width dashboard layout
   ============================================================ */

const AttendeeView = (() => {
  let container = null;
  let currentTab = 'home';
  let foodFilter = 'all';
  let initialized = false;
  let selectedExpressLane = null;
  let selectedWayfindingDest = null;
  let activeRoute = null;
  let arAnimFrame = null;
  let navAnimFrame = null;
  let activePanel = 'navigation'; // navigation | queues | ar | ticket

  function init(el) {
    container = el;
    initialized = false;
    render();
  }

  function render() {
    if (!container) return;
    const data = VenueData.getSnapshot();

    container.innerHTML = `
      <div class="vf" id="att-root">
        <!-- Broadcast Banner -->
        <div class="vf-broadcast" id="vf-broadcast">
          <span class="vf-broadcast__tag" style="position: relative; z-index: 2;">BROADCAST</span>
          <div style="flex: 1; overflow: hidden; position: relative; display: flex;">
            <span class="vf-broadcast__text" id="vf-broadcast-text">${data.broadcasts[0]?.text || ''}</span>
          </div>
        </div>

        <!-- Pickup / Queue Alert Banners -->
        <div id="att-pickup-banner"></div>

        <!-- Desktop Layout: 2-column -->
        <div class="vf-layout">

          <!-- LEFT COLUMN -->
          <div class="vf-left">
            <!-- Smart Decision Engine -->
            <div class="vf-panel" id="vf-sde">
              <div class="vf-panel__header">
                <span class="vf-panel__icon">🧠</span>
                <span class="vf-panel__title">SMART DECISION ENGINE</span>
              </div>
              <div class="sde-grid" id="sde-grid">${renderSmartDecisions(data)}</div>
            </div>

            <!-- Section Tabs: Navigation | Queue Telemetry | AR | Ticket -->
            <div class="vf-tabs" id="vf-panel-tabs" role="tablist">
              <button class="vf-tab vf-tab--active" data-panel="navigation" role="tab" aria-label="Open Navigation Panel">🧭 Navigation</button>
              <button class="vf-tab" data-panel="queues" role="tab" aria-label="Open Queue Telemetry Panel">🔢 Queue Telemetry</button>
              <button class="vf-tab" data-panel="ar" role="tab" aria-label="Open AR Safety Panel">📡 AR Safety</button>
              <button class="vf-tab" data-panel="ticket" role="tab" aria-label="Open Ticket and Exit Panel">🎫 Ticket & Exit</button>
            </div>

            <!-- Navigation Panel -->
            <div class="vf-section vf-section--active" id="vf-panel-navigation">
              <div class="vf-nav-split">
                <div class="vf-nav-map">
                  ${activeRoute ? `
                    <div class="vf-active-route-bar">
                      <span class="vf-active-route-bar__icon">✅</span>
                      <span>Active Path Displayed</span>
                      <span class="vf-active-route-bar__sub">Route optimized using real-time crowd density and walking navigation</span>
                    </div>
                  ` : ''}
                  <canvas class="vf-map-canvas" id="att-main-heatmap"></canvas>
                  <div class="vf-map-overlay">
                    <span class="vf-map-overlay__seat">📍 ${data.userPosition.seat}</span>
                    <span class="vf-map-overlay__cap">${Math.round(data.match.attendance / data.match.capacity * 100)}% capacity</span>
                  </div>
                </div>
                <div class="vf-nav-dests" id="vf-nav-dests">${renderDestinations(data)}</div>
              </div>
              ${activeRoute ? renderActiveRoute(activeRoute) : ''}
            </div>

            <!-- Queue Telemetry Panel -->
            <div class="vf-section" id="vf-panel-queues">
              ${renderQueueTelemetry(data)}
            </div>

            <!-- AR Safety Panel -->
            <div class="vf-section" id="vf-panel-ar">
              ${renderARPanel(data)}
            </div>

            <!-- Ticket & Exit Panel -->
            <div class="vf-section" id="vf-panel-ticket">
              ${renderTicketPanel(data)}
            </div>
          </div>

          <!-- RIGHT COLUMN -->
          <div class="vf-right">
            <!-- Match Status -->
            <div class="vf-match-card" id="vf-match-card">${renderMatchCard(data)}</div>

            <!-- Squad Radar -->
            <div class="vf-panel">
              <div class="vf-panel__header">
                <span class="vf-panel__icon">📡</span>
                <span class="vf-panel__title">Squad Radar</span>
                <span class="vf-panel__badge">📍</span>
              </div>
              <div id="vf-squad-radar">${renderSquadRadar(data)}</div>
              <button class="vf-ping-btn" id="vf-ping-btn">PING MY LOCATION</button>
            </div>

            <!-- Quick Actions -->
            <div class="vf-quick-actions" id="vf-quick-actions">${renderQuickActions(data)}</div>

            <!-- Captain Mode (AI Chat) -->
            <div class="vf-panel vf-captain">
              <div class="vf-panel__header">
                <span class="vf-panel__icon">👑</span>
                <span class="vf-panel__title">Captain Mode</span>
                <span class="vf-captain__sub">Gemini Strategic Integration</span>
              </div>
              <div class="vf-chat" id="vf-chat">${renderCaptainChat(data)}</div>
              <div class="vf-chat-input">
                <input type="text" class="vf-chat-input__field" id="vf-chat-field" placeholder="Ask Captain for routing or queues..." />
                <button class="vf-chat-input__send" id="vf-chat-send">➤</button>
              </div>
            </div>

            <!-- Match Momentum -->
            <div class="vf-panel">
              <div class="vf-panel__header">
                <span class="vf-panel__title" style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em">MATCH MOMENTUM</span>
              </div>
              <div class="vf-momentum" id="vf-momentum">${renderMomentum(data)}</div>
            </div>
          </div>

        </div>

        <!-- Mobile Bottom Nav (hidden on desktop) -->
        <nav class="bottom-nav vf-mobile-nav" id="att-bottom-nav">
          <button class="bottom-nav__item bottom-nav__item--active" data-panel="navigation"><span class="bottom-nav__icon">🧭</span>Nav</button>
          <button class="bottom-nav__item" data-panel="queues"><span class="bottom-nav__icon">🔢</span>Queue</button>
          <button class="bottom-nav__item" data-panel="ar"><span class="bottom-nav__icon">📡</span>AR</button>
          <button class="bottom-nav__item" data-panel="ticket"><span class="bottom-nav__icon">🎫</span>Ticket</button>
          <button class="bottom-nav__item" data-tab="captain"><span class="bottom-nav__icon">👑</span>Captain</button>
        </nav>
      </div>
    `;

    if (!initialized) {
      bindDelegatedEvents();
      initialized = true;
    }
    updatePickupBanner(data);
    requestAnimationFrame(() => renderCanvases(data));
  }

  // =====================================================
  //  Event Delegation
  // =====================================================

  function bindDelegatedEvents() {
    container.addEventListener('click', (e) => {
      // Panel tabs
      const tabBtn = e.target.closest('[data-panel]');
      if (tabBtn) { e.preventDefault(); switchPanel(tabBtn.dataset.panel); return; }

      // Captain mobile toggle
      const captainTab = e.target.closest('[data-tab="captain"]');
      if (captainTab) {
        e.preventDefault();
        const rightCol = container.querySelector('.vf-right');
        if (rightCol) rightCol.classList.toggle('vf-right--mobile-show');
        return;
      }

      // Wayfinding destination
      const destBtn = e.target.closest('[data-wayfind-dest]');
      if (destBtn) {
        e.preventDefault();
        const destId = destBtn.dataset.wayfindDest;
        if (selectedWayfindingDest === destId) {
          selectedWayfindingDest = null; activeRoute = null;
        } else {
          selectedWayfindingDest = destId;
          activeRoute = VenueData.findFastestRoute('user-seat', destId);
        }
        refreshPanel('navigation');
        return;
      }

      // Food filter
      const filterBtn = e.target.closest('[data-food-filter]');
      if (filterBtn) { e.preventDefault(); foodFilter = filterBtn.dataset.foodFilter; refreshPanel('queues'); return; }

      // Place order
      const orderBtn = e.target.closest('[data-order-item]');
      if (orderBtn) {
        e.preventDefault(); VenueData.placeOrder(orderBtn.dataset.orderItem);
        orderBtn.textContent = '✓ Ordered'; orderBtn.disabled = true; orderBtn.style.opacity = '0.5';
        return;
      }

      // Restroom queue
      const queueBtn = e.target.closest('[data-join-queue]');
      if (queueBtn) { e.preventDefault(); VenueData.joinRestroomQueue(queueBtn.dataset.joinQueue); refreshPanel('queues'); return; }
      const leaveBtn = e.target.closest('[data-leave-queue]');
      if (leaveBtn) { e.preventDefault(); VenueData.leaveRestroomQueue(leaveBtn.dataset.leaveQueue); refreshPanel('queues'); return; }

      // Concession queue
      const cqJoin = e.target.closest('[data-join-concession-queue]');
      if (cqJoin) { e.preventDefault(); VenueData.joinConcessionQueue(cqJoin.dataset.joinConcessionQueue); refreshPanel('queues'); return; }
      const cqLeave = e.target.closest('[data-leave-concession-queue]');
      if (cqLeave) { e.preventDefault(); VenueData.leaveConcessionQueue(cqLeave.dataset.leaveConcessionQueue); refreshPanel('queues'); return; }

      // Express lane
      const laneBtn = e.target.closest('[data-select-lane]');
      if (laneBtn) { e.preventDefault(); selectedExpressLane = laneBtn.dataset.selectLane; refreshPanel('queues'); return; }
      const slotBtn = e.target.closest('[data-book-slot]');
      if (slotBtn) {
        e.preventDefault(); const [l, s] = slotBtn.dataset.bookSlot.split('|');
        VenueData.bookExpressSlot(l, s); slotBtn.textContent = '✓ Booked'; slotBtn.disabled = true;
        return;
      }

      // Dismiss pickup
      const dismissBtn = e.target.closest('[data-dismiss-pickup]');
      if (dismissBtn) { e.preventDefault(); VenueData.dismissPickupNotification(dismissBtn.dataset.dismissPickup); updatePickupBanner(VenueData.getSnapshot()); return; }

      // Ping location
      if (e.target.closest('#vf-ping-btn')) {
        e.preventDefault();
        const btn = e.target.closest('#vf-ping-btn');
        btn.textContent = '📍 Location Shared!'; btn.style.background = 'var(--color-green)';
        setTimeout(() => { btn.textContent = 'PING MY LOCATION'; btn.style.background = ''; }, 2000);
        return;
      }

      // Quick actions & SDE Cards
      const qaBtn = e.target.closest('[data-qa]');
      if (qaBtn) {
        e.preventDefault();
        const action = qaBtn.dataset.qa;
        const destId = qaBtn.dataset.destId;

        if (action === 'food') switchPanel('queues');
        else if (action === 'emergency' || action === 'entry') {
          if (destId && destId !== 'undefined' && destId !== 'null') {
            activeRoute = VenueData.findFastestRoute('user-seat', destId);
            selectedWayfindingDest = destId;
          } else {
            activeRoute = null;
            selectedWayfindingDest = null;
          }
          refreshPanel('navigation');
          switchPanel('navigation');
        }
        else if (action === 'home') {
          const overlay = document.getElementById('return-home-overlay');
          if (overlay) {
            overlay.classList.add('settings-modal--open');
            overlay.removeAttribute('aria-hidden');
            setTimeout(() => document.getElementById('dest-loc')?.focus(), 100);
          }
        }
        return;
      }
    });

    // Captain chat send
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'vf-chat-field') {
        e.preventDefault(); sendChatMessage(); return;
      }
    });
    container.addEventListener('click', (e) => {
      if (e.target.closest('#vf-chat-send')) { e.preventDefault(); sendChatMessage(); return; }
    });
  }

  function sendChatMessage() {
    const field = document.getElementById('vf-chat-field');
    if (!field || !field.value.trim()) return;
    VenueData.sendCaptainMessage(field.value.trim());
    field.value = '';
    
    // Immediate user bubble render
    setTimeout(() => {
      const chatEl = document.getElementById('vf-chat');
      if (chatEl) { chatEl.innerHTML = renderCaptainChat(VenueData.getSnapshot()); chatEl.scrollTop = chatEl.scrollHeight; }
    }, 100);

    // Captain's AI response logic execution
    setTimeout(() => {
      const data = VenueData.getSnapshot();
      const chatEl = document.getElementById('vf-chat');
      if (chatEl) { chatEl.innerHTML = renderCaptainChat(data); chatEl.scrollTop = chatEl.scrollHeight; }

      const lastMsg = data.captainChat[data.captainChat.length - 1];
      if (lastMsg && lastMsg.role === 'captain' && lastMsg.action) {
        if (lastMsg.action === 'food' || lastMsg.action === 'queues') switchPanel('queues');
        else if (lastMsg.action === 'emergency' || lastMsg.action === 'navigation') switchPanel('navigation');
        
        if (lastMsg.destId) {
          activeRoute = VenueData.findFastestRoute('user-seat', lastMsg.destId);
          selectedWayfindingDest = lastMsg.destId;
          if (lastMsg.action) refreshPanel('navigation');
        }
      }
    }, 800);
  }

  function switchPanel(panel) {
    activePanel = panel;
    container.querySelectorAll('.vf-tab').forEach(btn => btn.classList.toggle('vf-tab--active', btn.dataset.panel === panel));
    container.querySelectorAll('.vf-section').forEach(el => el.classList.toggle('vf-section--active', el.id === `vf-panel-${panel}`));
    container.querySelectorAll('.bottom-nav__item').forEach(btn => {
      if (btn.dataset.panel) btn.classList.toggle('bottom-nav__item--active', btn.dataset.panel === panel);
    });

    if (panel !== 'ar' && arAnimFrame) { cancelAnimationFrame(arAnimFrame); arAnimFrame = null; }
    if (panel !== 'navigation' && navAnimFrame) { cancelAnimationFrame(navAnimFrame); navAnimFrame = null; }
    if (panel === 'navigation') { setTimeout(() => renderCanvases(VenueData.getSnapshot()), 100); startNavAnimation(); }
    if (panel === 'ar') startARAnimation();
    if (panel === 'queues') refreshPanel('queues');
    if (panel === 'ticket') refreshPanel('ticket');
  }

  function refreshPanel(panel) {
    const data = VenueData.getSnapshot();
    if (panel === 'navigation') {
      const el = document.getElementById('vf-panel-navigation');
      if (el) {
        el.innerHTML = `
          <div class="vf-nav-split">
            <div class="vf-nav-map">
              <canvas class="vf-map-canvas" id="att-main-heatmap"></canvas>
              <div class="vf-map-overlay">
                <span class="vf-map-overlay__seat">📍 ${data.userPosition.seat}</span>
                <span class="vf-map-overlay__cap">${Math.round(data.match.attendance / data.match.capacity * 100)}% capacity</span>
              </div>
              ${activeRoute ? `
                <div class="vf-active-route-bar">
                  <span class="vf-active-route-bar__icon">✅</span>
                  <span>Active Path Displayed</span>
                  <span class="vf-active-route-bar__sub">Route optimized using real-time crowd density and walking navigation</span>
                </div>
              ` : ''}
            </div>
            <div class="vf-nav-dests" id="vf-nav-dests">${renderDestinations(data)}</div>
          </div>
          ${activeRoute ? renderActiveRoute(activeRoute) : ''}
        `;
        setTimeout(() => renderCanvases(data), 50);
      }
    } else if (panel === 'queues') {
      const el = document.getElementById('vf-panel-queues');
      if (el) el.innerHTML = renderQueueTelemetry(data);
    } else if (panel === 'ar') {
      const el = document.getElementById('vf-panel-ar');
      if (el) el.innerHTML = renderARPanel(data);
    } else if (panel === 'ticket') {
      const el = document.getElementById('vf-panel-ticket');
      if (el) el.innerHTML = renderTicketPanel(data);
    }
  }

  // =====================================================
  //  Pickup Banner
  // =====================================================
  function updatePickupBanner(data) {
    const banner = document.getElementById('att-pickup-banner');
    if (!banner) return;
    const readyNotifs = (data.pickupNotifications || []).filter(p => !p.dismissed);
    const approachingQueues = (data.concessionQueues || []).filter(q => q.status === 'approaching');
    const items = [];
    readyNotifs.forEach(n => items.push(`<div class="pickup-banner"><div class="pickup-banner__pulse"></div><div class="pickup-banner__content"><div class="pickup-banner__title">${n.title}</div><div class="pickup-banner__desc">${n.desc}</div></div><button class="pickup-banner__dismiss" data-dismiss-pickup="${n.id}">✕</button></div>`));
    approachingQueues.forEach(q => items.push(`<div class="pickup-banner" style="border-color:rgba(234,179,8,0.4)"><div class="pickup-banner__pulse" style="background:var(--color-accent-amber)"></div><div class="pickup-banner__content"><div class="pickup-banner__title" style="color:var(--color-accent-amber)">⏰ Head to ${q.concessionName}!</div><div class="pickup-banner__desc">~2 min until your turn</div></div></div>`));
    banner.innerHTML = items.join('');
  }

  // =====================================================
  //  Smart Decision Engine
  // =====================================================
  function renderSmartDecisions(data) {
    const sd = data.smartDecisions;
    return Object.values(sd).map(d => `
      <div class="sde-card sde-card--${d.color}" data-qa="${d.action}" data-dest-id="${d.destId}">
        <div class="sde-card__label"><span class="sde-card__dot sde-card__dot--${d.color}"></span>${d.label}</div>
        <div class="sde-card__name">${d.icon} ${d.name}</div>
        <div class="sde-card__detail">📍 ${d.detail}</div>
      </div>
    `).join('');
  }

  // =====================================================
  //  Match Card
  // =====================================================
  function renderMatchCard(data) {
    const m = data.match;
    const statusLabel = m.status === 'LIVE' ? `${m.minute}'` : m.status === 'HALFTIME' ? 'HT' : m.status === 'SECOND_HALF' ? `${m.minute}'` : m.status === 'FULL_TIME' ? 'FT' : 'Pre-Game';
    return `
      <div class="vf-match-inner">
        <div class="vf-match-teams">
          <span class="vf-match-team">⚡ ${m.homeTeam}</span>
          <span class="vf-match-score">${m.homeScore} : ${m.awayScore}</span>
          <span class="vf-match-team">🔥 ${m.awayTeam}</span>
        </div>
        <div class="vf-match-meta">
          <span class="vf-match-minute">${m.status !== 'FULL_TIME' && m.status !== 'PRE_GAME' ? `<span class="live-dot"></span> ${statusLabel}` : statusLabel}</span>
          <span>📍 ${m.venue}</span>
          <span>${m.weather.temp}°C · ${m.weather.humidity}% 💧</span>
          <span>👥 ${m.attendance.toLocaleString()}</span>
        </div>
      </div>
    `;
  }

  // =====================================================
  //  Squad Radar
  // =====================================================
  function renderSquadRadar(data) {
    return data.squadMembers.map(m => `
      <div class="squad-item">
        <div class="squad-item__avatar">${m.avatar}</div>
        <div class="squad-item__info">
          <div class="squad-item__name">${m.name}</div>
          <div class="squad-item__loc"><span class="squad-item__status-dot squad-item__status-dot--${m.status}"></span> ${m.location}</div>
        </div>
        <div class="squad-item__dist">
          <span class="squad-item__dist-val">${m.distance}m</span>
          <span class="squad-item__status-label">${m.status.toUpperCase()}</span>
        </div>
      </div>
    `).join('');
  }

  // =====================================================
  //  Quick Actions
  // =====================================================
  function renderQuickActions(data) {
    return data.quickActions.map(a => `
      <button class="qa-btn qa-btn--${a.color}" data-qa="${a.action}">
        <span class="qa-btn__icon">${a.icon}</span> ${a.label}
      </button>
    `).join('');
  }

  // =====================================================
  //  Captain Mode Chat
  // =====================================================
  function renderCaptainChat(data) {
    return data.captainChat.map(msg => `
      <div class="vf-chat-msg vf-chat-msg--${msg.role}">
        ${msg.role === 'captain' ? '<span class="vf-chat-msg__avatar">👑</span>' : ''}
        <div class="vf-chat-msg__bubble">${msg.text}</div>
      </div>
    `).join('');
  }

  // =====================================================
  //  Match Momentum
  // =====================================================
  function renderMomentum(data) {
    const mm = data.matchMomentum;
    const pct = mm.value;
    const trendColor = mm.trend.startsWith('+') ? 'var(--color-green)' : 'var(--color-red)';
    return `
      <div class="vf-momentum__row">
        <span class="vf-momentum__val">${pct}<span style="font-size:var(--text-lg)">%</span></span>
        <span class="vf-momentum__trend" style="color:${trendColor}">📈 ${mm.trend}% ${mm.period}</span>
      </div>
      <div class="progress-bar" style="height:8px;margin-top:8px">
        <div class="progress-bar__fill" style="width:${pct}%; background: linear-gradient(90deg, var(--color-green), var(--color-accent-amber), var(--color-accent-blue))"></div>
      </div>
    `;
  }

  // =====================================================
  //  Destinations (navigate panel)
  // =====================================================
  function renderDestinations(data) {
    const dests = VenueData.getWayfindingDestinations();
    const categories = [
      { key: 'gate', label: '🚪 Exits & Gates', items: dests.filter(d => d.type === 'gate') },
      { key: 'food', label: '🍽️ Food & Drink', items: dests.filter(d => d.type === 'food' || d.type === 'drink') },
      { key: 'restroom', label: '🚻 Restrooms', items: dests.filter(d => d.type === 'restroom') },
      { key: 'transport', label: '🚗 Transport', items: data.transportOptions.map(t => ({
        id: t.id, type: t.type, icon: t.icon, label: t.name,
        route: { totalWalkMin: t.waitTime, segments: [] },
      })) },
    ];
    return categories.map(cat => `
      <div class="vf-dest-group">
        <div class="vf-dest-group__title">${cat.label}</div>
        ${cat.items.map(d => {
          const isSelected = selectedWayfindingDest === d.id;
          const r = d.route;
          return `
            <div class="vf-dest-item ${isSelected ? 'vf-dest-item--selected' : ''}" data-wayfind-dest="${d.id}">
              <span class="vf-dest-item__icon">${d.icon}</span>
              <div class="vf-dest-item__info">
                <div class="vf-dest-item__name">${d.label}</div>
                ${r && r.segments ? `<div class="vf-dest-item__crowd">${r.segments.map(s => `<span class="crowd-dot crowd-dot--${s.crowdColor}"></span>`).join('')}</div>` : ''}
              </div>
              <span class="vf-dest-item__time ${r && r.totalWalkMin > 10 ? 'vf-dest-item__time--warn' : ''}">${r ? `⏱ ${r.totalWalkMin}m` : ''}</span>
            </div>
          `;
        }).join('')}
      </div>
    `).join('');
  }

  // =====================================================
  //  Active Route
  // =====================================================
  function renderActiveRoute(route) {
    if (!route) return '';
    const navGraph = VenueData.getNavGraph();
    return `
      <div class="vf-route-detail">
        <div class="vf-route-detail__header">
          <span>📍 → ${route.destinationNode?.icon || ''} ${route.destinationNode?.label || ''}</span>
          <span class="vf-route-detail__time">${route.totalWalkMin} min</span>
        </div>
        <div class="vf-route-detail__segs">
          ${route.segments.map(s => `
            <div class="route-segment">
              <div class="route-segment__dot route-segment__dot--${s.crowdColor}"></div>
              <div class="route-segment__info"><span>${navGraph.nodes[s.from]?.label || s.from}</span> → <span>${navGraph.nodes[s.to]?.label || s.to}</span></div>
              <div class="route-segment__meta"><span class="route-segment__walk">${s.walkMin}m</span><span class="crowd-badge crowd-badge--${s.crowdColor}">${s.crowdLabel}</span></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // =====================================================
  //  Queue Telemetry
  // =====================================================
  function renderQueueTelemetry(data) {
    const allQueues = [...data.concessions, ...data.restrooms].sort((a, b) => a.waitTime - b.waitTime);
    const activeC = (data.concessionQueues || []).filter(q => q.status !== 'served' && q.status !== 'completed');
    const activeR = data.restroomQueues.filter(q => q.status !== 'completed');

    return `
      <div class="vf-ql-split">
        <!-- Queue Telemetry List -->
        <div class="vf-panel">
          <div class="vf-panel__header"><span class="vf-panel__icon">🔢</span><span class="vf-panel__title">Queue Telemetry</span></div>
          <div class="vf-queue-list">
            ${allQueues.map(item => {
              const color = item.waitTime <= 3 ? 'green' : item.waitTime <= 8 ? 'amber' : 'red';
              const inCQ = activeC.find(q => q.concessionId === item.id);
              const inRQ = activeR.find(q => q.restroomId === item.id);
              const inQueue = inCQ || inRQ;
              return `
                <div class="vf-queue-row">
                  <span class="vf-queue-row__icon">${item.icon}</span>
                  <div class="vf-queue-row__info">
                    <div class="vf-queue-row__name">${item.name}</div>
                    <div class="vf-queue-row__zone">${item.zone ? item.zone.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''}</div>
                  </div>
                  <span class="vf-queue-row__time vf-queue-row__time--${color}">⏱ ${item.waitTime}m</span>
                  ${!inQueue && item.type !== 'drink' ? `<button class="vf-queue-row__join" data-${item.totalStalls !== undefined ? 'join-queue' : 'join-concession-queue'}="${item.id}">Join</button>` :
                    inQueue ? `<span class="badge badge--green" style="font-size:8px">#${inQueue.position || '✓'}</span>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Food Menu -->
        <div class="vf-panel">
          <div class="vf-panel__header"><span class="vf-panel__icon">🍽️</span><span class="vf-panel__title">Click & Collect</span></div>
          <div class="food-tabs" style="margin-bottom:12px">
            <button class="food-tab ${foodFilter === 'all' ? 'food-tab--active' : ''}" data-food-filter="all">All</button>
            <button class="food-tab ${foodFilter === 'food' ? 'food-tab--active' : ''}" data-food-filter="food">🍔 Food</button>
            <button class="food-tab ${foodFilter === 'drink' ? 'food-tab--active' : ''}" data-food-filter="drink">🍺 Drinks</button>
          </div>
          <div class="vf-food-list">
            ${(foodFilter === 'all' ? data.foodMenu : data.foodMenu.filter(i => i.category === foodFilter)).map(item => `
              <div class="food-item">
                <span class="food-item__icon">${item.icon}</span>
                <div class="food-item__info">
                  <div class="food-item__name">${item.name}</div>
                  <div class="food-item__stand">${item.stand} · ~${item.prepTime}m</div>
                </div>
                <div class="food-item__right">
                  <div class="food-item__price">$${item.price.toFixed(2)}</div>
                  <button class="food-item__btn" data-order-item="${item.id}">Order</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // =====================================================
  //  AR Panel
  // =====================================================
  function renderARPanel(data) {
    const ar = data.arOverlay;
    return `
      <div class="vf-ar-layout">
        <div class="ar-viewport">
          <canvas class="ar-canvas" id="att-ar-canvas"></canvas>
          <div class="ar-viewport__badge"><span class="live-dot" style="width:5px;height:5px;margin-right:4px"></span> AR LIVE</div>
        </div>
        <div class="vf-ar-sidebar">
          <div class="vf-panel__header"><span class="vf-panel__icon">🆘</span><span class="vf-panel__title">Safety & Friends</span></div>
          ${ar.safetyAlerts.map(a => `
            <div class="safety-card"><span class="safety-card__icon">${a.icon}</span><div class="safety-card__info"><div class="safety-card__label">${a.label}</div><div class="safety-card__direction">${a.direction}</div></div><span class="safety-card__distance">${a.distance}</span></div>
          `).join('')}
          <div style="margin-top:12px">
            ${ar.friends.map(f => `
              <div class="friend-card"><div class="friend-card__avatar">${f.emoji}</div><div class="friend-card__info"><div class="friend-card__name">${f.name}</div><div class="friend-card__location">${f.section}</div></div><div class="friend-card__distance"><span class="friend-card__distance-num">${f.distance}m</span></div></div>
            `).join('')}
          </div>
          <div style="margin-top:12px">
            ${ar.trafficZones.map(tz => {
              const sc = tz.level === 'high' ? 'red' : tz.level === 'moderate' ? 'yellow' : 'green';
              return `<div class="traffic-card traffic-card--${sc}"><div class="traffic-card__header"><span class="traffic-card__name">${tz.area}</span><span class="badge badge--${sc}">${Math.round(tz.occupancy * 100)}%</span></div><div class="progress-bar" style="margin-top:4px"><div class="progress-bar__fill" style="width:${Math.round(tz.occupancy * 100)}%;background:var(--color-${sc})"></div></div></div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // =====================================================
  //  Ticket & Exit Panel
  // =====================================================
  function renderTicketPanel(data) {
    const ticket = data.digitalTicket;
    const exit = data.userExitAssignment;
    const gates = data.gateThroughput;
    return `
      <div class="vf-ticket-layout">
        <!-- Ticket -->
        <div class="digital-ticket">
          <div class="digital-ticket__header">
            <div class="digital-ticket__event"><div class="digital-ticket__event-name">⚡ ${data.match.homeTeam} vs ${data.match.awayTeam}</div><div class="digital-ticket__venue">📍 ${data.match.venue}</div></div>
            <div class="digital-ticket__id">${ticket.id}</div>
          </div>
          <div class="digital-ticket__details">
            <div class="digital-ticket__detail"><span class="digital-ticket__detail-label">Section</span><span class="digital-ticket__detail-value">${ticket.section}</span></div>
            <div class="digital-ticket__detail"><span class="digital-ticket__detail-label">Row</span><span class="digital-ticket__detail-value">${ticket.row}</span></div>
            <div class="digital-ticket__detail"><span class="digital-ticket__detail-label">Seat</span><span class="digital-ticket__detail-value">${ticket.seat}</span></div>
            <div class="digital-ticket__detail"><span class="digital-ticket__detail-label">Gate</span><span class="digital-ticket__detail-value" style="color:var(--color-accent-blue)">${ticket.gate}</span></div>
          </div>
          <div class="digital-ticket__barcode">${ticket.barcode}</div>
          <div class="digital-ticket__barcode-label">Scan at turnstile</div>
        </div>

        <!-- Gate Status -->
        <div class="vf-panel">
          <div class="vf-panel__header"><span class="vf-panel__icon">🚪</span><span class="vf-panel__title">Gate Status (Live)</span></div>
          <div class="gate-grid">${Object.entries(gates).map(([gateId, gt]) => {
            const gn = gateId.replace('gate-', 'Gate ').toUpperCase();
            const sc = gt.status === 'optimal' ? 'green' : gt.status === 'normal' ? 'yellow' : 'red';
            const isAssigned = ticket.gate.toLowerCase().replace(' ', '-') === gateId;
            return `<div class="gate-card ${isAssigned ? 'gate-card--assigned' : ''}"><div class="gate-card__header"><span class="gate-card__name">${gn}</span>${isAssigned ? '<span class="badge badge--blue" style="font-size:7px">YOUR GATE</span>' : ''}</div><div class="gate-card__metrics"><div class="gate-card__metric"><div class="gate-card__metric-value" style="color:var(--color-${sc})">${gt.waitMin}</div><div class="gate-card__metric-label">min</div></div><div class="gate-card__metric"><div class="gate-card__metric-value">${gt.queueLength}</div><div class="gate-card__metric-label">queue</div></div><div class="gate-card__metric"><div class="gate-card__metric-value">${gt.throughput}</div><div class="gate-card__metric-label">ppl/m</div></div></div><div class="progress-bar" style="margin-top:4px"><div class="progress-bar__fill" style="width:${Math.min(100, gt.queueLength / 1.2)}%;background:var(--color-${sc})"></div></div></div>`;
          }).join('')}</div>
        </div>

        <!-- Exit Waves -->
        <div class="vf-panel">
          <div class="vf-panel__header"><span class="vf-panel__icon">🚶</span><span class="vf-panel__title">Staggered Exit</span><span class="vf-panel__badge" style="color:var(--color-green)">Your: ${exit.wave}</span></div>
          ${data.exitWindows.map(w => {
            const isUser = w.id === exit.waveId;
            const fp = Math.round((w.assigned / w.capacity) * 100);
            return `<div class="exit-wave ${isUser ? 'exit-wave--active' : ''}"><div class="exit-wave__header"><div><div class="exit-wave__label">${w.label}</div><div class="exit-wave__sections">${w.sections}</div></div><div class="exit-wave__time"><div class="exit-wave__depart">${w.departureDisplay}</div><div class="exit-wave__gate">${w.recommendedGate}</div></div></div><div class="progress-bar" style="margin-top:4px"><div class="progress-bar__fill" style="width:${fp}%;background:var(--color-${w.color})"></div></div>${isUser ? '<div class="exit-wave__you">← You are here</div>' : ''}</div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  // =====================================================
  //  Canvas Rendering
  // =====================================================
  function renderCanvases(data) {
    const mapCanvas = document.getElementById('att-main-heatmap');
    if (mapCanvas) {
      HeatmapRenderer.render(mapCanvas, data, { showLabels: true, showUserPosition: true, compact: false, showPitch: true });
      if (activeRoute) HeatmapRenderer.renderRoute(mapCanvas, activeRoute, VenueData.getNavGraph());
    }
    const arCanvas = document.getElementById('att-ar-canvas');
    if (arCanvas && activePanel === 'ar') HeatmapRenderer.renderAROverlay(arCanvas, data.arOverlay);
  }

  function startNavAnimation() {
    if (navAnimFrame) cancelAnimationFrame(navAnimFrame);
    function loop() {
      if (activePanel !== 'navigation') return;
      if (activeRoute) {
        const c = document.getElementById('att-main-heatmap');
        if (c) { const d = VenueData.getSnapshot(); HeatmapRenderer.render(c, d, { showLabels: true, showUserPosition: true, compact: false, showPitch: true }); HeatmapRenderer.renderRoute(c, activeRoute, VenueData.getNavGraph()); }
      }
      navAnimFrame = requestAnimationFrame(loop);
    }
    loop();
  }

  function startARAnimation() {
    if (arAnimFrame) cancelAnimationFrame(arAnimFrame);
    function loop() {
      if (activePanel !== 'ar') return;
      const c = document.getElementById('att-ar-canvas');
      if (c) HeatmapRenderer.renderAROverlay(c, VenueData.getAROverlayData());
      arAnimFrame = requestAnimationFrame(loop);
    }
    loop();
  }

  // =====================================================
  //  Update (called by data tick)
  // =====================================================
  function update(data) {
    if (!container) return;
    // Broadcast
    const bcText = document.getElementById('vf-broadcast-text');
    if (bcText) bcText.textContent = data.broadcasts[0]?.text || '';
    // SDE
    const sde = document.getElementById('sde-grid');
    if (sde) sde.innerHTML = renderSmartDecisions(data);
    // Match
    const mc = document.getElementById('vf-match-card');
    if (mc) mc.innerHTML = renderMatchCard(data);
    // Squad
    const sr = document.getElementById('vf-squad-radar');
    if (sr) sr.innerHTML = renderSquadRadar(data);
    // Momentum
    const mm = document.getElementById('vf-momentum');
    if (mm) mm.innerHTML = renderMomentum(data);
    // Chat
    const chat = document.getElementById('vf-chat');
    if (chat) { chat.innerHTML = renderCaptainChat(data); }
    // Pickup
    updatePickupBanner(data);
    // Active panel
    if (activePanel === 'navigation') renderCanvases(data);
    else if (activePanel === 'queues') refreshPanel('queues');
    else if (activePanel === 'ticket') refreshPanel('ticket');
    // Update squad + momentum
    VenueData.updateSquadPositions();
    VenueData.updateMatchMomentum();
  }

  function destroy() {
    if (arAnimFrame) cancelAnimationFrame(arAnimFrame);
    if (navAnimFrame) cancelAnimationFrame(navAnimFrame);
  }

  return { init, update, destroy };
})();
