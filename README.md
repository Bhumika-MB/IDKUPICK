# IDKUPick

IDKUPick helps a group agree on where to eat. Each member submits cuisine, budget, distance, and location preferences; the app combines them and recommends nearby restaurants using the **OpenStreetMap Overpass API** (no API key required).

## Quick Start

### Prerequisites

- Node.js 18 or newer
- npm (or `npm.cmd` in PowerShell if execution policy blocks `npm.ps1`)

### Setup

1. **Clone and install dependencies**

   ```powershell
   # Terminal 1: Backend
   cd backend
   npm.cmd install
   npm.cmd run dev
   ```

   ```powershell
   # Terminal 2: Frontend
   cd frontend
   npm.cmd install
   npm.cmd start
   ```

2. **Configure environment** (optional — app works with defaults for local demo)

   Create `backend/.env`:
   ```env
   JWT_SECRET=your-long-random-secret-here
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster.xxxxx.mongodb.net/idkupick
   FRONTEND_URL=http://localhost:3000
   PORT=5000
   ```

   > **Without MongoDB Atlas**, the app uses an in-memory store. Data resets on server restart — great for quick demos.

3. **Open** `http://localhost:3000`, create an account, create a group, share the 6-character code, submit preferences, and click **Get Restaurant Recommendations**.

## MongoDB Atlas Setup (Optional)

1. Create a free [MongoDB Atlas](https://www.mongodb.com/atlas) account and an M0 cluster.
2. In **Database Access**, add a database user with a URL-safe password.
3. In **Network Access**, add your current IP address.
4. Click **Connect → Drivers → Node.js**, copy the connection string, replace `<username>`, `<password>`, and set the database name to `idkupick`, then set it as `MONGODB_URI` in `backend/.env`.
5. Restart the backend. You should see `MongoDB Connected` in the terminal.

## Architecture

```
frontend/          React 18 client (port 3000)
  └─ src/
     ├─ context/   AuthContext (global auth state)
     └─ pages/     Login, Signup, Dashboard, Groups, Preferences, Recommendations

backend/           Express API (port 5000)
  ├─ controllers/  Route handlers (auth, groups, preferences, recommendations)
  ├─ middleware/    JWT authentication guard
  ├─ models/       Mongoose schemas (User, Group, Preference)
  ├─ routes/       Express routers
  └─ services/
     └─ restaurantService.js  OpenStreetMap Overpass API integration

database/          MongoDB (primary) or in-memory fallback (no setup needed)
```

### Key Design Decisions

- **No external API keys** — Restaurant lookup uses the free [Overpass API](https://overpass-api.de/) (OpenStreetMap data)
- **Graceful fallback** — When MongoDB is unavailable, all data persists in memory for the session
- **Mood-based scoring** — Group mood (casual, fancy, quick, etc.) adjusts the weight of rating vs. price in recommendations
- **6-character group codes** — Easy sharing; auto-generated and guaranteed unique
