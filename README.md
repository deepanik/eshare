# eShare - Secure Decentralized File Sharing Platform

A modern, decentralized file sharing platform built with React, Socket.io, and Web3 technologies. eShare enables secure file uploads, encrypted storage on IPFS, real-time chat, and blockchain wallet integration.

## 🌟 Features

### Core Features
- **Secure File Upload**: Upload files with optional end-to-end encryption
- **IPFS Storage**: Decentralized storage using IPFS (Pinata) for high availability
- **Real-time Chat**: Global chat functionality with Socket.io
- **Online Users**: See who's online in real-time
- **User Profiles**: Manage your profile with avatar support
- **Wallet Integration**: Connect with MetaMask, Coinbase Wallet, or WalletConnect
- **Encryption**: AES encryption for secure file sharing
- **File Management**: Download, share, and delete files with access control

### Additional Features
- **Dark/Light Theme**: Toggle between themes
- **Responsive Design**: Works on desktop and mobile devices
- **Payment Integration**: Web3 payment support for premium features
- **Settings Management**: Customize your experience
- **Developer Tools**: Built-in developer utilities

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Material-UI (MUI)** - Component library
- **React Router** - Routing
- **Socket.io Client** - Real-time communication
- **Web3.js** - Blockchain interactions
- **WalletConnect** - Wallet connections
- **Tailwind CSS** - Styling

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Socket.io** - WebSocket server
- **Supabase** - Database and authentication
- **CORS** - Cross-origin resource sharing

### Storage & Services
- **IPFS (Pinata)** - Decentralized file storage
- **Supabase** - User authentication and database
- **Arweave** - Permanent storage option
- **Web3.Storage** - Additional storage option

## 📋 Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- A Pinata account for IPFS storage
- A WalletConnect Cloud project (for wallet connections)
- Git

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/eshare.git
cd eshare
```

### 2. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
npm install
cd ..
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Socket.io Backend URL
VITE_SOCKET_URL=http://localhost:3002

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Pinata IPFS Configuration
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key

# WalletConnect Configuration
VITE_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id

# App Configuration
VITE_APP_NAME=eShare
VITE_APP_VERSION=2.0.0
VITE_APP_DESCRIPTION=Secure Decentralized File Sharing Platform

# Development Configuration
VITE_DEV_MODE=true
VITE_DEBUG_MODE=false
```

Create a `backend/.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Server Configuration
FRONTEND_URL=http://localhost:5173
PORT=3002
```

### 4. Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Create the following tables:
   - `user_profiles` - User profile information
   - `chat_messages` - Chat message history
   - `files` - File metadata (if using Supabase for file tracking)

### 5. Run the Application

**Start the backend server:**
```bash
cd backend
npm start
# or for development with auto-reload:
npm run dev
```

**Start the frontend (in a new terminal):**
```bash
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3002`

## 📦 Deployment

### Backend Deployment (Render)

1. **Create a Web Service on Render:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure the service:**
   - **Name:** `eshare-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

3. **Set Environment Variables:**
   - `NODE_ENV` = `production`
   - `SUPABASE_URL` = Your Supabase URL
   - `SUPABASE_SERVICE_KEY` = Your Supabase service key
   - `FRONTEND_URL` = Your frontend URL (e.g., `https://your-app.vercel.app`)

4. **Deploy:**
   - Render will automatically build and deploy
   - Copy the service URL (e.g., `https://eshare-backend.onrender.com`)

### Frontend Deployment (Vercel)

1. **Connect to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Import your GitHub repository

2. **Configure Environment Variables:**
   - Add all `VITE_*` variables from your `.env` file
   - Update `VITE_SOCKET_URL` to your Render backend URL

3. **Deploy:**
   - Vercel will automatically detect Vite and deploy
   - Your app will be available at `https://your-app.vercel.app`

### WalletConnect Setup

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Add your production domain to allowed domains:
   - `your-app.vercel.app`
   - `localhost:5173` (for development)

## 📁 Project Structure

```
eshare/
├── backend/              # Backend server
│   ├── socketchat.js     # Socket.io server
│   ├── package.json
│   └── render.yaml       # Render deployment config
├── src/
│   ├── components/       # React components
│   │   ├── auth/         # Authentication components
│   │   ├── files/        # File management components
│   │   ├── Globalchat/   # Chat components
│   │   ├── profile/      # User profile components
│   │   └── wallet/       # Wallet connection components
│   ├── services/         # Business logic services
│   │   ├── auth/         # Authentication service
│   │   ├── files/        # File service
│   │   ├── socket/       # Socket.io service
│   │   └── wallet/      # Wallet service
│   ├── App.jsx           # Main app component
│   └── main.jsx          # Entry point
├── public/                # Static assets
├── .env.example          # Environment variables template
├── vercel.json           # Vercel deployment config
└── package.json          # Frontend dependencies
```

## 🔌 API Endpoints

### Backend API

- `GET /health` - Health check endpoint
- `GET /api/online-users` - Get list of online users
- `GET /api/messages` - Get chat message history
- `DELETE /api/messages` - Delete all messages (admin only)

### Socket.io Events

**Client → Server:**
- `user:join` - User joins with their info
- `message:send` - Send a chat message
- `typing:start` - User starts typing
- `typing:stop` - User stops typing
- `messages:load-older` - Load older messages
- `messages:delete` - Delete chat history (admin only)

**Server → Client:**
- `user:online` - New user came online
- `user:offline` - User went offline
- `users:list` - List of all online users
- `message:new` - New chat message
- `messages:history` - Chat message history
- `messages:older` - Older messages loaded
- `messages:deleted` - Messages were deleted
- `typing:user` - User is typing
- `typing:stop` - User stopped typing

## 🔐 Security

- **Encryption**: Files are encrypted using AES before upload
- **CORS**: Configured to allow only trusted origins
- **Authentication**: Supabase authentication for user management
- **Environment Variables**: Sensitive data stored in environment variables

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- **Deepanik** - Initial work
- **Prateek** - Contributions

## 🙏 Acknowledgments

- Credit to Kumud for inspiration
- Material-UI for the component library
- Supabase for authentication and database
- Pinata for IPFS storage
- WalletConnect for wallet integration

## 📞 Support

For support, email your-email@example.com or open an issue in the repository.

## 🔗 Links

- [Live Demo](https://eshare-two.vercel.app)
- [Backend API](https://eshare-backend.onrender.com)
- [Documentation](./docs)

---

Made with ❤️ using React, Socket.io, and Web3 technologies

