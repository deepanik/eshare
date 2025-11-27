# eShare Backend - Socket.io Server

This is the Socket.io server for eShare's real-time chat and online users functionality.

## Features

- Real-time chat messaging
- Online users tracking
- Message history with lazy loading
- Typing indicators
- Admin controls for chat management
- CORS configuration for secure cross-origin requests

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
# Alternative: Use SUPABASE_ANON_KEY if service key is not available
# SUPABASE_ANON_KEY=your_supabase_anon_key

# Server Configuration
FRONTEND_URL=http://localhost:5173
PORT=3002
```

### 3. Start the Server

**Production:**
```bash
npm start
```

**Development (with auto-reload):**
```bash
npm run dev
```

The server will run on `http://localhost:3002` by default.

## API Endpoints

### REST Endpoints

- `GET /` - API information
- `GET /health` - Health check endpoint
- `GET /api/online-users` - Get list of online users
- `GET /api/messages` - Get chat message history (last 100 messages)
- `DELETE /api/messages` - Delete all chat messages (admin only)

### Socket.io Events

#### Client → Server

- `user:join` - User joins with their info `{ userId, username, email }`
- `message:send` - Send a chat message `{ text }`
- `typing:start` - User starts typing
- `typing:stop` - User stops typing
- `messages:load-older` - Load older messages `{ beforeTimestamp, limit }`
- `messages:delete` - Delete chat history (admin only)

#### Server → Client

- `user:online` - New user came online `{ id, username, email, avatar_url, isOnline, joinedAt }`
- `user:offline` - User went offline `{ id, isOnline }`
- `users:list` - List of all online users `[{ id, username, email, avatar_url, isOnline, joinedAt }]`
- `message:new` - New chat message `{ id, userId, username, email, avatar_url, text, timestamp }`
- `messages:history` - Chat message history `[{ id, userId, username, email, avatar_url, text, timestamp }]`
- `messages:older` - Older messages loaded `[{ id, userId, username, email, avatar_url, text, timestamp }]`
- `messages:deleted` - Messages were deleted `{ deletedBy }`
- `typing:user` - User is typing `{ userId, username }`
- `typing:stop` - User stopped typing `{ userId }`
- `error` - Error occurred `{ message }`

## Database Schema

### chat_messages Table

```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### user_profiles Table

The server also references `user_profiles` table for avatar URLs:

```sql
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  ...
);
```

## CORS Configuration

The server is configured to allow requests from:
- `http://localhost:5173` (local development)
- `https://eshare-two.vercel.app` (production frontend)
- `https://www.eshare-two.vercel.app` (www variant)

CORS origins are configured in `socketchat.js` and can be customized via environment variables.

## Admin Features

Admin usernames are defined in the frontend (`src/components/Globalchat/global.jsx`):
- `deepanik`
- `prateek`

Admins can:
- Delete all chat messages via REST API or Socket.io event
- Access admin-only features

## Deployment

### Render Deployment

See the main [README.md](../README.md) for detailed deployment instructions.

**Quick Steps:**
1. Create a Web Service on Render
2. Set Root Directory to `backend`
3. Set Build Command to `npm install`
4. Set Start Command to `npm start`
5. Add environment variables
6. Deploy

The `render.yaml` file can be used for Blueprint deployment.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes* |
| `SUPABASE_ANON_KEY` | Supabase anonymous key (alternative) | Yes* |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `PORT` | Server port (default: 3002) | No |
| `NODE_ENV` | Environment (production/development) | No |

*Either `SUPABASE_SERVICE_KEY` or `SUPABASE_ANON_KEY` is required.

## Troubleshooting

### Connection Issues

- **CORS errors**: Verify `FRONTEND_URL` matches your frontend URL exactly
- **Database errors**: Ensure Supabase tables are created
- **Port conflicts**: Change `PORT` in `.env` if 3002 is in use

### Common Issues

1. **Messages not saving**: Check Supabase connection and table permissions
2. **Users not showing online**: Verify Socket.io connection is established
3. **CORS errors**: Check allowed origins in `socketchat.js`

## Logging

The server logs:
- Allowed CORS origins on startup
- Each socket connection with origin
- CORS rejections with details
- Database errors
- Server startup information

## License

MIT

