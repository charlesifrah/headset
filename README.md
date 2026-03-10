# Shared Field

A 2-player real-time browser game where both players interact with the same hidden zone-stability simulation, but one sees a garden (watering plants) and the other sees a fire zone (extinguishing fires). Neither player knows the other is experiencing a different reality until the final reveal.

## Quick Start

```bash
npm install
npm run dev
```

This starts both the server (port 3001) and client (port 5173).

- Open http://localhost:5173 in two browser tabs
- Tab 1: Click **Create Game**, note the room code
- Tab 2: Enter the room code and click **Join Game**
- The game auto-starts with a 3-second countdown

## How to Play

**Desktop**: WASD/arrows to move, mouse click or spacebar to spray  
**Mobile**: Left thumb joystick to move, right thumb button to spray

Aim at zones showing distress and hold your spray action to stabilize them. Your partner is doing the same thing -- but seeing a completely different world.

## Project Structure

```
shared/     TypeScript types and constants shared between client and server
server/     Node.js + Express + Socket.IO authoritative game server
client/     React + Vite + Phaser 3 game client
```

## Architecture

- **Server-authoritative**: The server owns all game state (zone instability, player positions, scores). Clients only send inputs.
- **One simulation, two presentations**: A single hidden instability model drives both the garden and fire visuals. No separate game logic per worldview.
- **Centralized translation**: All perception mapping lives in `client/src/perception/`. No fire/garden logic scattered across components.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both server and client in dev mode |
| `npm run dev:server` | Start only the server |
| `npm run dev:client` | Start only the client |
| `npm run build` | Build all packages for production |
