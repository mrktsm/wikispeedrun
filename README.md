# Wiki Crawlers

A Wikipedia speedrun racing game.

## Project Structure

```
/wiki
  /client    - React frontend (Vite + TypeScript)
  /server    - Go backend (WebSocket racing server)
```

## Development

### Frontend

```bash
cd client
npm install
npm run dev
```

Runs on http://localhost:5173

### Backend

```bash
cd server
go mod tidy
go run .
```

Runs on http://localhost:8080

### WebSocket API

Connect to `ws://localhost:8080/ws`

#### Message Types

| Type            | Direction | Description                |
| --------------- | --------- | -------------------------- |
| `join_room`     | → Server  | Join/create a racing room  |
| `leave_room`    | → Server  | Leave current room         |
| `start_race`    | → Server  | Start the race (host only) |
| `navigate`      | → Server  | Player clicked a link      |
| `finish`        | → Server  | Player reached end article |
| `room_state`    | ← Server  | Full room state on join    |
| `player_joined` | ← Server  | New player joined          |
| `player_left`   | ← Server  | Player disconnected        |
| `race_started`  | ← Server  | Race has begun             |
| `player_update` | ← Server  | Player position update     |
| `player_finish` | ← Server  | Player completed the race  |

#### Example: Join Room

```json
{
  "type": "join_room",
  "payload": {
    "roomId": "abc123",
    "playerName": "Alice",
    "startArticle": "Cat",
    "endArticle": "Dog"
  }
}
```
