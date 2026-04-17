/* ============================================================
   VenueFlow — Attendee View Controller (Enhanced)
   Virtual Queuing · Click-and-Collect · Express Lanes
   Predictive Wayfinding · AR Overlays · Smart Ingress/Egress
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

  function init(el) {
    container = el;
    initialized = false;
    render();
  }

  function render() {
    if (!container) return;
    const data = VenueData.getSnapshot();

    container.innerHTML = `
      <div class="attendee-view" id="att-root">
        <!-- Pickup Banner (if any order is ready) -->
        <div id="att-pickup-banner"></div>

        <!-- Match Header -->
        <div id="att-match-header">${renderMatchHeader(data)}</div>

        <!-- Tab Contents -->
        <div id="att-tab-home" class="tab-content tab-content--active">
          <div id="att-home-content">${renderHomeTab(data)}</div>
        </div>
        <div id="att-tab-navigate" class="tab-content">
          <div id="att-navigate-content">${renderNavigateTab(data)}</div>
        </div>
        <div id="att-tab-food" class="tab-content">
          <div id="att-food-content">${renderFoodTab(data)}</div>
        </div>
        <div id="att-tab-services" class="tab-content">
          <div id="att-services-content">${renderServicesTab(data)}</div>
        </div>
        <div id="att-tab-ar" class="tab-content">
          <div id="att-ar-content">${renderARTab(data)}</div>
        </div>
        <div id="att-tab-ticket" class="tab-content">
          <div id="att-ticket-content">${renderTicketTab(data)}</div>
        </div>
        <div id="att-tab-alerts" class="tab-content">
          <div id="att-alerts-content">${renderAlertsTab(data)}</div>
        </div>

        <!-- Bottom Navigation -->
        <nav class="bottom-nav" id="att-bottom-nav">
          <button class="bottom-nav__item bottom-nav__item--active" data-tab="home">
            <span class="bottom-nav__icon">🏠</span>Home
          </button>
          <button class="bottom-nav__item" data-tab="navigate">
            <span class="bottom-nav__icon">🧭</span>Navigate
          </button>
          <button class="bottom-nav__item" data-tab="food">
            <span class="bottom-nav__icon">🍔</span>Order
          </button>
          <button class="bottom-nav__item" data-tab="ar">
            <span class="bottom-nav__icon">📡</span>AR View
          </button>
          <button class="bottom-nav__item" data-tab="ticket">
            <span class="bottom-nav__icon">🎫</span>Ticket
          </button>
          <button class="bottom-nav__item" data-tab="alerts">
            <span class="bottom-nav__icon">🔔</span>Alerts
          </button>
        </nav>
      </div>
    `;

    if (!initialized) {
      bindDelegatedEvents();
      initialized = true;
    }

    updatePickupBanner(data);
    renderCanvases(data);
  }

  // --- Event Delegation ---
  function bindDelegatedEvents() {
    container.addEventListener('click', (e) => {
      const navBtn = e.target.closest('[data-tab]');
      if (navBtn) { e.preventDefault(); switchTab(navBtn.dataset.tab); return; }

      const switchLink = e.target.closest('[data-switch-tab]');
      if (switchLink) { e.preventDefault(); switchTab(switchLink.dataset.switchTab); return; }

      const filterBtn = e.target.closest('[data-food-filter]');
      if (filterBtn) {
        e.preventDefault();
        foodFilter = filterBtn.dataset.foodFilter;
        const el = document.getElementById('att-food-content');
        if (el) el.innerHTML = renderFoodTab(VenueData.getSnapshot());
        return;
      }

      const orderBtn = e.target.closest('[data-order-item]');
      if (orderBtn) {
        e.preventDefault();
        VenueData.placeOrder(orderBtn.dataset.orderItem);
        orderBtn.textContent = '✓ Ordered';
        orderBtn.disabled = true;
        orderBtn.style.opacity = '0.5';
        setTimeout(() => {
          const el = document.getElementById('att-food-content');
          if (el) el.innerHTML = renderFoodTab(VenueData.getSnapshot());
        }, 500);
        return;
      }

      // Restroom queue join
      const queueBtn = e.target.closest('[data-join-queue]');
      if (queueBtn) {
        e.preventDefault();
        VenueData.joinRestroomQueue(queueBtn.dataset.joinQueue);
        refreshServices();
        return;
      }

      // Leave restroom queue
      const leaveBtn = e.target.closest('[data-leave-queue]');
      if (leaveBtn) {
        e.preventDefault();
        VenueData.leaveRestroomQueue(leaveBtn.dataset.leaveQueue);
        refreshServices();
        return;
      }

      // Express lane selection
      const laneBtn = e.target.closest('[data-select-lane]');
      if (laneBtn) {
        e.preventDefault();
        selectedExpressLane = laneBtn.dataset.selectLane;
        refreshServices();
        return;
      }

      // Book express slot
      const slotBtn = e.target.closest('[data-book-slot]');
      if (slotBtn) {
        e.preventDefault();
        const [laneId, slotId] = slotBtn.dataset.bookSlot.split('|');
        VenueData.bookExpressSlot(laneId, slotId);
        slotBtn.textContent = '✓ Booked';
        slotBtn.disabled = true;
        slotBtn.classList.add('slot-btn--booked');
        setTimeout(() => refreshServices(), 500);
        return;
      }

      // Dismiss pickup notification
      const dismissBtn = e.target.closest('[data-dismiss-pickup]');
      if (dismissBtn) {
        e.preventDefault();
        VenueData.dismissPickupNotification(dismissBtn.dataset.dismissPickup);
        updatePickupBanner(VenueData.getSnapshot());
        return;
      }

      // Wayfinding destination selection
      const destBtn = e.target.closest('[data-wayfind-dest]');
      if (destBtn) {
        e.preventDefault();
        selectedWayfindingDest = destBtn.dataset.wayfindDest;
        activeRoute = VenueData.findFastestRoute('user-seat', selectedWayfindingDest);
        refreshNavigate();
        return;
      }

      // Concession queue join
      const cqJoinBtn = e.target.closest('[data-join-concession-queue]');
      if (cqJoinBtn) {
        e.preventDefault();
        VenueData.joinConcessionQueue(cqJoinBtn.dataset.joinConcessionQueue);
        cqJoinBtn.textContent = '✓ Queued';
        cqJoinBtn.disabled = true;
        setTimeout(() => {
          const el = document.getElementById('att-food-content');
          if (el) el.innerHTML = renderFoodTab(VenueData.getSnapshot());
        }, 500);
        return;
      }

      // Leave concession queue
      const cqLeaveBtn = e.target.closest('[data-leave-concession-queue]');
      if (cqLeaveBtn) {
        e.preventDefault();
        VenueData.leaveConcessionQueue(cqLeaveBtn.dataset.leaveConcessionQueue);
        const el = document.getElementById('att-food-content');
        if (el) el.innerHTML = renderFoodTab(VenueData.getSnapshot());
        return;
      }
    });
  }

  function refreshServices() {
    const el = document.getElementById('att-services-content');
    if (el) el.innerHTML = renderServicesTab(VenueData.getSnapshot());
  }

  function refreshNavigate() {
    const el = document.getElementById('att-navigate-content');
    if (el) {
      el.innerHTML = renderNavigateTab(VenueData.getSnapshot());
      setTimeout(() => renderNavigateCanvases(VenueData.getSnapshot()), 100);
    }
  }

  // =====================================================
  //  Pickup Notification Banner
  // =====================================================

  function updatePickupBanner(data) {
    const banner = document.getElementById('att-pickup-banner');
    if (!banner) return;
    const readyNotifs = (data.pickupNotifications || []).filter(p => !p.dismissed);
    // Also show approaching concession queue alerts
    const approachingQueues = (data.concessionQueues || []).filter(q => q.status === 'approaching');

    const bannerItems = [];

    readyNotifs.forEach(n => {
      bannerItems.push(`
        <div class="pickup-banner">
          <div class="pickup-banner__pulse"></div>
          <div class="pickup-banner__content">
            <div class="pickup-banner__title">${n.title}</div>
            <div class="pickup-banner__desc">${n.desc}</div>
          </div>
          <button class="pickup-banner__dismiss" data-dismiss-pickup="${n.id}">✕</button>
        </div>
      `);
    });

    approachingQueues.forEach(q => {
      bannerItems.push(`
        <div class="pickup-banner" style="border-color: rgba(234, 179, 8, 0.4); background: linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(234, 179, 8, 0.05));">
          <div class="pickup-banner__pulse" style="background: var(--color-accent-amber); box-shadow: 0 0 12px rgba(234, 179, 8, 0.5);"></div>
          <div class="pickup-banner__content">
            <div class="pickup-banner__title" style="color: var(--color-accent-amber);">⏰ Head to ${q.concessionName} now!</div>
            <div class="pickup-banner__desc">~2 min until your turn · ${q.location}</div>
          </div>
        </div>
      `);
    });

    banner.innerHTML = bannerItems.join('');
  }

  // =====================================================
  //  Match Header
  // =====================================================

  function renderMatchHeader(data) {
    const m = data.match;
    const statusLabel = m.status === 'LIVE' ? `${m.minute}'` :
                        m.status === 'HALFTIME' ? 'HT' :
                        m.status === 'SECOND_HALF' ? `${m.minute}'` :
                        m.status === 'FULL_TIME' ? 'FT' : 'Pre-Game';
    const weatherIcon = m.weather.icon || '☀️';

    return `
      <div class="match-header glass-card">
        <div class="match-header__venue">
          <span class="match-header__venue-name">📍 ${m.venue}</span>
          ${m.status !== 'FULL_TIME' && m.status !== 'PRE_GAME' ? `
            <span class="match-header__live"><span class="live-dot"></span> LIVE</span>
          ` : `<span class="badge badge--blue">${m.status === 'FULL_TIME' ? 'FULL TIME' : 'PRE-GAME'}</span>`}
        </div>
        <div class="match-header__teams">
          <div class="match-header__team">
            <div class="match-header__team-logo match-header__team-logo--home">⚡</div>
            <div class="match-header__team-name">${m.homeTeam}</div>
          </div>
          <div class="match-header__score">
            <span class="match-header__score-num">${m.homeScore}</span>
            <span class="match-header__score-dash">:</span>
            <span class="match-header__score-num">${m.awayScore}</span>
          </div>
          <div class="match-header__team">
            <div class="match-header__team-logo match-header__team-logo--away">🔥</div>
            <div class="match-header__team-name">${m.awayTeam}</div>
          </div>
        </div>
        <div class="match-header__minute">${statusLabel}</div>
        <div class="match-header__weather">
          <span>${weatherIcon} ${m.weather.temp}°C</span>
          <span>💧 ${m.weather.humidity}%</span>
          <span>💨 ${m.weather.wind} km/h</span>
          <span>👥 ${(m.attendance).toLocaleString()} / ${(m.capacity).toLocaleString()}</span>
        </div>
      </div>
    `;
  }

  // =====================================================
  //  Home Tab
  // =====================================================

  function renderHomeTab(data) {
    const bestFood = [...data.concessions].filter(c => c.type === 'food').sort((a, b) => a.waitTime - b.waitTime)[0];
    const bestRestroom = data.nearestRestrooms[0];
    const topItems = [...data.concessions, ...data.restrooms].sort((a, b) => a.waitTime - b.waitTime).slice(0, 6);

    return `
      <!-- Smart Suggestion -->
      <div class="smart-suggestion">
        <div class="smart-suggestion__icon">🧠</div>
        <div class="smart-suggestion__text">
          <div class="smart-suggestion__title">AI Recommendation</div>
          <div class="smart-suggestion__desc">
            ${bestFood.name} has only a <strong>${bestFood.waitTime} min</strong> wait right now.
            ${bestRestroom && bestRestroom.waitTime <= 3 ? `${bestRestroom.name} is nearly empty!` : ''}
          </div>
        </div>
      </div>

      <!-- Active Orders (Click-and-Collect) -->
      ${data.activeOrders.filter(o => o.status !== 'picked_up').length > 0 ? `
        <div class="section-header">
          <div class="section-header__title">📦 Your Orders</div>
          <span class="badge badge--green">${data.activeOrders.filter(o => o.status !== 'picked_up').length} active</span>
        </div>
        ${data.activeOrders.filter(o => o.status !== 'picked_up').map(o => renderOrderTimeline(o)).join('')}
      ` : ''}

      <!-- Active Concession Queues -->
      ${(data.concessionQueues || []).filter(q => q.status !== 'served' && q.status !== 'completed').length > 0 ? `
        <div class="section-header">
          <div class="section-header__title">🍔 Virtual Queue</div>
          <span class="badge badge--amber">Active</span>
        </div>
        ${data.concessionQueues.filter(q => q.status !== 'served' && q.status !== 'completed').map(q => renderConcessionQueueCard(q)).join('')}
      ` : ''}

      <!-- Active Restroom Queue / Reservation -->
      ${data.restroomQueues.filter(q => q.status !== 'completed').length > 0 ? `
        <div class="section-header">
          <div class="section-header__title">🚻 Your Queue Position</div>
        </div>
        ${data.restroomQueues.filter(q => q.status !== 'completed').map(q => renderQueuePosition(q)).join('')}
      ` : ''}

      ${data.expressReservations.filter(r => r.status === 'confirmed').length > 0 ? `
        <div class="section-header">
          <div class="section-header__title">🎟️ Express Lane Reservations</div>
        </div>
        ${data.expressReservations.filter(r => r.status === 'confirmed').map(r => renderReservationCard(r)).join('')}
      ` : ''}

      <!-- Venue Overview -->
      <div class="section-header">
        <div class="section-header__title">🗺️ Venue Overview</div>
        <span class="section-header__action" data-switch-tab="navigate">Navigate →</span>
      </div>
      <div class="venue-map-container">
        <canvas class="venue-map-canvas" id="att-home-heatmap"></canvas>
        <div class="venue-map__info">
          <span class="venue-map__seat">📍 ${data.userPosition.seat}</span>
          <span class="venue-map__capacity">${Math.round(data.match.attendance / data.match.capacity * 100)}% capacity</span>
        </div>
      </div>

      <!-- Wait Times -->
      <div class="section-header">
        <div class="section-header__title">⏱️ Wait Times</div>
        <span class="section-header__action">Shortest first</span>
      </div>
      <div class="wait-grid stagger">
        ${topItems.map(item => renderWaitCard(item)).join('')}
      </div>
    `;
  }

  // =====================================================
  //  FEATURE 1: Navigate Tab (Predictive Wayfinding)
  // =====================================================

  function renderNavigateTab(data) {
    const destinations = VenueData.getWayfindingDestinations();
    const grouped = {
      gate: destinations.filter(d => d.type === 'gate'),
      food: destinations.filter(d => d.type === 'food' || d.type === 'drink'),
      restroom: destinations.filter(d => d.type === 'restroom'),
      other: destinations.filter(d => ['parking', 'transit', 'concourse', 'junction'].includes(d.type)),
    };

    return `
      <div class="section-header">
        <div class="section-header__title">🧭 Seat-to-Street Navigation</div>
        <span class="badge badge--blue"><span class="live-dot" style="width:6px;height:6px;margin-right:4px"></span> Crowd-aware</span>
      </div>
      <div class="smart-suggestion" style="margin-bottom:16px">
        <div class="smart-suggestion__icon">🧠</div>
        <div class="smart-suggestion__text">
          <div class="smart-suggestion__title">Predictive Wayfinding</div>
          <div class="smart-suggestion__desc">Routes are computed using Dijkstra's algorithm weighted by <strong>live crowd density</strong>. The fastest path may differ from the shortest!</div>
        </div>
      </div>

      ${activeRoute ? renderActiveRoute(activeRoute) : ''}

      <!-- Route Map -->
      <div class="venue-map-container" style="margin-bottom:16px">
        <canvas class="venue-map-canvas" id="att-wayfinding-map" style="height:320px"></canvas>
        <div class="venue-map__info">
          <span class="venue-map__seat">📍 ${data.userPosition.seat}</span>
          <span class="venue-map__capacity">${selectedWayfindingDest ? 'Route shown on map' : 'Select a destination below'}</span>
        </div>
      </div>

      <!-- Exits -->
      <div class="section-header"><div class="section-header__title">🚪 Exits & Gates</div></div>
      ${grouped.gate.map(d => renderDestinationCard(d)).join('')}

      <!-- Food & Drink -->
      <div class="section-header"><div class="section-header__title">🍽️ Food & Drink</div></div>
      ${grouped.food.map(d => renderDestinationCard(d)).join('')}

      <!-- Restrooms -->
      <div class="section-header"><div class="section-header__title">🚻 Restrooms</div></div>
      ${grouped.restroom.map(d => renderDestinationCard(d)).join('')}

      <!-- Other -->
      <div class="section-header"><div class="section-header__title">📍 Other Destinations</div></div>
      ${grouped.other.filter(d => d.type !== 'junction').map(d => renderDestinationCard(d)).join('')}
    `;
  }

  function renderDestinationCard(dest) {
    const r = dest.route;
    const sr = dest.shortestRoute;
    const isSelected = selectedWayfindingDest === dest.id;
    const timeSaved = sr && r ? sr.totalMin - r.totalWalkMin : 0;

    return `
      <div class="route-card ${isSelected ? 'route-card--selected' : ''}" data-wayfind-dest="${dest.id}" style="cursor:pointer; ${isSelected ? 'border-color: var(--color-accent-blue); box-shadow: var(--shadow-glow-blue);' : ''}">
        <div class="route-card__icon">${dest.icon}</div>
        <div class="route-card__info">
          <div class="route-card__name">${dest.label}</div>
          <div class="route-card__details">
            <span>Fastest: ${r ? r.totalWalkMin : '?'} min</span>
            ${timeSaved > 0 ? `<span style="color:var(--color-green)">Saves ${timeSaved} min vs shortest</span>` : ''}
          </div>
          ${r ? `<div style="display:flex;gap:4px;margin-top:4px;">
            ${r.segments.map(s => `<span class="crowd-dot crowd-dot--${s.crowdColor}" title="${s.crowdLabel} crowd"></span>`).join('')}
          </div>` : ''}
        </div>
        <div style="text-align:right">
          <span class="route-card__time" style="color: ${r && r.maxCrowdLevel > 2.2 ? 'var(--color-red)' : r && r.maxCrowdLevel > 1.5 ? 'var(--color-yellow)' : 'var(--color-green)'}">${r ? r.totalWalkMin : '?'}</span>
          <div class="route-card__time-unit">min</div>
        </div>
      </div>
    `;
  }

  function renderActiveRoute(route) {
    if (!route) return '';
    const navGraph = VenueData.getNavGraph();
    return `
      <div class="active-route-card">
        <div class="active-route-card__header">
          <div>
            <div class="active-route-card__title">📍 → ${route.destinationNode.icon} ${route.destinationNode.label}</div>
            <div class="active-route-card__subtitle">Crowd-optimized route</div>
          </div>
          <div class="active-route-card__time">${route.totalWalkMin}<span style="font-size:var(--text-xs);font-weight:500"> min</span></div>
        </div>
        <div class="active-route-card__segments">
          ${route.segments.map((s, i) => `
            <div class="route-segment">
              <div class="route-segment__dot route-segment__dot--${s.crowdColor}"></div>
              <div class="route-segment__info">
                <span class="route-segment__from">${navGraph.nodes[s.from]?.label || s.from}</span>
                <span class="route-segment__arrow">→</span>
                <span class="route-segment__to">${navGraph.nodes[s.to]?.label || s.to}</span>
              </div>
              <div class="route-segment__meta">
                <span class="route-segment__walk">${s.walkMin} min</span>
                <span class="crowd-badge crowd-badge--${s.crowdColor}">${s.crowdLabel}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // =====================================================
  //  Food Tab (with Virtual Concession Queuing)
  // =====================================================

  function renderFoodTab(data) {
    const filtered = foodFilter === 'all' ? data.foodMenu :
                     data.foodMenu.filter(item => item.category === foodFilter);

    // Active concession queues
    const activeQueues = (data.concessionQueues || []).filter(q => q.status !== 'served' && q.status !== 'completed');

    return `
      <div class="section-header">
        <div class="section-header__title">🍽️ Click & Collect</div>
        <span class="badge badge--blue">Order from your seat</span>
      </div>

      <!-- Virtual Queue Banner -->
      <div class="smart-suggestion" style="margin-bottom:16px; border-color: rgba(168, 85, 247, 0.3); background: linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(168, 85, 247, 0.02));">
        <div class="smart-suggestion__icon">⏰</div>
        <div class="smart-suggestion__text">
          <div class="smart-suggestion__title" style="color:var(--color-accent-purple)">Virtual Queuing Available</div>
          <div class="smart-suggestion__desc">Join the line from your seat! We'll send a <strong>2-minute alert</strong> before it's your turn — no standing required.</div>
        </div>
      </div>

      <!-- Active Concession Queues -->
      ${activeQueues.length > 0 ? `
        <div class="section-header">
          <div class="section-header__title">📋 Your Virtual Queues</div>
          <span class="badge badge--amber">${activeQueues.length} active</span>
        </div>
        ${activeQueues.map(q => renderConcessionQueueCard(q)).join('')}
      ` : ''}

      <!-- Queue for popular stands -->
      <div class="section-header">
        <div class="section-header__title">🏪 Join a Queue</div>
      </div>
      <div class="concession-queue-grid">
        ${data.concessions.filter(c => c.type === 'food').map(stand => {
          const inQueue = activeQueues.find(q => q.concessionId === stand.id);
          const statusColor = stand.waitTime <= 5 ? 'green' : stand.waitTime <= 10 ? 'yellow' : stand.waitTime <= 15 ? 'orange' : 'red';
          return `
            <div class="concession-queue-item">
              <span style="font-size:24px">${stand.icon}</span>
              <div class="concession-queue-item__info">
                <div class="concession-queue-item__name">${stand.name}</div>
                <div class="concession-queue-item__wait">
                  <span class="food-item__wait-dot food-item__wait-dot--${statusColor}"></span>
                  ${stand.waitTime} min wait
                </div>
              </div>
              ${inQueue ? `
                <button class="btn btn-sm btn-secondary" data-leave-concession-queue="${inQueue.id}">Leave</button>
              ` : `
                <button class="btn btn-sm btn-primary" data-join-concession-queue="${stand.id}" style="font-size:10px">Join Queue</button>
              `}
            </div>
          `;
        }).join('')}
      </div>

      <div class="food-tabs" style="margin-top:20px">
        <button class="food-tab ${foodFilter === 'all' ? 'food-tab--active' : ''}" data-food-filter="all">All</button>
        <button class="food-tab ${foodFilter === 'food' ? 'food-tab--active' : ''}" data-food-filter="food">🍔 Food</button>
        <button class="food-tab ${foodFilter === 'drink' ? 'food-tab--active' : ''}" data-food-filter="drink">🍺 Drinks</button>
      </div>

      ${filtered.map(item => {
        const stand = data.concessions.find(c => c.name === item.stand);
        const standWait = stand ? stand.waitTime : item.prepTime;
        return `
          <div class="food-item">
            <span class="food-item__icon">${item.icon}</span>
            <div class="food-item__info">
              <div class="food-item__name">${item.name}</div>
              <div class="food-item__stand">${item.stand} · ~${item.prepTime} min prep</div>
              ${stand ? `<div class="food-item__wait-indicator">
                <span class="food-item__wait-dot food-item__wait-dot--${standWait <= 5 ? 'green' : standWait <= 10 ? 'yellow' : 'red'}"></span>
                ${standWait} min queue
              </div>` : ''}
            </div>
            <div class="food-item__right">
              <div class="food-item__price">$${item.price.toFixed(2)}</div>
              <button class="food-item__btn" data-order-item="${item.id}">Order</button>
            </div>
          </div>
        `;
      }).join('')}

      <!-- Active Orders -->
      ${data.activeOrders.length > 0 ? `
        <div class="section-header" style="margin-top: 24px">
          <div class="section-header__title">📦 Order Tracking</div>
        </div>
        ${data.activeOrders.filter(o => o.status !== 'picked_up').map(o => renderOrderTimeline(o)).join('')}
      ` : ''}
    `;
  }

  // =====================================================
  //  Services Tab (Restrooms + Express Lanes)
  // =====================================================

  function renderServicesTab(data) {
    return `
      <!-- Virtual Bathroom Queue -->
      <div class="section-header">
        <div class="section-header__title">🚻 Virtual Restroom Queue</div>
        <span class="badge badge--blue">Sensor-powered</span>
      </div>

      <!-- AI Restroom Recommendation -->
      ${data.nearestRestrooms.length > 0 ? `
        <div class="smart-suggestion" style="margin-bottom: 16px">
          <div class="smart-suggestion__icon">🧠</div>
          <div class="smart-suggestion__text">
            <div class="smart-suggestion__title">Recommended: ${data.nearestRestrooms[0].name}</div>
            <div class="smart-suggestion__desc">
              Only <strong>${data.nearestRestrooms[0].waitTime} min</strong> wait · ${data.nearestRestrooms[0].walkMins} min walk · ${data.nearestRestrooms[0].queueLength} in queue
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Active Queue Position -->
      ${data.restroomQueues.filter(q => q.status !== 'completed').length > 0 ? `
        ${data.restroomQueues.filter(q => q.status !== 'completed').map(q => renderQueuePosition(q)).join('')}
      ` : ''}

      <!-- Restroom Cards with Sensor Data -->
      <div class="restroom-grid">
        ${data.restrooms.map(r => {
          const occupancyPct = Math.round((r.occupiedStalls / r.totalStalls) * 100);
          const statusColor = r.waitTime <= 3 ? 'green' : r.waitTime <= 6 ? 'yellow' : r.waitTime <= 10 ? 'orange' : 'red';
          const inQueue = data.restroomQueues.find(q => q.restroomId === r.id && q.status !== 'completed');
          const nearest = data.nearestRestrooms.find(nr => nr.id === r.id);
          const walkMins = nearest ? nearest.walkMins : '?';

          return `
            <div class="restroom-card restroom-card--${statusColor}">
              <div class="restroom-card__header">
                <div class="restroom-card__name">${r.name}</div>
                <span class="restroom-card__sensor-badge">
                  <span class="restroom-card__sensor-dot"></span> Live
                </span>
              </div>
              <div class="restroom-card__zone">${r.zone.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · ${walkMins} min walk</div>

              <div class="restroom-card__metrics">
                <div class="restroom-card__metric">
                  <div class="restroom-card__metric-value restroom-card__metric-value--${statusColor}">${r.waitTime}</div>
                  <div class="restroom-card__metric-label">min wait</div>
                </div>
                <div class="restroom-card__metric">
                  <div class="restroom-card__metric-value">${r.queueLength}</div>
                  <div class="restroom-card__metric-label">in queue</div>
                </div>
                <div class="restroom-card__metric">
                  <div class="restroom-card__metric-value">${r.occupiedStalls}/${r.totalStalls}</div>
                  <div class="restroom-card__metric-label">stalls</div>
                </div>
              </div>

              <div class="restroom-card__stalls">
                ${Array.from({length: r.totalStalls}, (_, i) => `
                  <div class="stall-dot ${i < r.occupiedStalls ? 'stall-dot--occupied' : 'stall-dot--free'}"></div>
                `).join('')}
              </div>

              <div class="progress-bar" style="margin-top:8px">
                <div class="progress-bar__fill" style="width:${occupancyPct}%; background: var(--color-${statusColor})"></div>
              </div>

              ${inQueue ? `
                <button class="btn btn-sm btn-secondary" style="width:100%;margin-top:8px" data-leave-queue="${inQueue.id}">Leave Queue</button>
              ` : `
                <button class="btn btn-sm btn-primary" style="width:100%;margin-top:8px" data-join-queue="${r.id}">
                  Join Virtual Queue
                </button>
              `}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Express Lane Reservations -->
      <div class="section-header" style="margin-top: 24px">
        <div class="section-header__title">🎟️ Express Lane Reservations</div>
        <span class="badge badge--purple">Skip the queue</span>
      </div>
      <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:12px">
        Book a time slot at high-traffic areas to skip the queue.
      </p>

      <!-- Active Reservations -->
      ${data.expressReservations.filter(r => r.status === 'confirmed').length > 0 ? `
        ${data.expressReservations.filter(r => r.status === 'confirmed').map(r => renderReservationCard(r)).join('')}
      ` : ''}

      <!-- Express Lane Cards -->
      ${data.expressLanes.map(lane => {
        const isSelected = selectedExpressLane === lane.id;
        return `
          <div class="express-card ${isSelected ? 'express-card--expanded' : ''}">
            <div class="express-card__header" data-select-lane="${lane.id}">
              <span class="express-card__icon">${lane.icon}</span>
              <div class="express-card__info">
                <div class="express-card__name">${lane.name}</div>
                <div class="express-card__location">${lane.location} · ${lane.currentQueue} in queue · ~${lane.currentWait} min wait</div>
              </div>
              <span class="express-card__arrow">${isSelected ? '▲' : '▼'}</span>
            </div>
            ${isSelected ? `
              <div class="express-card__slots">
                <div class="express-card__slots-title">Available time slots:</div>
                <div class="slot-grid">
                  ${lane.slots.map(slot => `
                    <button class="slot-btn ${slot.spotsAvailable <= 0 ? 'slot-btn--full' : slot.spotsAvailable <= 2 ? 'slot-btn--low' : ''}"
                            ${slot.spotsAvailable <= 0 ? 'disabled' : ''}
                            data-book-slot="${lane.id}|${slot.id}">
                      <div class="slot-btn__time">${slot.displayTime}</div>
                      <div class="slot-btn__spots">${slot.spotsAvailable > 0 ? `${slot.spotsAvailable} spots` : 'Full'}</div>
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    `;
  }

  // =====================================================
  //  FEATURE 3: AR Safety Overlays Tab
  // =====================================================

  function renderARTab(data) {
    const ar = data.arOverlay;
    return `
      <div class="section-header">
        <div class="section-header__title">📡 AR Safety View</div>
        <span class="badge badge--blue"><span class="live-dot" style="width:6px;height:6px;margin-right:4px"></span> Live</span>
      </div>

      <div class="smart-suggestion" style="margin-bottom:16px; border-color: rgba(0, 212, 255, 0.3);">
        <div class="smart-suggestion__icon">📱</div>
        <div class="smart-suggestion__text">
          <div class="smart-suggestion__title">Augmented Reality View</div>
          <div class="smart-suggestion__desc">See <strong>live traffic levels</strong>, locate friends, and find emergency exits overlaid on the venue map.</div>
        </div>
      </div>

      <!-- AR Canvas -->
      <div class="ar-viewport">
        <canvas class="ar-canvas" id="att-ar-canvas"></canvas>
        <div class="ar-viewport__badge">
          <span class="live-dot" style="width:5px;height:5px;margin-right:4px"></span> AR LIVE
        </div>
      </div>

      <!-- Safety Quick-Access -->
      <div class="section-header"><div class="section-header__title">🆘 Safety Quick-Access</div></div>
      <div class="safety-grid">
        ${ar.safetyAlerts.map(alert => `
          <div class="safety-card">
            <span class="safety-card__icon">${alert.icon}</span>
            <div class="safety-card__info">
              <div class="safety-card__label">${alert.label}</div>
              <div class="safety-card__direction">${alert.direction}</div>
            </div>
            <span class="safety-card__distance">${alert.distance}</span>
          </div>
        `).join('')}
      </div>

      <!-- Friends Nearby -->
      <div class="section-header"><div class="section-header__title">👥 Friends in Venue</div></div>
      <div class="friends-list">
        ${ar.friends.map(f => `
          <div class="friend-card">
            <div class="friend-card__avatar">${f.emoji}</div>
            <div class="friend-card__info">
              <div class="friend-card__name">${f.name}</div>
              <div class="friend-card__location">${f.section} · ${f.seat}</div>
            </div>
            <div class="friend-card__distance">
              <span class="friend-card__distance-num">${f.distance}m</span>
              <span class="friend-card__status friend-card__status--${f.status}">${f.status.replace(/-/g, ' ')}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Traffic Overview -->
      <div class="section-header"><div class="section-header__title">🚦 Concourse Traffic</div></div>
      ${ar.trafficZones.map(tz => {
        const statusColor = tz.level === 'high' ? 'red' : tz.level === 'moderate' ? 'yellow' : 'green';
        return `
          <div class="traffic-card traffic-card--${statusColor}">
            <div class="traffic-card__header">
              <span class="traffic-card__name">${tz.area}</span>
              <span class="badge badge--${statusColor}">${Math.round(tz.occupancy * 100)}%</span>
            </div>
            <div class="progress-bar" style="margin-top:6px">
              <div class="progress-bar__fill" style="width:${Math.round(tz.occupancy * 100)}%; background: var(--color-${statusColor})"></div>
            </div>
            <div class="traffic-card__tip">${tz.tips}</div>
          </div>
        `;
      }).join('')}
    `;
  }

  // =====================================================
  //  FEATURE 4: Smart Ingress/Egress (Ticket Tab)
  // =====================================================

  function renderTicketTab(data) {
    const ticket = data.digitalTicket;
    const exit = data.userExitAssignment;
    const gates = data.gateThroughput;

    return `
      <div class="section-header">
        <div class="section-header__title">🎫 Digital Ticket</div>
        <span class="badge badge--green">✓ ${ticket.scanStatus}</span>
      </div>

      <!-- Digital Ticket Card -->
      <div class="digital-ticket">
        <div class="digital-ticket__header">
          <div class="digital-ticket__event">
            <div class="digital-ticket__event-name">⚡ ${data.match.homeTeam} vs ${data.match.awayTeam}</div>
            <div class="digital-ticket__venue">📍 ${data.match.venue}</div>
          </div>
          <div class="digital-ticket__id">${ticket.id}</div>
        </div>
        <div class="digital-ticket__details">
          <div class="digital-ticket__detail">
            <span class="digital-ticket__detail-label">Section</span>
            <span class="digital-ticket__detail-value">${ticket.section}</span>
          </div>
          <div class="digital-ticket__detail">
            <span class="digital-ticket__detail-label">Row</span>
            <span class="digital-ticket__detail-value">${ticket.row}</span>
          </div>
          <div class="digital-ticket__detail">
            <span class="digital-ticket__detail-label">Seat</span>
            <span class="digital-ticket__detail-value">${ticket.seat}</span>
          </div>
          <div class="digital-ticket__detail">
            <span class="digital-ticket__detail-label">Entry Gate</span>
            <span class="digital-ticket__detail-value" style="color:var(--color-accent-blue)">${ticket.gate}</span>
          </div>
        </div>
        <div class="digital-ticket__barcode">${ticket.barcode}</div>
        <div class="digital-ticket__barcode-label">Scan at turnstile</div>
      </div>

      <!-- Geo-Fenced Gate Assignment -->
      <div class="section-header">
        <div class="section-header__title">📍 Smart Gate Assignment</div>
        <span class="badge badge--blue">Geo-fenced</span>
      </div>
      <div class="smart-suggestion" style="margin-bottom:16px">
        <div class="smart-suggestion__icon">📡</div>
        <div class="smart-suggestion__text">
          <div class="smart-suggestion__title">Your Assigned Gate: ${ticket.gate}</div>
          <div class="smart-suggestion__desc">Based on your seat in <strong>${ticket.section}</strong>, you've been assigned to <strong>${ticket.gate}</strong> for the fastest entry. Geo-fencing detects your approach automatically.</div>
        </div>
      </div>

      <!-- Gate Throughput Monitor -->
      <div class="section-header">
        <div class="section-header__title">🚪 Gate Status (Live)</div>
      </div>
      <div class="gate-grid">
        ${Object.entries(gates).map(([gateId, gt]) => {
          const gateName = gateId.replace('gate-', 'Gate ').toUpperCase();
          const statusColor = gt.status === 'optimal' ? 'green' : gt.status === 'normal' ? 'yellow' : 'red';
          const isAssigned = ticket.gate.toLowerCase().replace(' ', '-') === gateId;
          return `
            <div class="gate-card ${isAssigned ? 'gate-card--assigned' : ''}">
              <div class="gate-card__header">
                <span class="gate-card__name">${gateName}</span>
                ${isAssigned ? '<span class="badge badge--blue" style="font-size:8px">YOUR GATE</span>' : ''}
              </div>
              <div class="gate-card__metrics">
                <div class="gate-card__metric">
                  <div class="gate-card__metric-value" style="color:var(--color-${statusColor})">${gt.waitMin}</div>
                  <div class="gate-card__metric-label">min wait</div>
                </div>
                <div class="gate-card__metric">
                  <div class="gate-card__metric-value">${gt.queueLength}</div>
                  <div class="gate-card__metric-label">in queue</div>
                </div>
                <div class="gate-card__metric">
                  <div class="gate-card__metric-value">${gt.throughput}</div>
                  <div class="gate-card__metric-label">ppl/min</div>
                </div>
              </div>
              <div class="progress-bar" style="margin-top:6px">
                <div class="progress-bar__fill" style="width:${Math.min(100, gt.queueLength / 1.2)}%; background:var(--color-${statusColor})"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Staggered Exit Windows -->
      <div class="section-header" style="margin-top:20px">
        <div class="section-header__title">🚶 Staggered Exit Plan</div>
        <span class="badge badge--purple">Anti-bottleneck</span>
      </div>
      <div class="smart-suggestion" style="margin-bottom:12px; border-color: rgba(34, 197, 94, 0.3); background: linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02));">
        <div class="smart-suggestion__icon">✅</div>
        <div class="smart-suggestion__text">
          <div class="smart-suggestion__title" style="color:var(--color-green)">Your Exit: ${exit.wave}</div>
          <div class="smart-suggestion__desc">Depart at <strong>${exit.estimatedDepartTime}</strong> via <strong>${exit.gate}</strong>. Estimated exit time: <strong>${exit.estimatedExitDuration}</strong>.</div>
        </div>
      </div>

      ${data.exitWindows.map((w, i) => {
        const isUserWave = w.id === exit.waveId;
        const fillPct = Math.round((w.assigned / w.capacity) * 100);
        return `
          <div class="exit-wave ${isUserWave ? 'exit-wave--active' : ''}">
            <div class="exit-wave__header">
              <div>
                <div class="exit-wave__label">${w.label}</div>
                <div class="exit-wave__sections">${w.sections}</div>
              </div>
              <div class="exit-wave__time">
                <div class="exit-wave__depart">${w.departureDisplay}</div>
                <div class="exit-wave__gate">${w.recommendedGate}</div>
              </div>
            </div>
            <div class="progress-bar" style="margin-top:6px">
              <div class="progress-bar__fill" style="width:${fillPct}%; background:var(--color-${w.color})"></div>
            </div>
            <div class="exit-wave__meta">
              <span>${w.assigned.toLocaleString()} / ${w.capacity.toLocaleString()} assigned</span>
              <span>Clear in ~${w.estimatedClearTime}</span>
            </div>
            ${isUserWave ? '<div class="exit-wave__you">← You are here</div>' : ''}
          </div>
        `;
      }).join('')}
    `;
  }

  // =====================================================
  //  Alerts Tab
  // =====================================================

  function renderAlertsTab(data) {
    return `
      <div class="section-header">
        <div class="section-header__title">🔔 Notifications</div>
        <span class="badge badge--blue">${data.notifications.length}</span>
      </div>
      <div class="notif-list stagger">
        ${data.notifications.slice(0, 12).map(n => `
          <div class="notif-card notif-card--${n.type}">
            <div class="notif-card__header">
              <span class="notif-card__title">${n.title}</span>
              <span class="notif-card__time">${n.time}</span>
            </div>
            <div class="notif-card__desc">${n.desc}</div>
          </div>
        `).join('')}
      </div>
      <div class="section-header"><div class="section-header__title">📋 Match Events</div></div>
      ${[...data.match.events].reverse().map(e => `
        <div class="notif-card notif-card--event" style="margin-bottom: 8px">
          <div class="notif-card__header">
            <span class="notif-card__title">${e.type === 'goal' ? '⚽' : e.type === 'yellow' ? '🟨' : '📢'} ${e.desc}</span>
            <span class="notif-card__time">${e.minute}'</span>
          </div>
        </div>
      `).join('')}
    `;
  }

  // =====================================================
  //  Shared Renderers
  // =====================================================

  function renderConcessionQueueCard(q) {
    const pctDone = q.startPosition > 0 ? Math.round(((q.startPosition - q.position) / q.startPosition) * 100) : 0;
    const statusColor = q.status === 'your_turn' ? 'green' : q.status === 'approaching' ? 'amber' : 'blue';
    const statusLabel = q.status === 'your_turn' ? '🔔 YOUR TURN!' :
                        q.status === 'approaching' ? '⏰ Almost there!' :
                        q.status === 'queued' ? `#${q.position} in line` : q.status;

    return `
      <div class="concession-queue-card concession-queue-card--${q.status}">
        <div class="concession-queue-card__header">
          <span style="font-size:24px">${q.concessionIcon}</span>
          <div>
            <div class="concession-queue-card__name">${q.concessionName}</div>
            <div class="concession-queue-card__location">${q.location}</div>
          </div>
          <div class="concession-queue-card__status">
            <span class="badge badge--${statusColor}">${statusLabel}</span>
          </div>
        </div>
        <div class="progress-bar" style="margin:8px 0">
          <div class="progress-bar__fill" style="width:${pctDone}%; background: var(--color-${statusColor === 'amber' ? 'accent-amber' : statusColor})"></div>
        </div>
        <div class="concession-queue-card__meta">
          <span>Est. wait: ~${q.estimatedWait} min</span>
          ${q.status === 'your_turn' ? '<span style="color:var(--color-green);font-weight:700">Head there now!</span>' :
            q.status === 'approaching' ? '<span style="color:var(--color-accent-amber);font-weight:700">Start walking!</span>' : ''}
        </div>
        ${q.status !== 'your_turn' ? `
          <button class="btn btn-sm btn-secondary" style="width:100%;margin-top:8px" data-leave-concession-queue="${q.id}">Leave Queue</button>
        ` : ''}
      </div>
    `;
  }

  function renderOrderTimeline(order) {
    const steps = ['confirmed', 'preparing', 'ready', 'picked_up'];
    const currentIdx = steps.indexOf(order.status);
    const stepLabels = ['Confirmed', 'Preparing', 'Ready!', 'Picked Up'];
    const stepIcons = ['✓', '🔥', '🔔', '📦'];

    return `
      <div class="order-timeline ${order.status === 'ready' ? 'order-timeline--ready' : ''}">
        <div class="order-timeline__header">
          <div class="order-timeline__item-info">
            <span style="font-size:24px">${order.item.icon}</span>
            <div>
              <div class="order-timeline__name">${order.item.name}</div>
              <div class="order-timeline__id">${order.id} · Pickup #${order.pickupNumber}</div>
            </div>
          </div>
          <div class="order-timeline__status order-timeline__status--${order.status}">
            ${order.status === 'ready' ? '🔔 Ready!' : order.status === 'preparing' ? '🔥 Preparing' : order.status === 'confirmed' ? '✓ Confirmed' : '📦 Done'}
          </div>
        </div>

        <div class="order-timeline__steps">
          ${steps.map((step, i) => `
            <div class="timeline-step ${i <= currentIdx ? 'timeline-step--done' : ''} ${i === currentIdx ? 'timeline-step--current' : ''}">
              <div class="timeline-step__dot">${i <= currentIdx ? stepIcons[i] : ''}</div>
              <div class="timeline-step__label">${stepLabels[i]}</div>
            </div>
            ${i < steps.length - 1 ? `<div class="timeline-step__line ${i < currentIdx ? 'timeline-step__line--done' : ''}"></div>` : ''}
          `).join('')}
        </div>

        ${order.status === 'ready' ? `
          <div class="order-timeline__pickup">
            <strong>📍 Pick up at:</strong> ${order.pickupLocation}
          </div>
        ` : order.status === 'preparing' ? `
          <div class="order-timeline__pickup" style="border-color: var(--color-accent-amber-dim); color: var(--color-accent-amber);">
            ⏱️ Est. ready in ~${order.estimatedMins} min
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderQueuePosition(q) {
    return `
      <div class="queue-position-card ${q.status === 'your_turn' ? 'queue-position-card--turn' : ''}">
        <div class="queue-position-card__header">
          <span style="font-size:24px">🚻</span>
          <div>
            <div class="queue-position-card__name">${q.restroomName}</div>
            <div class="queue-position-card__location">${q.location}</div>
          </div>
          <div class="queue-position-card__pos ${q.status === 'your_turn' ? 'queue-position-card__pos--turn' : ''}">
            ${q.status === 'your_turn' ? `<span style="font-size:18px">🔔</span> YOUR TURN` : `#${q.position}`}
          </div>
        </div>
        ${q.status !== 'your_turn' ? `
          <div class="queue-position-card__wait">Est. wait: ~${q.estimatedWait} min</div>
        ` : `
          <div class="queue-position-card__wait" style="color:var(--color-green);font-weight:700">Head there now!</div>
        `}
        <button class="btn btn-sm btn-secondary" style="width:100%;margin-top:8px" data-leave-queue="${q.id}">Leave Queue</button>
      </div>
    `;
  }

  function renderReservationCard(res) {
    return `
      <div class="reservation-card">
        <span style="font-size:28px">${res.laneIcon}</span>
        <div class="reservation-card__info">
          <div class="reservation-card__name">${res.laneName}</div>
          <div class="reservation-card__details">
            🕐 ${res.slotTime} · ${res.location} · ${res.duration} min window
          </div>
        </div>
        <span class="badge badge--green">🎟️ ${res.id}</span>
      </div>
    `;
  }

  function renderWaitCard(item) {
    const color = item.waitTime <= 5 ? 'green' : item.waitTime <= 10 ? 'yellow' : item.waitTime <= 15 ? 'orange' : 'red';
    const trendIcon = item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→';
    return `
      <div class="wait-card wait-card--${color}">
        <div class="wait-card__header">
          <span class="wait-card__icon">${item.icon}</span>
          <span class="wait-card__trend wait-card__trend--${item.trend}">${trendIcon}</span>
        </div>
        <div class="wait-card__name">${item.name}</div>
        <div class="wait-card__zone">${item.zone ? item.zone.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''}</div>
        <span class="wait-card__time wait-card__time--${color}">${item.waitTime}</span>
        <span class="wait-card__unit"> min</span>
      </div>
    `;
  }

  // =====================================================
  //  Canvas Rendering
  // =====================================================

  function renderCanvases(data) {
    requestAnimationFrame(() => {
      const homeCanvas = document.getElementById('att-home-heatmap');
      if (homeCanvas) {
        HeatmapRenderer.render(homeCanvas, data, {
          showLabels: false, showUserPosition: true, compact: true, showPitch: true,
        });
      }

      renderNavigateCanvases(data);
      renderARCanvas(data);
    });
  }

  function renderNavigateCanvases(data) {
    const wayfindCanvas = document.getElementById('att-wayfinding-map');
    if (wayfindCanvas) {
      HeatmapRenderer.render(wayfindCanvas, data, {
        showLabels: true, showUserPosition: true, compact: false, showPitch: true,
      });
      if (activeRoute) {
        HeatmapRenderer.renderRoute(wayfindCanvas, activeRoute, VenueData.getNavGraph());
      }
    }
  }

  function renderARCanvas(data) {
    const arCanvas = document.getElementById('att-ar-canvas');
    if (arCanvas) {
      HeatmapRenderer.renderAROverlay(arCanvas, data.arOverlay);
    }
  }

  function switchTab(tab) {
    currentTab = tab;
    container.querySelectorAll('.bottom-nav__item').forEach(btn => {
      btn.classList.toggle('bottom-nav__item--active', btn.dataset.tab === tab);
    });
    container.querySelectorAll('.tab-content').forEach(el => {
      el.classList.toggle('tab-content--active', el.id === `att-tab-${tab}`);
    });

    // Cancel AR animation if leaving AR tab
    if (tab !== 'ar' && arAnimFrame) {
      cancelAnimationFrame(arAnimFrame);
      arAnimFrame = null;
    }

    if (tab === 'navigate') setTimeout(() => renderNavigateCanvases(VenueData.getSnapshot()), 100);
    if (tab === 'services') refreshServices();
    if (tab === 'ar') startARAnimation();
    if (tab === 'ticket') {
      const el = document.getElementById('att-ticket-content');
      if (el) el.innerHTML = renderTicketTab(VenueData.getSnapshot());
    }
  }

  function startARAnimation() {
    function animateAR() {
      const arCanvas = document.getElementById('att-ar-canvas');
      if (arCanvas && currentTab === 'ar') {
        HeatmapRenderer.renderAROverlay(arCanvas, VenueData.getAROverlayData());
        arAnimFrame = requestAnimationFrame(animateAR);
      }
    }
    animateAR();
  }

  function update(data) {
    if (!container) return;
    const matchHeader = document.getElementById('att-match-header');
    if (matchHeader) matchHeader.innerHTML = renderMatchHeader(data);

    updatePickupBanner(data);

    if (currentTab === 'home') {
      const el = document.getElementById('att-home-content');
      if (el) el.innerHTML = renderHomeTab(data);
    } else if (currentTab === 'navigate') {
      // Don't re-render navigate content to avoid losing selection, just update canvas
      renderNavigateCanvases(data);
    } else if (currentTab === 'alerts') {
      const el = document.getElementById('att-alerts-content');
      if (el) el.innerHTML = renderAlertsTab(data);
    } else if (currentTab === 'services') {
      refreshServices();
    } else if (currentTab === 'food') {
      const el = document.getElementById('att-food-content');
      if (el) el.innerHTML = renderFoodTab(data);
    } else if (currentTab === 'ticket') {
      const el = document.getElementById('att-ticket-content');
      if (el) el.innerHTML = renderTicketTab(data);
    }
    // AR tab animates itself

    renderCanvases(data);
  }

  function destroy() {
    if (arAnimFrame) cancelAnimationFrame(arAnimFrame);
  }

  return { init, update, destroy };
})();
