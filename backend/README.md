# eShare Socket.io Backend

This is the Socket.io server for real-time chat and online users functionality.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set environment variables (optional):
```bash
# Create .env file or set environment variables
FRONTEND_URL=http://localhost:5173
PORT=3002
```

3. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will run on `http://localhost:3002` by default.

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/online-users` - Get list of online users
- `GET /api/messages` - Get chat message history

## Socket.io Events

### Client → Server
- `user:join` - User joins with their info
- `message:send` - Send a chat message
- `typing:start` - User starts typing
- `typing:stop` - User stops typing

### Server → Client
- `user:online` - New user came online
- `user:offline` - User went offline
- `users:list` - List of all online users
- `message:new` - New chat message
- `messages:history` - Chat message history
- `typing:user` - User is typing
- `typing:stop` - User stopped typing

