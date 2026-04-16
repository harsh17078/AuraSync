# VenueFlow — Smart Venue Experience Platform

⚡ A real-time, dual-interface web application that transforms the large-scale sporting venue experience through crowd intelligence, virtual queuing, and smart automation.

## Features

### 📱 Attendee App (Mobile-first)
- **Live Match Tracking** — Real-time scores, events, and minute-by-minute updates
- **AI Recommendations** — Smart suggestions for nearest food, restrooms, and exits
- **Click & Collect** — Order food from your seat with 4-step order timeline and pickup notifications
- **Virtual Bathroom Queues** — IoT sensor-powered restroom availability with virtual queue join
- **Express Lane Reservations** — Time-slot booking for Team Store, Fan Gear, and Photo Booth
- **Live Venue Heatmap** — Canvas-rendered crowd density visualization
- **Smart Navigation** — Walk time + wait time routing to any venue point

### 📊 Operations Dashboard (Command Center)
- **KPI Cards** — Attendance, crowd density, avg wait, satisfaction score
- **Live Heatmap** — Zone occupancy with flow particle animation
- **Wait Time Trends** — Real-time charts for all concession stands
- **Incident Management** — Severity-coded alerts with action buttons
- **Staff Deployment** — Zone-level staffing overview

### 📡 Real-Time API Integration
- **Football-Data.org** — Live match scores and events
- **OpenWeatherMap** — Real-time venue weather
- **IoT Crowd Sensors** — Configurable REST endpoint for crowd density data
- **Graceful Fallback** — Automatic simulation when APIs are unavailable

## Tech Stack

- **Vanilla HTML/CSS/JavaScript** — Zero dependencies, zero build step
- **Canvas API** — Custom heatmap and chart rendering
- **localStorage** — API key persistence
- **CSS Custom Properties** — Full design system with dark mode

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
│   ├── attendee.css    # Attendee app styles
│   └── dashboard.css   # Dashboard styles
├── js/
│   ├── data.js         # Real-time data engine
│   ├── api.js          # API integration layer
│   ├── heatmap.js      # Canvas heatmap renderer
│   ├── charts.js       # Canvas chart library
│   ├── attendee.js     # Attendee view controller
│   ├── dashboard.js    # Dashboard view controller
│   └── app.js          # Main app controller
└── README.md
```

## License

MIT
