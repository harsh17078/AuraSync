/* ============================================================
   Insight-X — Main App Controller
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

    // Return Home modal — delegate
    const returnOverlay = document.getElementById('return-home-overlay');
    const closeReturn = document.getElementById('return-home-close');
    const btnUber = document.getElementById('btn-uber');
    const btnOla = document.getElementById('btn-ola');
    const destInput = document.getElementById('dest-loc');

    if (closeReturn && returnOverlay) {
      closeReturn.addEventListener('click', () => {
        returnOverlay.classList.remove('settings-modal--open');
        returnOverlay.setAttribute('aria-hidden', 'true');
      });
      returnOverlay.addEventListener('click', (e) => {
        if (e.target === returnOverlay) {
          returnOverlay.classList.remove('settings-modal--open');
          returnOverlay.setAttribute('aria-hidden', 'true');
        }
      });
    }

    if (btnUber) {
      btnUber.addEventListener('click', () => handleRideBooking('uber', destInput));
    }
    if (btnOla) {
      btnOla.addEventListener('click', () => handleRideBooking('ola', destInput));
    }

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
      showToast('Welcome to Insight-X', '⚡ Live Broadcast running. Smart Decision engine online.', 'info');
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
  //  Ride Booking Logic
  // =====================================================

  function handleRideBooking(service, destInput) {
    const destination = destInput.value.trim();
    if (!destination) {
      destInput.style.borderColor = 'var(--color-red)';
      destInput.placeholder = '⚠️ Please enter your destination first...';
      destInput.classList.add('shake-anim');
      setTimeout(() => {
        destInput.style.borderColor = '';
        destInput.classList.remove('shake-anim');
      }, 500);
      destInput.focus();
      return;
    }

    if (service === 'uber') {
      const pickup = encodeURIComponent('Insight-X Stadium');
      const dropoff = encodeURIComponent(destination);
      window.open(`https://m.uber.com/looking?pickup=${pickup}&dropoff=${dropoff}`, '_blank');
    } else if (service === 'ola') {
      window.open(`https://book.olacabs.com/`, '_blank');
    }
  }

  function updateApiStatusIndicator() {
    // API live status static display (updated in HTML directly)
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
