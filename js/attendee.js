/* ============================================================
   VenueFlow — Attendee View Controller (Enhanced)
   Virtual Queuing · Click-and-Collect · Express Lanes
   ============================================================ */

const AttendeeView = (() => {
  let container = null;
  let currentTab = 'home';
  let foodFilter = 'all';
  let initialized = false;
  let selectedExpressLane = null;

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
        <div id="att-tab-map" class="tab-content">
          <div id="att-map-content">${renderMapTab(data)}</div>
        </div>
        <div id="att-tab-food" class="tab-content">
          <div id="att-food-content">${renderFoodTab(data)}</div>
        </div>
        <div id="att-tab-services" class="tab-content">
          <div id="att-services-content">${renderServicesTab(data)}</div>
        </div>
        <div id="att-tab-alerts" class="tab-content">
          <div id="att-alerts-content">${renderAlertsTab(data)}</div>
        </div>

        <!-- Bottom Navigation -->
        <nav class="bottom-nav" id="att-bottom-nav">
          <button class="bottom-nav__item bottom-nav__item--active" data-tab="home">
            <span class="bottom-nav__icon">🏠</span>Home
          </button>
          <button class="bottom-nav__item" data-tab="map">
            <span class="bottom-nav__icon">🗺️</span>Map
          </button>
          <button class="bottom-nav__item" data-tab="food">
            <span class="bottom-nav__icon">🍔</span>Order
          </button>
          <button class="bottom-nav__item" data-tab="services">
            <span class="bottom-nav__icon">🚻</span>Services
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
        // Refresh order section
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
    });
  }

  function refreshServices() {
    const el = document.getElementById('att-services-content');
    if (el) el.innerHTML = renderServicesTab(VenueData.getSnapshot());
  }

  // =====================================================
  //  Pickup Notification Banner
  // =====================================================

  function updatePickupBanner(data) {
    const banner = document.getElementById('att-pickup-banner');
    if (!banner) return;
    const readyNotifs = (data.pickupNotifications || []).filter(p => !p.dismissed);
    if (readyNotifs.length === 0) {
      banner.innerHTML = '';
      return;
    }
    banner.innerHTML = readyNotifs.map(n => `
      <div class="pickup-banner">
        <div class="pickup-banner__pulse"></div>
        <div class="pickup-banner__content">
          <div class="pickup-banner__title">${n.title}</div>
          <div class="pickup-banner__desc">${n.desc}</div>
        </div>
        <button class="pickup-banner__dismiss" data-dismiss-pickup="${n.id}">✕</button>
      </div>
    `).join('');
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

      <!-- Active Queue / Reservation -->
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
        <span class="section-header__action" data-switch-tab="map">Full Map →</span>
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
  //  Map Tab
  // =====================================================

  function renderMapTab(data) {
    return `
      <div class="section-header">
        <div class="section-header__title">🗺️ Live Venue Map</div>
        <span class="badge badge--blue"><span class="live-dot" style="width:6px;height:6px;margin-right:4px"></span> Real-time</span>
      </div>
      <div class="venue-map-container">
        <canvas class="venue-map-canvas" id="att-full-heatmap" style="height:350px"></canvas>
        <div class="venue-map__info">
          <span class="venue-map__seat">📍 ${data.userPosition.seat}</span>
          <span class="venue-map__capacity">Tap a zone for details</span>
        </div>
      </div>
      <div class="section-header"><div class="section-header__title">📊 Zone Status</div></div>
      ${data.zones.filter(z => z.type === 'seating' || z.type === 'concourse').map(z => {
        const pct = Math.round(z.occupancy * 100);
        const color = pct > 85 ? 'red' : pct > 65 ? 'orange' : pct > 40 ? 'yellow' : 'green';
        return `<div class="route-card" style="margin-bottom: 8px">
            <div class="route-card__icon">${z.type === 'seating' ? '🏟️' : '🚶'}</div>
            <div class="route-card__info">
              <div class="route-card__name">${z.name}</div>
              <div class="route-card__details"><span>${z.type}</span> · <span>${(Math.round(z.occupancy * z.capacity)).toLocaleString()} people</span></div>
              <div class="progress-bar" style="margin-top:6px">
                <div class="progress-bar__fill" style="width:${pct}%; background: var(--color-${color})"></div>
              </div>
            </div>
            <div style="text-align:right">
              <span class="route-card__time" style="color: var(--color-${color})">${pct}%</span>
              <div class="route-card__time-unit">capacity</div>
            </div>
          </div>`;
      }).join('')}
    `;
  }

  // =====================================================
  //  Food Tab (Click-and-Collect)
  // =====================================================

  function renderFoodTab(data) {
    const filtered = foodFilter === 'all' ? data.foodMenu :
                     data.foodMenu.filter(item => item.category === foodFilter);

    return `
      <div class="section-header">
        <div class="section-header__title">🍽️ Click & Collect</div>
        <span class="badge badge--blue">Order from your seat</span>
      </div>

      <div class="food-tabs">
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
      const fullCanvas = document.getElementById('att-full-heatmap');
      if (fullCanvas) {
        HeatmapRenderer.render(fullCanvas, data, {
          showLabels: true, showUserPosition: true, compact: false, showPitch: true,
        });
      }
    });
  }

  function switchTab(tab) {
    currentTab = tab;
    container.querySelectorAll('.bottom-nav__item').forEach(btn => {
      btn.classList.toggle('bottom-nav__item--active', btn.dataset.tab === tab);
    });
    container.querySelectorAll('.tab-content').forEach(el => {
      el.classList.toggle('tab-content--active', el.id === `att-tab-${tab}`);
    });
    if (tab === 'map') setTimeout(() => renderCanvases(VenueData.getSnapshot()), 100);
    if (tab === 'services') refreshServices();
  }

  function update(data) {
    if (!container) return;
    const matchHeader = document.getElementById('att-match-header');
    if (matchHeader) matchHeader.innerHTML = renderMatchHeader(data);

    updatePickupBanner(data);

    if (currentTab === 'home') {
      const el = document.getElementById('att-home-content');
      if (el) el.innerHTML = renderHomeTab(data);
    } else if (currentTab === 'map') {
      const el = document.getElementById('att-map-content');
      if (el) el.innerHTML = renderMapTab(data);
    } else if (currentTab === 'alerts') {
      const el = document.getElementById('att-alerts-content');
      if (el) el.innerHTML = renderAlertsTab(data);
    } else if (currentTab === 'services') {
      refreshServices();
    }

    renderCanvases(data);
  }

  function destroy() {}

  return { init, update, destroy };
})();
