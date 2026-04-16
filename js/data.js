/* ============================================================
   VenueFlow — Simulated Real-Time Venue Data Engine
   ============================================================ */

const VenueData = (() => {
  // --- Match State ---
  const match = {
    homeTeam: 'Thunder FC',
    awayTeam: 'Dynamo United',
    homeScore: 1,
    awayScore: 0,
    minute: 34,
    half: 1,
    status: 'LIVE', // PRE_GAME, LIVE, HALFTIME, SECOND_HALF, FULL_TIME
    events: [
      { minute: 12, type: 'goal', team: 'home', player: 'M. Rodriguez', desc: 'Goal! Rodriguez scores from close range!' },
      { minute: 23, type: 'yellow', team: 'away', player: 'K. Chen', desc: 'Yellow card for Chen — late tackle' },
    ],
    weather: { temp: 22, condition: 'Clear', humidity: 45, wind: 12 },
    venue: 'MetroSphere Arena',
    capacity: 62000,
    attendance: 58420,
  };

  // --- Venue Zones ---
  const zones = [
    { id: 'north-stand', name: 'North Stand', type: 'seating', capacity: 15000, occupancy: 0.92, x: 0.5, y: 0.12, w: 0.6, h: 0.12 },
    { id: 'south-stand', name: 'South Stand', type: 'seating', capacity: 15000, occupancy: 0.88, x: 0.5, y: 0.88, w: 0.6, h: 0.12 },
    { id: 'east-stand', name: 'East Stand', type: 'seating', capacity: 12000, occupancy: 0.95, x: 0.88, y: 0.5, w: 0.12, h: 0.5 },
    { id: 'west-stand', name: 'West Stand', type: 'seating', capacity: 12000, occupancy: 0.90, x: 0.12, y: 0.5, w: 0.12, h: 0.5 },
    { id: 'north-concourse', name: 'North Concourse', type: 'concourse', capacity: 4000, occupancy: 0.35, x: 0.5, y: 0.03, w: 0.7, h: 0.06 },
    { id: 'south-concourse', name: 'South Concourse', type: 'concourse', capacity: 4000, occupancy: 0.40, x: 0.5, y: 0.97, w: 0.7, h: 0.06 },
    { id: 'east-concourse', name: 'East Concourse', type: 'concourse', capacity: 3000, occupancy: 0.30, x: 0.97, y: 0.5, w: 0.06, h: 0.6 },
    { id: 'west-concourse', name: 'West Concourse', type: 'concourse', capacity: 3000, occupancy: 0.45, x: 0.03, y: 0.5, w: 0.06, h: 0.6 },
    { id: 'gate-a', name: 'Gate A (North)', type: 'gate', capacity: 800, occupancy: 0.20, x: 0.35, y: 0.02, w: 0.05, h: 0.04 },
    { id: 'gate-b', name: 'Gate B (East)', type: 'gate', capacity: 800, occupancy: 0.15, x: 0.98, y: 0.35, w: 0.04, h: 0.05 },
    { id: 'gate-c', name: 'Gate C (South)', type: 'gate', capacity: 800, occupancy: 0.18, x: 0.65, y: 0.98, w: 0.05, h: 0.04 },
    { id: 'gate-d', name: 'Gate D (West)', type: 'gate', capacity: 800, occupancy: 0.10, x: 0.02, y: 0.65, w: 0.04, h: 0.05 },
    { id: 'vip-lounge', name: 'VIP Lounge', type: 'vip', capacity: 500, occupancy: 0.72, x: 0.12, y: 0.25, w: 0.08, h: 0.1 },
  ];

  // --- Concession Stands ---
  const concessions = [
    { id: 'food-n1', name: 'Burger Barn', type: 'food', zone: 'north-concourse', waitTime: 8, maxWait: 20, trend: 'stable', icon: '🍔', x: 0.35, y: 0.05 },
    { id: 'food-n2', name: 'Pizza Point', type: 'food', zone: 'north-concourse', waitTime: 5, maxWait: 18, trend: 'down', icon: '🍕', x: 0.55, y: 0.05 },
    { id: 'food-s1', name: 'Taco Stand', type: 'food', zone: 'south-concourse', waitTime: 12, maxWait: 22, trend: 'up', icon: '🌮', x: 0.40, y: 0.95 },
    { id: 'food-s2', name: 'Noodle Bar', type: 'food', zone: 'south-concourse', waitTime: 6, maxWait: 15, trend: 'stable', icon: '🍜', x: 0.60, y: 0.95 },
    { id: 'food-e1', name: 'Hot Dog Hub', type: 'food', zone: 'east-concourse', waitTime: 4, maxWait: 14, trend: 'down', icon: '🌭', x: 0.95, y: 0.40 },
    { id: 'food-w1', name: 'Fry Factory', type: 'food', zone: 'west-concourse', waitTime: 7, maxWait: 16, trend: 'up', icon: '🍟', x: 0.05, y: 0.45 },
    { id: 'drink-n1', name: 'Brew House', type: 'drink', zone: 'north-concourse', waitTime: 10, maxWait: 25, trend: 'up', icon: '🍺', x: 0.45, y: 0.04 },
    { id: 'drink-s1', name: 'Juice Bar', type: 'drink', zone: 'south-concourse', waitTime: 3, maxWait: 10, trend: 'down', icon: '🧃', x: 0.50, y: 0.96 },
    { id: 'drink-e1', name: 'Coffee Corner', type: 'drink', zone: 'east-concourse', waitTime: 6, maxWait: 12, trend: 'stable', icon: '☕', x: 0.96, y: 0.55 },
    { id: 'merch-n1', name: 'Team Store', type: 'merchandise', zone: 'north-concourse', waitTime: 15, maxWait: 30, trend: 'up', icon: '🛍️', x: 0.65, y: 0.04 },
    { id: 'merch-s1', name: 'Fan Gear', type: 'merchandise', zone: 'south-concourse', waitTime: 8, maxWait: 20, trend: 'stable', icon: '👕', x: 0.35, y: 0.96 },
  ];

  // --- Restrooms (with sensor data) ---
  const restrooms = [
    { id: 'rest-n1', name: 'North Restroom A', zone: 'north-concourse', waitTime: 4, maxWait: 12, trend: 'stable', icon: '🚻', x: 0.30, y: 0.04,
      totalStalls: 12, occupiedStalls: 8, queueLength: 6, sensorStatus: 'online', lastSensorUpdate: Date.now() },
    { id: 'rest-n2', name: 'North Restroom B', zone: 'north-concourse', waitTime: 6, maxWait: 14, trend: 'up', icon: '🚻', x: 0.70, y: 0.04,
      totalStalls: 10, occupiedStalls: 9, queueLength: 14, sensorStatus: 'online', lastSensorUpdate: Date.now() },
    { id: 'rest-s1', name: 'South Restroom A', zone: 'south-concourse', waitTime: 3, maxWait: 10, trend: 'down', icon: '🚻', x: 0.45, y: 0.96,
      totalStalls: 14, occupiedStalls: 6, queueLength: 3, sensorStatus: 'online', lastSensorUpdate: Date.now() },
    { id: 'rest-e1', name: 'East Restroom', zone: 'east-concourse', waitTime: 2, maxWait: 8, trend: 'stable', icon: '🚻', x: 0.96, y: 0.45,
      totalStalls: 8, occupiedStalls: 3, queueLength: 0, sensorStatus: 'online', lastSensorUpdate: Date.now() },
    { id: 'rest-w1', name: 'West Restroom', zone: 'west-concourse', waitTime: 5, maxWait: 10, trend: 'up', icon: '🚻', x: 0.04, y: 0.55,
      totalStalls: 10, occupiedStalls: 7, queueLength: 9, sensorStatus: 'online', lastSensorUpdate: Date.now() },
  ];

  // --- Incidents ---
  const incidents = [
    { id: 'inc-1', time: '18:23', severity: 'info', title: 'Gate A fully operational', desc: 'All turnstiles active', status: 'resolved' },
    { id: 'inc-2', time: '18:45', severity: 'warning', title: 'North Concourse crowding', desc: 'Occupancy reaching 85% — deploying additional staff', status: 'active' },
    { id: 'inc-3', time: '19:02', severity: 'info', title: 'Hot Dog Hub low stock', desc: 'Premium hot dogs running low — resupply in 10 min', status: 'active' },
  ];

  // --- Notifications ---
  const notifications = [
    { id: 'notif-1', time: '2 min ago', title: '⚽ GOAL! Rodriguez scores!', desc: 'Thunder FC 1-0 Dynamo United. What a strike!', type: 'event' },
    { id: 'notif-2', time: '8 min ago', title: '🍔 Burger Barn — 8 min wait', desc: 'Below average wait time. Great time to grab a bite!', type: 'suggestion' },
    { id: 'notif-3', time: '15 min ago', title: '🚻 East Restroom — Shortest wait', desc: 'Only 2 minute wait vs. 6 min at North Restroom B', type: 'suggestion' },
  ];

  // --- Wait Time History (for charts) ---
  const waitTimeHistory = {
    labels: [],
    datasets: {} // concession id -> array of values
  };

  // Initialize wait time history
  function initWaitHistory() {
    for (let i = 30; i >= 0; i--) {
      const m = match.minute - i;
      if (m > 0) waitTimeHistory.labels.push(`${m}'`);
    }
    concessions.forEach(c => {
      waitTimeHistory.datasets[c.id] = waitTimeHistory.labels.map(() =>
        Math.max(1, c.waitTime + Math.round((Math.random() - 0.5) * 6))
      );
    });
  }
  initWaitHistory();

  // --- Food Menu ---
  const foodMenu = [
    { id: 'menu-1', name: 'Classic Burger', price: 12.99, prepTime: 5, stand: 'Burger Barn', icon: '🍔', category: 'food' },
    { id: 'menu-2', name: 'Cheese Burger Deluxe', price: 15.99, prepTime: 7, stand: 'Burger Barn', icon: '🍔', category: 'food' },
    { id: 'menu-3', name: 'Margherita Pizza', price: 10.99, prepTime: 8, stand: 'Pizza Point', icon: '🍕', category: 'food' },
    { id: 'menu-4', name: 'Pepperoni Slice', price: 7.99, prepTime: 4, stand: 'Pizza Point', icon: '🍕', category: 'food' },
    { id: 'menu-5', name: 'Loaded Nachos', price: 9.99, prepTime: 5, stand: 'Taco Stand', icon: '🌮', category: 'food' },
    { id: 'menu-6', name: 'Beef Tacos (3)', price: 11.99, prepTime: 6, stand: 'Taco Stand', icon: '🌮', category: 'food' },
    { id: 'menu-7', name: 'Premium Hot Dog', price: 8.99, prepTime: 3, stand: 'Hot Dog Hub', icon: '🌭', category: 'food' },
    { id: 'menu-8', name: 'Loaded Fries', price: 7.99, prepTime: 4, stand: 'Fry Factory', icon: '🍟', category: 'food' },
    { id: 'menu-9', name: 'Draft Beer', price: 9.99, prepTime: 2, stand: 'Brew House', icon: '🍺', category: 'drink' },
    { id: 'menu-10', name: 'Craft IPA', price: 12.99, prepTime: 2, stand: 'Brew House', icon: '🍺', category: 'drink' },
    { id: 'menu-11', name: 'Fresh Lemonade', price: 5.99, prepTime: 1, stand: 'Juice Bar', icon: '🧃', category: 'drink' },
    { id: 'menu-12', name: 'Espresso', price: 4.99, prepTime: 3, stand: 'Coffee Corner', icon: '☕', category: 'drink' },
  ];

  // --- Order Tracking (Enhanced Click-and-Collect) ---
  let activeOrders = [];
  let orderIdCounter = 1000;
  let pickupNotifications = []; // Push notifications for ready orders

  function placeOrder(menuItemId) {
    const item = foodMenu.find(i => i.id === menuItemId);
    if (!item) return null;

    // Find the concession stand for pickup location
    const stand = concessions.find(c => c.name === item.stand);

    const order = {
      id: `ORD-${++orderIdCounter}`,
      item: item,
      status: 'confirmed', // confirmed → preparing → ready → picked_up
      placedAt: Date.now(),
      confirmedAt: Date.now(),
      preparingAt: null,
      readyAt: null,
      pickedUpAt: null,
      estimatedMins: item.prepTime,
      estimatedReadyTime: Date.now() + item.prepTime * 60 * 1000,
      pickupLocation: stand ? `${stand.name} — ${stand.zone.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}` : item.stand,
      pickupZone: stand ? stand.zone : '',
      pickupNumber: Math.floor(Math.random() * 900) + 100,
    };

    activeOrders.unshift(order);

    // Auto-advance through status timeline
    setTimeout(() => {
      order.status = 'preparing';
      order.preparingAt = Date.now();
    }, 3000);

    setTimeout(() => {
      order.status = 'ready';
      order.readyAt = Date.now();
      // Push notification when ready
      pickupNotifications.push({
        id: `pickup-${order.id}`,
        orderId: order.id,
        title: `🔔 Order ${order.id} is ready!`,
        desc: `Pick up your ${item.name} at ${order.pickupLocation}. Pickup #${order.pickupNumber}`,
        time: Date.now(),
        dismissed: false,
      });
      addNotification(
        `🔔 Your ${item.name} is ready!`,
        `Pick up at ${order.pickupLocation}. Pickup #${order.pickupNumber}`,
        'order'
      );
    }, 10000);

    setTimeout(() => {
      order.status = 'picked_up';
      order.pickedUpAt = Date.now();
    }, 25000);

    addNotification(
      `✅ Order confirmed: ${item.name}`,
      `Estimated ready in ~${item.prepTime} min at ${order.pickupLocation}`,
      'order'
    );

    return order;
  }

  function dismissPickupNotification(notifId) {
    const n = pickupNotifications.find(p => p.id === notifId);
    if (n) n.dismissed = true;
  }

  // --- Express Lane Reservations (Time-slot booking) ---
  const expressLanes = [
    {
      id: 'express-team-store',
      name: 'Team Store',
      icon: '🛍️',
      location: 'North Concourse',
      zone: 'north-concourse',
      currentWait: 15,
      currentQueue: 32,
      slots: generateTimeSlots('Team Store'),
    },
    {
      id: 'express-fan-gear',
      name: 'Fan Gear Shop',
      icon: '👕',
      location: 'South Concourse',
      zone: 'south-concourse',
      currentWait: 8,
      currentQueue: 18,
      slots: generateTimeSlots('Fan Gear'),
    },
    {
      id: 'express-photo-booth',
      name: 'Stadium Photo Booth',
      icon: '📸',
      location: 'East Concourse',
      zone: 'east-concourse',
      currentWait: 12,
      currentQueue: 22,
      slots: generateTimeSlots('Photo Booth'),
    },
  ];

  let expressReservations = [];
  let reservationIdCounter = 500;

  function generateTimeSlots(name) {
    const now = new Date();
    const slots = [];
    for (let i = 0; i < 8; i++) {
      const start = new Date(now.getTime() + (i * 15 + 10) * 60000);
      const spotsTotal = 6;
      const spotsTaken = Math.floor(Math.random() * 5);
      slots.push({
        id: `slot-${name.replace(/\s/g, '')}-${i}`,
        startTime: start.toISOString(),
        displayTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: 10, // minutes
        spotsTotal,
        spotsTaken,
        spotsAvailable: spotsTotal - spotsTaken,
      });
    }
    return slots;
  }

  function bookExpressSlot(laneId, slotId) {
    const lane = expressLanes.find(l => l.id === laneId);
    if (!lane) return null;
    const slot = lane.slots.find(s => s.id === slotId);
    if (!slot || slot.spotsAvailable <= 0) return null;

    slot.spotsTaken++;
    slot.spotsAvailable--;

    const reservation = {
      id: `RES-${++reservationIdCounter}`,
      laneId,
      laneName: lane.name,
      laneIcon: lane.icon,
      location: lane.location,
      slotTime: slot.displayTime,
      duration: slot.duration,
      startTime: slot.startTime,
      status: 'confirmed', // confirmed, active, completed
      createdAt: Date.now(),
    };

    expressReservations.unshift(reservation);

    addNotification(
      `🎟️ Express Lane booked: ${lane.name}`,
      `Your time slot: ${slot.displayTime} at ${lane.location}. Skip the queue!`,
      'reservation'
    );

    return reservation;
  }

  // --- Virtual Restroom Queue ---
  let restroomQueues = []; // Active queue positions

  function joinRestroomQueue(restroomId) {
    const restroom = restrooms.find(r => r.id === restroomId);
    if (!restroom) return null;

    // Check if already in queue
    if (restroomQueues.find(q => q.restroomId === restroomId)) return null;

    const position = restroom.queueLength + 1;
    const entry = {
      id: `RQ-${Date.now()}`,
      restroomId,
      restroomName: restroom.name,
      location: restroom.zone.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      position,
      estimatedWait: Math.ceil(position * 1.5),
      joinedAt: Date.now(),
      status: 'queued', // queued, your_turn, completed
    };

    restroomQueues.push(entry);

    // Auto-advance queue
    const advanceInterval = setInterval(() => {
      if (entry.position > 1) {
        entry.position--;
        entry.estimatedWait = Math.ceil(entry.position * 1.5);
      } else if (entry.position === 1 && entry.status === 'queued') {
        entry.status = 'your_turn';
        addNotification(
          `🚻 It's your turn!`,
          `Head to ${restroom.name} now. ${restroom.zone.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
          'queue'
        );
        setTimeout(() => {
          entry.status = 'completed';
          clearInterval(advanceInterval);
        }, 15000);
      }
    }, 4000);

    addNotification(
      `🚻 Joined virtual queue: ${restroom.name}`,
      `Position #${position} · Est. wait ~${entry.estimatedWait} min`,
      'queue'
    );

    return entry;
  }

  function leaveRestroomQueue(queueId) {
    restroomQueues = restroomQueues.filter(q => q.id !== queueId);
  }

  function getNearestRestroom() {
    // Find nearest under-utilized restroom based on user position
    return [...restrooms]
      .map(r => {
        const dx = r.x - userPosition.x;
        const dy = r.y - userPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const walkMins = Math.round(distance * 8 + 0.5);
        const occupancyRate = r.occupiedStalls / r.totalStalls;
        const score = r.waitTime + walkMins * 2 + occupancyRate * 5; // Lower is better
        return { ...r, distance, walkMins, occupancyRate, score };
      })
      .sort((a, b) => a.score - b.score);
  }

  // --- User Position (simulated) ---
  const userPosition = { x: 0.38, y: 0.14, section: 'North Stand', seat: 'Section 112, Row F, Seat 14' };

  // --- Staff Resources ---
  const staff = {
    total: 340,
    deployed: 312,
    zones: {
      'north-stand': 45,
      'south-stand': 42,
      'east-stand': 38,
      'west-stand': 38,
      'north-concourse': 52,
      'south-concourse': 44,
      'east-concourse': 28,
      'west-concourse': 25,
    }
  };

  // --- Satisfaction Score ---
  let satisfaction = 8.4;

  // --- Real-time update engine ---
  let listeners = [];
  let updateInterval = null;
  let tickCount = 0;

  function subscribe(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  }

  function emit() {
    listeners.forEach(fn => fn(getSnapshot()));
  }

  function tick() {
    tickCount++;

    // Advance match time every ~6 ticks (≈18s)
    if (tickCount % 6 === 0 && match.status === 'LIVE') {
      match.minute++;
      if (match.minute === 45) {
        match.status = 'HALFTIME';
        match.events.push({ minute: 45, type: 'halftime', team: '', player: '', desc: 'Half Time!' });
        addNotification('⏱️ Half Time!', 'Great time to stretch and grab refreshments. Concourse traffic increasing.', 'event');
        addIncident('warning', 'Halftime rush beginning', 'Expect increased concourse traffic for next 15 minutes');
      }
      if (match.minute > 45 && match.status === 'HALFTIME') {
        match.status = 'SECOND_HALF';
        match.half = 2;
      }
      if (match.minute === 90) {
        match.status = 'FULL_TIME';
        match.events.push({ minute: 90, type: 'fulltime', team: '', player: '', desc: 'Full Time! Thunder FC wins!' });
        addNotification('🏆 Full Time!', `Thunder FC ${match.homeScore}-${match.awayScore} Dynamo United. Use Gate D for fastest exit!`, 'event');
      }

      // Random match events
      if (Math.random() < 0.08 && match.minute > 10 && match.minute < 88) {
        const team = Math.random() > 0.5 ? 'home' : 'away';
        const players = team === 'home' ? ['M. Rodriguez', 'L. Santos', 'A. Kim'] : ['K. Chen', 'P. Müller', 'J. Williams'];
        const player = players[Math.floor(Math.random() * players.length)];
        if (Math.random() < 0.4) {
          if (team === 'home') match.homeScore++; else match.awayScore++;
          match.events.push({ minute: match.minute, type: 'goal', team, player, desc: `Goal! ${player} scores!` });
          addNotification(`⚽ GOAL! ${player}!`, `${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`, 'event');
        } else {
          match.events.push({ minute: match.minute, type: 'yellow', team, player, desc: `Yellow card for ${player}` });
        }
      }
    }

    // Update zone occupancies
    const isHalftime = match.status === 'HALFTIME';
    zones.forEach(z => {
      let delta = (Math.random() - 0.5) * 0.04;
      if (isHalftime && z.type === 'concourse') delta += 0.03;
      if (isHalftime && z.type === 'seating') delta -= 0.02;
      if (match.status === 'FULL_TIME' && z.type === 'gate') delta += 0.05;
      if (match.status === 'FULL_TIME' && z.type === 'seating') delta -= 0.04;
      z.occupancy = Math.max(0.05, Math.min(0.98, z.occupancy + delta));
    });

    // Update wait times
    [...concessions, ...restrooms].forEach(c => {
      let delta = (Math.random() - 0.5) * 3;
      if (isHalftime) delta += 2;
      if (match.status === 'FULL_TIME') delta -= 1.5;
      c.waitTime = Math.max(1, Math.min(c.maxWait, Math.round(c.waitTime + delta)));

      // Update trend
      if (delta > 1) c.trend = 'up';
      else if (delta < -1) c.trend = 'down';
      else c.trend = 'stable';
    });

    // Update restroom sensors
    restrooms.forEach(r => {
      const stallDelta = Math.floor((Math.random() - 0.45) * 2);
      r.occupiedStalls = Math.max(0, Math.min(r.totalStalls, r.occupiedStalls + stallDelta));
      const qDelta = Math.floor((Math.random() - 0.45) * 3);
      if (isHalftime) r.queueLength = Math.max(0, r.queueLength + Math.abs(qDelta) + 1);
      else r.queueLength = Math.max(0, r.queueLength + qDelta);
      r.lastSensorUpdate = Date.now();
    });

    // Update express lane queues
    expressLanes.forEach(lane => {
      const delta = Math.floor((Math.random() - 0.5) * 4);
      lane.currentQueue = Math.max(5, lane.currentQueue + delta);
      lane.currentWait = Math.max(3, Math.round(lane.currentQueue * 0.5));
    });

    // Update wait time history every 4 ticks
    if (tickCount % 4 === 0) {
      const label = `${match.minute}'`;
      waitTimeHistory.labels.push(label);
      if (waitTimeHistory.labels.length > 30) waitTimeHistory.labels.shift();
      concessions.forEach(c => {
        if (!waitTimeHistory.datasets[c.id]) waitTimeHistory.datasets[c.id] = [];
        waitTimeHistory.datasets[c.id].push(c.waitTime);
        if (waitTimeHistory.datasets[c.id].length > 30) waitTimeHistory.datasets[c.id].shift();
      });
    }

    // Random incidents
    if (tickCount % 20 === 0 && Math.random() < 0.3) {
      const templates = [
        { severity: 'info', title: 'Concession resupply complete', desc: 'All stands fully stocked' },
        { severity: 'warning', title: 'South Gate queue building', desc: 'Queue length exceeding threshold' },
        { severity: 'info', title: 'Medical team dispatched', desc: 'Section 204 — minor first aid' },
        { severity: 'warning', title: 'East Concourse congestion', desc: 'Redirecting flow via alternate route' },
        { severity: 'critical', title: 'West Restroom maintenance', desc: 'Facilities team en route — ETA 5 min' },
      ];
      const t = templates[Math.floor(Math.random() * templates.length)];
      addIncident(t.severity, t.title, t.desc);
    }

    // Random suggestions
    if (tickCount % 15 === 0 && Math.random() < 0.25) {
      const suggestions = [
        { title: '🍕 Pizza Point — Only 5 min wait!', desc: 'Shortest food wait near you right now.' },
        { title: '🚻 East Restroom — Just 2 min', desc: 'Much shorter than North Restroom B (6 min).' },
        { title: '🚪 Gate D is clear', desc: 'If you need to step out, Gate D has no queue.' },
        { title: '☕ Coffee Corner deal!', desc: 'Grab an espresso — only 6 min wait.' },
      ];
      const s = suggestions[Math.floor(Math.random() * suggestions.length)];
      addNotification(s.title, s.desc, 'suggestion');
    }

    // Satisfaction fluctuation
    satisfaction = Math.max(6.0, Math.min(9.8, satisfaction + (Math.random() - 0.48) * 0.15));

    emit();
  }

  function addNotification(title, desc, type) {
    notifications.unshift({
      id: `notif-${Date.now()}`,
      time: 'Just now',
      title,
      desc,
      type,
    });
    if (notifications.length > 20) notifications.pop();
  }

  function addIncident(severity, title, desc) {
    incidents.unshift({
      id: `inc-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      severity,
      title,
      desc,
      status: 'active',
    });
    if (incidents.length > 15) incidents.pop();
  }

  function start() {
    if (updateInterval) return;
    updateInterval = setInterval(tick, 3000);
  }

  function stop() {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  function getSnapshot() {
    return {
      match: { ...match, events: [...match.events] },
      zones: zones.map(z => ({ ...z })),
      concessions: concessions.map(c => ({ ...c })),
      restrooms: restrooms.map(r => ({ ...r })),
      incidents: incidents.map(i => ({ ...i })),
      notifications: notifications.map(n => ({ ...n })),
      waitTimeHistory: {
        labels: [...waitTimeHistory.labels],
        datasets: { ...waitTimeHistory.datasets },
      },
      foodMenu: [...foodMenu],
      activeOrders: activeOrders.map(o => ({ ...o, item: { ...o.item } })),
      pickupNotifications: pickupNotifications.filter(p => !p.dismissed).map(p => ({ ...p })),
      expressLanes: expressLanes.map(l => ({ ...l, slots: l.slots.map(s => ({ ...s })) })),
      expressReservations: expressReservations.map(r => ({ ...r })),
      restroomQueues: restroomQueues.map(q => ({ ...q })),
      nearestRestrooms: getNearestRestroom(),
      userPosition: { ...userPosition },
      staff: JSON.parse(JSON.stringify(staff)),
      satisfaction,
    };
  }

  // Navigation route suggestion
  function getRoute(destinationId) {
    const dest = [...concessions, ...restrooms].find(c => c.id === destinationId);
    if (!dest) return null;
    const dx = dest.x - userPosition.x;
    const dy = dest.y - userPosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const walkMins = Math.round(dist * 8 + 0.5);
    const totalMins = walkMins + dest.waitTime;
    return {
      destination: dest.name,
      walkTime: walkMins,
      waitTime: dest.waitTime,
      totalTime: totalMins,
      steps: Math.round(dist * 400),
      icon: dest.icon,
    };
  }

  // =====================================================
  //  API Data Application Methods
  //  Called by ApiService when real data arrives
  // =====================================================

  // Track which data sources are real vs. simulated
  const dataSources = {
    match: 'simulated',
    weather: 'simulated',
    crowd: 'simulated',
  };

  function getDataSources() {
    return { ...dataSources };
  }

  // Apply real match data from Football-Data.org
  function applyApiMatchData(apiMatch) {
    if (!apiMatch) return;
    dataSources.match = 'api';

    match.homeTeam = apiMatch.homeTeam || match.homeTeam;
    match.awayTeam = apiMatch.awayTeam || match.awayTeam;
    match.homeScore = apiMatch.homeScore ?? match.homeScore;
    match.awayScore = apiMatch.awayScore ?? match.awayScore;
    match.status = apiMatch.status || match.status;
    if (apiMatch.minute) match.minute = apiMatch.minute;
    if (apiMatch.half) match.half = apiMatch.half;
    if (apiMatch.venue) match.venue = apiMatch.venue;
    if (apiMatch.competition) match.competition = apiMatch.competition;

    // Merge API events with existing
    if (apiMatch.events && apiMatch.events.length > 0) {
      apiMatch.events.forEach(e => {
        if (!match.events.find(ex => ex.minute === e.minute && ex.type === e.type && ex.player === e.player)) {
          match.events.push(e);
          addNotification(
            `${e.type === 'goal' ? '⚽' : '🟨'} ${e.desc}`,
            `${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`,
            'event'
          );
        }
      });
    }

    emit();
    console.log('[VenueFlow] Applied real match data:', apiMatch.homeTeam, 'vs', apiMatch.awayTeam);
  }

  // Apply real weather from OpenWeatherMap
  function applyApiWeatherData(apiWeather) {
    if (!apiWeather) return;
    dataSources.weather = 'api';

    match.weather.temp = apiWeather.temp ?? match.weather.temp;
    match.weather.humidity = apiWeather.humidity ?? match.weather.humidity;
    match.weather.wind = apiWeather.wind ?? match.weather.wind;
    match.weather.condition = apiWeather.condition || match.weather.condition;
    if (apiWeather.icon) match.weather.icon = apiWeather.icon;
    if (apiWeather.feelsLike) match.weather.feelsLike = apiWeather.feelsLike;
    if (apiWeather.description) match.weather.description = apiWeather.description;

    emit();
    console.log('[VenueFlow] Applied real weather data:', apiWeather.temp + '°C', apiWeather.condition);
  }

  // Apply real crowd data from IoT sensors
  function applyApiCrowdData(apiCrowd) {
    if (!apiCrowd) return;
    dataSources.crowd = 'api';

    // Update zone occupancies from API
    if (apiCrowd.zones) {
      apiCrowd.zones.forEach(apiZone => {
        const zone = zones.find(z => z.id === apiZone.id);
        if (zone) {
          zone.occupancy = apiZone.occupancy ?? zone.occupancy;
          if (apiZone.capacity) zone.capacity = apiZone.capacity;
        }
      });
    }

    // Update concession wait times from API
    if (apiCrowd.concessions) {
      apiCrowd.concessions.forEach(apiC => {
        const c = concessions.find(x => x.id === apiC.id);
        if (c) {
          c.waitTime = apiC.waitTime ?? c.waitTime;
          c.trend = apiC.trend || c.trend;
        }
      });
    }

    // Update restroom wait times from API
    if (apiCrowd.restrooms) {
      apiCrowd.restrooms.forEach(apiR => {
        const r = restrooms.find(x => x.id === apiR.id);
        if (r) {
          r.waitTime = apiR.waitTime ?? r.waitTime;
          r.trend = apiR.trend || r.trend;
        }
      });
    }

    emit();
    console.log('[VenueFlow] Applied real crowd sensor data');
  }

  return {
    subscribe,
    start,
    stop,
    getSnapshot,
    getRoute,
    placeOrder,
    dismissPickupNotification,
    bookExpressSlot,
    joinRestroomQueue,
    leaveRestroomQueue,
    getNearestRestroom,
    getDataSources,
    applyApiMatchData,
    applyApiWeatherData,
    applyApiCrowdData,
  };
})();
