/* ============================================================
   VenueFlow — Real-Time API Integration Layer
   ============================================================
   Connects to real APIs for live match data and weather.
   Falls back gracefully to simulated data when API keys
   are not configured or requests fail.
   ============================================================ */

const ApiService = (() => {

  // --- Configuration (set via Settings modal) ---
  let config = {
    footballApiKey: localStorage.getItem('vf_football_key') || '',
    weatherApiKey: localStorage.getItem('vf_weather_key') || '',
    venueCity: localStorage.getItem('vf_venue_city') || 'London',
    venueCountry: localStorage.getItem('vf_venue_country') || 'GB',
    crowdApiUrl: localStorage.getItem('vf_crowd_api') || '', // Custom IoT endpoint
    pollingInterval: 30000, // 30s for API calls (respect rate limits)
  };

  let status = {
    football: { connected: false, lastUpdate: null, error: null },
    weather: { connected: false, lastUpdate: null, error: null },
    crowd: { connected: false, lastUpdate: null, error: null },
  };

  let pollingTimers = {};
  let listeners = [];

  // --- Save/load config ---
  function saveConfig(newConfig) {
    Object.assign(config, newConfig);
    if (newConfig.footballApiKey !== undefined) localStorage.setItem('vf_football_key', newConfig.footballApiKey);
    if (newConfig.weatherApiKey !== undefined) localStorage.setItem('vf_weather_key', newConfig.weatherApiKey);
    if (newConfig.venueCity !== undefined) localStorage.setItem('vf_venue_city', newConfig.venueCity);
    if (newConfig.venueCountry !== undefined) localStorage.setItem('vf_venue_country', newConfig.venueCountry);
    if (newConfig.crowdApiUrl !== undefined) localStorage.setItem('vf_crowd_api', newConfig.crowdApiUrl);
  }

  function getConfig() {
    return { ...config };
  }

  function getStatus() {
    return JSON.parse(JSON.stringify(status));
  }

  // --- Status listeners ---
  function onStatusChange(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  }

  function emitStatus() {
    listeners.forEach(fn => fn(getStatus()));
  }

  // =====================================================
  //  1. FOOTBALL-DATA.ORG — Live Match Data
  // =====================================================
  // Free tier: 10 requests/min
  // Docs: https://www.football-data.org/documentation/api
  // =====================================================

  async function fetchLiveMatch() {
    if (!config.footballApiKey) {
      status.football = { connected: false, lastUpdate: null, error: 'No API key configured' };
      emitStatus();
      return null;
    }

    try {
      // Fetch today's matches from top leagues
      const response = await fetch('https://api.football-data.org/v4/matches?status=LIVE,IN_PLAY,PAUSED', {
        headers: { 'X-Auth-Token': config.footballApiKey },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      status.football = { connected: true, lastUpdate: new Date().toISOString(), error: null };
      emitStatus();

      if (data.matches && data.matches.length > 0) {
        // Take the first live match
        const match = data.matches[0];
        return transformFootballData(match);
      }

      // No live matches — try scheduled for today
      const todayResp = await fetch('https://api.football-data.org/v4/matches?status=SCHEDULED,TIMED', {
        headers: { 'X-Auth-Token': config.footballApiKey },
      });

      if (todayResp.ok) {
        const todayData = await todayResp.json();
        if (todayData.matches && todayData.matches.length > 0) {
          return transformFootballData(todayData.matches[0]);
        }
      }

      return null; // No matches today
    } catch (err) {
      console.warn('[VenueFlow API] Football-Data error:', err.message);
      status.football = { connected: false, lastUpdate: null, error: err.message };
      emitStatus();
      return null;
    }
  }

  function transformFootballData(match) {
    const statusMap = {
      'SCHEDULED': 'PRE_GAME',
      'TIMED': 'PRE_GAME',
      'IN_PLAY': 'LIVE',
      'PAUSED': 'HALFTIME',
      'HALF_TIME': 'HALFTIME',
      'SECOND_HALF': 'SECOND_HALF',
      'FINISHED': 'FULL_TIME',
      'EXTRA_TIME': 'LIVE',
      'PENALTY_SHOOTOUT': 'LIVE',
    };

    const events = [];
    // Football-Data doesn't provide detailed events in free tier,
    // but we can extract goals from score
    if (match.score && match.score.fullTime) {
      if (match.score.fullTime.home > 0) {
        events.push({
          minute: '?',
          type: 'goal',
          team: 'home',
          player: match.homeTeam.shortName || 'Home',
          desc: `Goal by ${match.homeTeam.shortName || 'Home'}`,
        });
      }
    }

    return {
      homeTeam: match.homeTeam.shortName || match.homeTeam.name || 'Home',
      awayTeam: match.awayTeam.shortName || match.awayTeam.name || 'Away',
      homeScore: match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? 0,
      awayScore: match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? 0,
      minute: match.minute || 0,
      half: match.score?.halfTime ? 2 : 1,
      status: statusMap[match.status] || 'PRE_GAME',
      events: events,
      competition: match.competition?.name || '',
      matchday: match.matchday || '',
      venue: match.venue || 'Stadium',
      utcDate: match.utcDate,
      apiSource: 'football-data.org',
    };
  }

  // =====================================================
  //  2. OPENWEATHERMAP — Real-time Weather
  // =====================================================
  // Free tier: 60 calls/min, current weather
  // Docs: https://openweathermap.org/current
  // =====================================================

  async function fetchWeather() {
    if (!config.weatherApiKey) {
      status.weather = { connected: false, lastUpdate: null, error: 'No API key configured' };
      emitStatus();
      return null;
    }

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(config.venueCity)},${config.venueCountry}&units=metric&appid=${config.weatherApiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      status.weather = { connected: true, lastUpdate: new Date().toISOString(), error: null };
      emitStatus();

      return {
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        wind: Math.round(data.wind.speed * 3.6), // m/s to km/h
        condition: data.weather[0]?.main || 'Clear',
        description: data.weather[0]?.description || '',
        icon: mapWeatherIcon(data.weather[0]?.main),
        city: data.name,
        apiSource: 'openweathermap.org',
      };
    } catch (err) {
      console.warn('[VenueFlow API] Weather error:', err.message);
      status.weather = { connected: false, lastUpdate: null, error: err.message };
      emitStatus();
      return null;
    }
  }

  function mapWeatherIcon(condition) {
    const map = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '🌨️',
      'Mist': '🌫️',
      'Fog': '🌫️',
      'Haze': '🌫️',
    };
    return map[condition] || '🌤️';
  }

  // =====================================================
  //  3. CROWD / IoT SENSOR API — Custom Endpoint
  // =====================================================
  // Connects to your venue's real sensor network.
  // Expected response format documented below.
  // =====================================================

  /*
   * Expected Crowd API Response Format:
   * {
   *   "timestamp": "2024-01-15T18:30:00Z",
   *   "zones": [
   *     {
   *       "id": "north-stand",
   *       "name": "North Stand",
   *       "type": "seating",
   *       "capacity": 15000,
   *       "currentOccupancy": 13800,
   *       "occupancyRate": 0.92,
   *       "flowIn": 12,     // people/min entering
   *       "flowOut": 5      // people/min leaving
   *     },
   *     ...
   *   ],
   *   "concessions": [
   *     {
   *       "id": "food-n1",
   *       "name": "Burger Barn",
   *       "type": "food",
   *       "zone": "north-concourse",
   *       "currentWaitMinutes": 8,
   *       "queueLength": 24,
   *       "trend": "up"    // up, down, stable
   *     },
   *     ...
   *   ],
   *   "restrooms": [
   *     {
   *       "id": "rest-n1",
   *       "name": "North Restroom A",
   *       "zone": "north-concourse",
   *       "currentWaitMinutes": 4,
   *       "trend": "stable"
   *     },
   *     ...
   *   ],
   *   "gates": [
   *     {
   *       "id": "gate-a",
   *       "name": "Gate A",
   *       "throughput": 120,  // people/min
   *       "queueLength": 45,
   *       "waitMinutes": 3
   *     },
   *     ...
   *   ]
   * }
   */

  async function fetchCrowdData() {
    if (!config.crowdApiUrl) {
      status.crowd = { connected: false, lastUpdate: null, error: 'No endpoint configured' };
      emitStatus();
      return null;
    }

    try {
      const response = await fetch(config.crowdApiUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      status.crowd = { connected: true, lastUpdate: new Date().toISOString(), error: null };
      emitStatus();

      return transformCrowdData(data);
    } catch (err) {
      console.warn('[VenueFlow API] Crowd API error:', err.message);
      status.crowd = { connected: false, lastUpdate: null, error: err.message };
      emitStatus();
      return null;
    }
  }

  function transformCrowdData(data) {
    return {
      zones: (data.zones || []).map(z => ({
        id: z.id,
        name: z.name,
        type: z.type,
        capacity: z.capacity,
        occupancy: z.occupancyRate || (z.currentOccupancy / z.capacity),
        flowIn: z.flowIn || 0,
        flowOut: z.flowOut || 0,
      })),
      concessions: (data.concessions || []).map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        zone: c.zone,
        waitTime: c.currentWaitMinutes,
        queueLength: c.queueLength || 0,
        trend: c.trend || 'stable',
      })),
      restrooms: (data.restrooms || []).map(r => ({
        id: r.id,
        name: r.name,
        zone: r.zone,
        waitTime: r.currentWaitMinutes,
        trend: r.trend || 'stable',
      })),
      gates: (data.gates || []).map(g => ({
        id: g.id,
        name: g.name,
        throughput: g.throughput,
        queueLength: g.queueLength,
        waitTime: g.waitMinutes,
      })),
      apiSource: 'crowd-sensor',
      timestamp: data.timestamp,
    };
  }

  // =====================================================
  //  Polling Manager
  // =====================================================

  function startPolling() {
    stopPolling();

    // Football: poll every 30s (respects 10 req/min free tier)
    if (config.footballApiKey) {
      pollingTimers.football = setInterval(async () => {
        const data = await fetchLiveMatch();
        if (data && window.VenueData) {
          VenueData.applyApiMatchData(data);
        }
      }, config.pollingInterval);

      // Immediate first fetch
      fetchLiveMatch().then(data => {
        if (data && window.VenueData) VenueData.applyApiMatchData(data);
      });
    }

    // Weather: poll every 5 minutes (respects rate limit)
    if (config.weatherApiKey) {
      pollingTimers.weather = setInterval(async () => {
        const data = await fetchWeather();
        if (data && window.VenueData) {
          VenueData.applyApiWeatherData(data);
        }
      }, 300000); // 5 min

      fetchWeather().then(data => {
        if (data && window.VenueData) VenueData.applyApiWeatherData(data);
      });
    }

    // Crowd sensors: poll every 10s (real-time IoT)
    if (config.crowdApiUrl) {
      pollingTimers.crowd = setInterval(async () => {
        const data = await fetchCrowdData();
        if (data && window.VenueData) {
          VenueData.applyApiCrowdData(data);
        }
      }, 10000);

      fetchCrowdData().then(data => {
        if (data && window.VenueData) VenueData.applyApiCrowdData(data);
      });
    }
  }

  function stopPolling() {
    Object.values(pollingTimers).forEach(t => clearInterval(t));
    pollingTimers = {};
  }

  // --- Test an API connection ---
  async function testConnection(type) {
    switch (type) {
      case 'football': return await fetchLiveMatch();
      case 'weather': return await fetchWeather();
      case 'crowd': return await fetchCrowdData();
      default: return null;
    }
  }

  return {
    getConfig,
    saveConfig,
    getStatus,
    onStatusChange,
    fetchLiveMatch,
    fetchWeather,
    fetchCrowdData,
    startPolling,
    stopPolling,
    testConnection,
  };
})();
