# IDKUPick

IDKUPick helps a group agree on where to eat. Each member submits cuisine, budget, distance, and location preferences; the app combines them and recommends nearby restaurants using OpenStreetMap's Overpass API.

## Run it in VS Code

1. Open this `IDKUPICK` folder in VS Code. Install Node.js 18 or newer if `node --version` does not work.
2. In `backend`, copy `.env.example` to `.env`. Set a long `JWT_SECRET`; add the Atlas connection string when ready.
3. Open two VS Code terminals:

   ```powershell
   cd backend
   npm.cmd run dev
   ```

   ```powershell
   cd frontend
   npm.cmd start
   ```

4. Open `http://localhost:3000`, create an account, create a group, submit preferences, and choose **Get Restaurant Recommendations**.

Use `npm.cmd` in PowerShell because this computer's execution policy blocks `npm.ps1`.

## MongoDB Atlas setup

1. Create a free Atlas project and an M0 cluster.
2. In **Database Access**, add a database user with a password that is URL-safe (or URL-encode special characters).
3. In **Network Access**, add your current IP address for development.
4. Click **Connect → Drivers → Node.js**, copy the connection string, replace `<username>`, `<password>`, and the database name with `idkupick`, then paste it as `MONGODB_URI` in `backend/.env`.
5. Restart the backend. It should print `MongoDB Connected`.

Without Atlas the app deliberately uses temporary in-memory data, which is useful for a quick demo but resets whenever the backend restarts.

## Architecture

- `frontend/`: React client
- `backend/`: Express API, JWT authentication, MongoDB models
- `backend/services/restaurantService.js`: Overpass query plus local location-aware fallback if the public API is unavailable
