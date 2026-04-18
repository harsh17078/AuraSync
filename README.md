# Insight-X — Smart Venue Experience Platform

⚡ A real-time, dual-interface web application that transforms the large-scale sporting venue experience through crowd intelligence, virtual queuing, predictive wayfinding, augmented reality, and smart automation.

## Features

### 📱 Attendee App (Mobile-first, 6-tab interface)

#### 🏠 Home Tab
- **Live Match Tracking** — Real-time scores, events, and minute-by-minute updates
- **AI Recommendations** — Smart suggestions for nearest food, restrooms, and exits
- **Click & Collect** — Order food from your seat with 4-step order timeline and pickup notifications
- **Virtual Bathroom Queues** — IoT sensor-powered restroom availability with virtual queue join
- **Express Lane Reservations** — Time-slot booking for Team Store, Fan Gear, and Photo Booth
- **Live Venue Heatmap** — Canvas-rendered crowd density visualization

#### 🧭 Navigate Tab — Predictive Wayfinding
- **Seat-to-Street Navigation** — Dynamic routing based on real-time crowd density
- **Dijkstra's Algorithm** — Crowd-weighted shortest path computation
- **Route Comparison** — See how much time the "fastest" route saves vs the "shortest" route
- **Animated Route Rendering** — Color-coded path segments showing crowd levels on the venue heatmap
- **Destination Categories** — Gates, Food, Restrooms, Parking, Transit all routed

#### 🍔 Order Tab — Virtual Concession Queuing
- **Digital Queue Join** — Join the line for any food stand from your seat
- **2-Minute Alert System** — Push notification when you're 2 minutes from being served
- **Auto-Advancing Queue** — Real-time position tracking with progress bar
- **Click & Collect Ordering** — Full food menu with instant ordering and timeline tracking

#### 📡 AR View Tab — Augmented Reality Safety Overlays
- **Simulated AR Camera** — Canvas-based AR viewport with scan lines, grid overlay, and viewfinder brackets
- **Live Traffic Zones** — See crowd density overlaid on concourse areas in real-time
- **Friend Locator** — Find friends in the venue with pulsing markers and distance indicators
- **Safety Quick-Access** — Nearest exit, first aid, and info desk with distance calculations
- **Traffic Level Dashboard** — Per-concourse occupancy bars with actionable tips

#### 🎫 Ticket Tab — Smart Ingress/Egress
- **Digital Ticket** — Beautiful ticket card with barcode, section, row, seat, and assigned gate
- **Geo-Fenced Gate Assignment** — Automatic entry gate assignment based on seat section
- **Gate Throughput Monitor** — Real-time wait times, queue lengths, and people-per-minute for all gates
- **Staggered Exit Waves** — 5-wave exit plan to prevent turnstile bottlenecks
- **Personal Exit Assignment** — "Your wave" with departure time and recommended gate

#### 🔔 Alerts Tab
- **Notification feed** — All event, suggestion, queue, and order notifications
- **Match events timeline** — Goals, cards, and half-time markers

---

### 📊 Operations Dashboard (Command Center)
- **KPI Cards** — Attendance, crowd density, avg wait, satisfaction score
- **Live Heatmap** — Zone occupancy with flow particle animation
- **Wait Time Trends** — Real-time charts for all concession stands
- **Incident Management** — Severity-coded alerts with action buttons
- **Staff Deployment** — Zone-level staffing overview
- **🚪 Gate Throughput Monitor** — Real-time gate wait, queue, and throughput tracking
- **🚶 Staggered Exit Management** — 5-wave exit plan with progress tracking and gate assignment

---

### 📡 Real-Time API Integration
- **Football-Data.org** — Live match scores and events
- **OpenWeatherMap** — Real-time venue weather
- **IoT Crowd Sensors** — Configurable REST endpoint for crowd density data
- **Graceful Fallback** — Automatic simulation when APIs are unavailable

## Tech Stack

- **Vanilla HTML/CSS/JavaScript** — Zero dependencies, zero build step
- **Canvas API** — Custom heatmap, chart, route, and AR overlay rendering
- **Dijkstra's Algorithm** — Crowd-weighted pathfinding engine
- **localStorage** — API key persistence
- **CSS Custom Properties** — Full design system with dark mode
- **BEM CSS Architecture** — Maintainable component styling

## Quick Start

1. Clone the repo
2. Serve with any static file server:
   ```bash
   npx serve .
   # or
   python -m http.server 3000
   ```
3. Open `http://localhost:3000`

## API Configuration

Click the ⚙️ button in the top-right to configure:
- **Football API** — [Register at football-data.org](https://www.football-data.org/client/register) (free)
- **Weather API** — [Register at openweathermap.org](https://home.openweathermap.org/users/sign_up) (free)
- **Crowd Sensors** — Enter your venue IoT endpoint URL

> All API keys are stored locally in your browser. The app works fully in simulation mode without any keys.

## Project Structure

```
├── index.html          # Entry point
├── css/
│   ├── global.css      # Design system & tokens
│   ├── attendee.css    # Attendee app styles (1850+ lines)
│   └── dashboard.css   # Dashboard styles
├── js/
│   ├── data.js         # Real-time data engine + pathfinding + queuing + AR + ingress/egress
│   ├── api.js          # API integration layer
│   ├── heatmap.js      # Canvas heatmap + route + AR overlay renderer
│   ├── charts.js       # Canvas chart library
│   ├── attendee.js     # Attendee 6-tab view controller
│   ├── dashboard.js    # Dashboard view controller
│   └── app.js          # Main app controller
└── README.md
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  data.js    │────▶│  attendee.js │     │  dashboard.js │
│  (Engine)   │     │  (6 Tabs)    │     │  (Command)    │
│             │     └──────────────┘     └───────────────┘
│  - Match    │            │                     │
│  - Zones    │     ┌──────┴──────┐       ┌──────┴──────┐
│  - Queuing  │     │ heatmap.js  │       │  charts.js  │
│  - Pathfind │     │ (Canvas)    │       │  (Canvas)   │
│  - AR Data  │     └─────────────┘       └─────────────┘
│  - Ingress  │
└─────────────┘
       ▲
       │
┌──────┴──────┐
│   api.js    │
│ (Live Data) │
└─────────────┘
```

## License

MIT
