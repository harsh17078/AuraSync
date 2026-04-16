/* ============================================================
   VenueFlow — Main App Controller
   ============================================================ */

const App = (() => {
  let currentView = 'attendee';
  let unsubscribe = null;
  let apiStatusUnsub = null;

  function init() {
    // View switcher
    const switcher = document.getElementById('view-switcher');
    if (switcher) {
      switcher.querySelectorAll('.view-switcher__btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
      });
    }

    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', openSettings);
    }

    // Settings modal — delegate
    document.addEventListener('click', (e) => {
      if (e.target.closest('#settings-close-btn') || e.target.id === 'settings-modal-overlay') {
        closeSettings();
      }
      if (e.target.closest('#settings-save-btn')) {
        saveSettings();
      }
      if (e.target.closest('[data-test-api]')) {
        testApiConnection(e.target.closest('[data-test-api]').dataset.testApi);
      }
    });

    // Start with attendee view
    switchView('attendee');

    // Start data engine
    VenueData.start();

    // Subscribe to data updates
    unsubscribe = VenueData.subscribe((data) => {
      if (currentView === 'attendee') {
        AttendeeView.update(data);
      } else {
        DashboardView.update(data);
      }
      updateApiStatusIndicator();
    });

    // Start API polling if keys are configured
    ApiService.startPolling();

    // Monitor API status
    apiStatusUnsub = ApiService.onStatusChange(() => {
      updateApiStatusIndicator();
    });

    // Toast on first load
    setTimeout(() => {
      const cfg = ApiService.getConfig();
      if (!cfg.footballApiKey && !cfg.weatherApiKey) {
        showToast('Welcome to VenueFlow', '⚡ Running in simulation mode. Click ⚙️ Settings to connect real APIs.', 'info');
      } else {
        showToast('VenueFlow Connected', '📡 Real-time API integration active.', 'success');
      }
    }, 1500);
  }

  function switchView(view) {
    currentView = view;

    document.querySelectorAll('.view-switcher__btn').forEach(btn => {
      btn.classList.toggle('view-switcher__btn--active', btn.dataset.view === view);
    });

    const attendeeEl = document.getElementById('attendee-container');
    const dashboardEl = document.getElementById('dashboard-container');

    if (view === 'attendee') {
      attendeeEl.style.display = 'block';
      dashboardEl.style.display = 'none';
      AttendeeView.init(attendeeEl);
    } else {
      attendeeEl.style.display = 'none';
      dashboardEl.style.display = 'block';
      DashboardView.init(dashboardEl);
    }
  }

  // =====================================================
  //  Settings Modal
  // =====================================================

  function openSettings() {
    const cfg = ApiService.getConfig();
    const status = ApiService.getStatus();

    const overlay = document.getElementById('settings-modal-overlay');
    const content = document.getElementById('settings-modal-content');

    content.innerHTML = `
      <div class="settings-header">
        <h3 style="font-family:var(--font-heading);display:flex;align-items:center;gap:8px">
          ⚙️ API Settings
        </h3>
        <button class="btn btn-ghost" id="settings-close-btn" style="font-size:20px;padding:4px 8px">✕</button>
      </div>

      <div class="settings-body">
        <!-- Football API -->
        <div class="settings-section">
          <div class="settings-section__header">
            <span class="settings-section__title">⚽ Football Data API</span>
            ${renderStatusBadge(status.football)}
          </div>
          <p class="settings-section__desc">
            Live match scores & events from <a href="https://www.football-data.org/client/register" target="_blank" style="color:var(--color-accent-blue)">Football-Data.org</a> (free tier — 10 req/min)
          </p>
          <div class="settings-field">
            <label class="settings-label">API Key</label>
            <div class="settings-input-group">
              <input type="password" class="settings-input" id="cfg-football-key" value="${cfg.footballApiKey}" placeholder="Enter your API key...">
              <button class="btn btn-sm btn-secondary" data-test-api="football">Test</button>
            </div>
          </div>
          ${status.football.error ? `<div class="settings-error">❌ ${status.football.error}</div>` : ''}
          ${status.football.connected ? `<div class="settings-success">✅ Connected — last update ${new Date(status.football.lastUpdate).toLocaleTimeString()}</div>` : ''}
        </div>

        <!-- Weather API -->
        <div class="settings-section">
          <div class="settings-section__header">
            <span class="settings-section__title">🌤️ Weather API</span>
            ${renderStatusBadge(status.weather)}
          </div>
          <p class="settings-section__desc">
            Real-time venue weather from <a href="https://home.openweathermap.org/users/sign_up" target="_blank" style="color:var(--color-accent-blue)">OpenWeatherMap</a> (free tier — 60 req/min)
          </p>
          <div class="settings-field">
            <label class="settings-label">API Key</label>
            <div class="settings-input-group">
              <input type="password" class="settings-input" id="cfg-weather-key" value="${cfg.weatherApiKey}" placeholder="Enter your API key...">
              <button class="btn btn-sm btn-secondary" data-test-api="weather">Test</button>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-field" style="flex:1">
              <label class="settings-label">Venue City</label>
              <input type="text" class="settings-input" id="cfg-venue-city" value="${cfg.venueCity}" placeholder="London">
            </div>
            <div class="settings-field" style="flex:0 0 80px">
              <label class="settings-label">Country</label>
              <input type="text" class="settings-input" id="cfg-venue-country" value="${cfg.venueCountry}" placeholder="GB" maxlength="2">
            </div>
          </div>
          ${status.weather.error ? `<div class="settings-error">❌ ${status.weather.error}</div>` : ''}
          ${status.weather.connected ? `<div class="settings-success">✅ Connected — last update ${new Date(status.weather.lastUpdate).toLocaleTimeString()}</div>` : ''}
        </div>

        <!-- Crowd Sensor API -->
        <div class="settings-section">
          <div class="settings-section__header">
            <span class="settings-section__title">📡 Crowd Sensor API</span>
            ${renderStatusBadge(status.crowd)}
          </div>
          <p class="settings-section__desc">
            Connect to your venue's IoT sensor network for real-time crowd density, wait times, and gate throughput data.
          </p>
          <div class="settings-field">
            <label class="settings-label">Endpoint URL</label>
            <div class="settings-input-group">
              <input type="url" class="settings-input" id="cfg-crowd-url" value="${cfg.crowdApiUrl}" placeholder="https://your-venue-api.com/crowd/live">
              <button class="btn btn-sm btn-secondary" data-test-api="crowd">Test</button>
            </div>
          </div>
          ${status.crowd.error ? `<div class="settings-error">❌ ${status.crowd.error}</div>` : ''}
          ${status.crowd.connected ? `<div class="settings-success">✅ Connected — last update ${new Date(status.crowd.lastUpdate).toLocaleTimeString()}</div>` : ''}
        </div>

        <!-- Data Sources Status -->
        <div class="settings-section" style="background:var(--color-bg-primary);border-radius:var(--radius-md);padding:var(--space-md)">
          <div class="settings-section__title" style="margin-bottom:8px">📊 Data Source Status</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            ${renderSourceCard('Match Data', VenueData.getDataSources().match)}
            ${renderSourceCard('Weather', VenueData.getDataSources().weather)}
            ${renderSourceCard('Crowd Data', VenueData.getDataSources().crowd)}
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <button class="btn btn-secondary" id="settings-close-btn">Cancel</button>
        <button class="btn btn-primary btn-lg" id="settings-save-btn">💾 Save & Connect</button>
      </div>
    `;

    overlay.classList.add('settings-modal--open');
  }

  function renderStatusBadge(apiStatus) {
    if (apiStatus.connected) return '<span class="badge badge--green">🟢 Connected</span>';
    if (apiStatus.error) return '<span class="badge badge--red">🔴 Error</span>';
    return '<span class="badge badge--yellow">⚪ Not configured</span>';
  }

  function renderSourceCard(label, source) {
    const isApi = source === 'api';
    return `
      <div style="text-align:center;padding:8px;border-radius:var(--radius-sm);background:var(--color-bg-elevated)">
        <div style="font-size:18px;margin-bottom:4px">${isApi ? '📡' : '🔄'}</div>
        <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-primary)">${label}</div>
        <div style="font-size:var(--text-xs);color:${isApi ? 'var(--color-green)' : 'var(--color-accent-amber)'}">${isApi ? 'Live API' : 'Simulated'}</div>
      </div>
    `;
  }

  function closeSettings() {
    const overlay = document.getElementById('settings-modal-overlay');
    overlay.classList.remove('settings-modal--open');
  }

  function saveSettings() {
    const footballKey = document.getElementById('cfg-football-key')?.value.trim() || '';
    const weatherKey = document.getElementById('cfg-weather-key')?.value.trim() || '';
    const venueCity = document.getElementById('cfg-venue-city')?.value.trim() || 'London';
    const venueCountry = document.getElementById('cfg-venue-country')?.value.trim() || 'GB';
    const crowdUrl = document.getElementById('cfg-crowd-url')?.value.trim() || '';

    ApiService.saveConfig({
      footballApiKey: footballKey,
      weatherApiKey: weatherKey,
      venueCity,
      venueCountry,
      crowdApiUrl: crowdUrl,
    });

    // Restart polling with new config
    ApiService.stopPolling();
    ApiService.startPolling();

    closeSettings();
    showToast('Settings Saved', '📡 API connections updated. Real-time data will appear shortly.', 'success');
  }

  async function testApiConnection(type) {
    const btn = document.querySelector(`[data-test-api="${type}"]`);
    if (btn) {
      btn.textContent = '...';
      btn.disabled = true;
    }

    // Temporarily save the current input values for the test
    if (type === 'football') {
      const key = document.getElementById('cfg-football-key')?.value.trim();
      if (key) ApiService.saveConfig({ footballApiKey: key });
    } else if (type === 'weather') {
      const key = document.getElementById('cfg-weather-key')?.value.trim();
      const city = document.getElementById('cfg-venue-city')?.value.trim();
      const country = document.getElementById('cfg-venue-country')?.value.trim();
      if (key) ApiService.saveConfig({ weatherApiKey: key, venueCity: city, venueCountry: country });
    } else if (type === 'crowd') {
      const url = document.getElementById('cfg-crowd-url')?.value.trim();
      if (url) ApiService.saveConfig({ crowdApiUrl: url });
    }

    const result = await ApiService.testConnection(type);

    if (btn) {
      btn.textContent = result ? '✓ OK' : '✗ Fail';
      btn.disabled = false;
      setTimeout(() => { btn.textContent = 'Test'; }, 3000);
    }

    // Refresh modal to show updated status
    openSettings();
  }

  // =====================================================
  //  API Status Indicator (top bar)
  // =====================================================

  function updateApiStatusIndicator() {
    const el = document.getElementById('api-status-indicator');
    if (!el) return;

    const sources = VenueData.getDataSources();
    const apiCount = Object.values(sources).filter(s => s === 'api').length;
    const total = Object.keys(sources).length;

    if (apiCount === 0) {
      el.innerHTML = `
        <span class="badge badge--yellow" style="cursor:pointer" id="status-badge-click">
          🔄 Simulated
        </span>
      `;
    } else if (apiCount === total) {
      el.innerHTML = `
        <span class="badge badge--green" style="cursor:pointer" id="status-badge-click">
          <span class="live-dot" style="width:6px;height:6px"></span>
          All APIs Live
        </span>
      `;
    } else {
      el.innerHTML = `
        <span class="badge badge--blue" style="cursor:pointer" id="status-badge-click">
          <span class="live-dot" style="width:6px;height:6px"></span>
          ${apiCount}/${total} APIs Live
        </span>
      `;
    }

    // Click to open settings
    const badge = document.getElementById('status-badge-click');
    if (badge) {
      badge.addEventListener('click', openSettings);
    }
  }

  // =====================================================
  //  Toast Notifications
  // =====================================================

  function showToast(title, message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:12px">
        <span style="font-size:20px;line-height:1">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <div>
          <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:2px">${title}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-secondary);line-height:1.4">${message}</div>
        </div>
        <button onclick="this.closest('.toast').remove()" style="background:none;border:none;color:var(--color-text-muted);cursor:pointer;font-size:16px;padding:0;line-height:1">✕</button>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
  }

  function destroy() {
    if (unsubscribe) unsubscribe();
    if (apiStatusUnsub) apiStatusUnsub();
    VenueData.stop();
    ApiService.stopPolling();
    AttendeeView.destroy();
    DashboardView.destroy();
  }

  return { init, destroy, showToast };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
