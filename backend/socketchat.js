import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://glfuhacswvonafwcrylk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZnVoYWNzd3ZvbmFmd2NyeWxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NDgzOTMsImV4cCI6MjA3NzIyNDM5M30.Jw5Xb71iD6ePGAHtyKeOIN1ZROcF5iRJWT8fKFQKyxE';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure CORS for Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "DELETE"],
    credentials: true
  }
});

// Store online users and their socket IDs
const onlineUsers = new Map(); // userId -> { socketId, username, email, joinedAt }

// Admin username
const ADMIN_USERNAME = 'deepanik';

// Initialize chat_messages table if it doesn't exist
const initDatabase = async () => {
  try {
    // Check if table exists by trying to query it
    const { error } = await supabase
      .from('chat_messages')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.warn('⚠️  chat_messages table does not exist. Please create it in Supabase.');
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
};

initDatabase();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', onlineUsers: onlineUsers.size });
});

// Get online users endpoint
app.get('/api/online-users', (req, res) => {
  const users = Array.from(onlineUsers.values()).map(user => ({
    id: user.userId,
    username: user.username,
    email: user.email,
    avatar_url: user.avatar_url || null,
    isOnline: true,
    joinedAt: user.joinedAt
  }));
  res.json(users);
});

// Get chat messages endpoint
app.get('/api/messages', async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Error fetching messages:', error);
      res.json([]);
      return;
    }
    
    // Enrich messages with avatar_url from user_profiles
    const enrichedMessages = await Promise.all((messages || []).map(async (msg) => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('avatar_url')
          .eq('id', msg.user_id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error(`Error fetching avatar for user ${msg.user_id}:`, profileError);
        }
        
        const avatarUrl = profile?.avatar_url || null;
        
        return {
          ...msg,
          userId: msg.user_id,
          avatar_url: avatarUrl
        };
      } catch (err) {
        console.error(`Error enriching message for user ${msg.user_id}:`, err);
        return {
          ...msg,
          userId: msg.user_id,
          avatar_url: null
        };
      }
    }));
    
    res.json(enrichedMessages || []);
  } catch (error) {
    console.error('Error in /api/messages:', error);
    res.json([]);
  }
});

// Delete all chat messages (admin only)
app.delete('/api/messages', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (username !== ADMIN_USERNAME) {
      return res.status(403).json({ error: 'Only admin can delete chat history' });
    }
    
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '0'); // Delete all messages
    
    if (error) {
      console.error('Error deleting messages:', error);
      return res.status(500).json({ error: 'Failed to delete messages' });
    }
    
    // Notify all clients that messages were deleted
    io.emit('messages:deleted', { deletedBy: username });
    
    res.json({ success: true, message: 'All messages deleted' });
  } catch (error) {
    console.error('Error in DELETE /api/messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

io.on('connection', (socket) => {

  // User joins with their user info
  socket.on('user:join', async (userData) => {
    const { userId, username, email } = userData;
    
    if (!userId) {
      socket.emit('error', { message: 'User ID is required' });
      return;
    }

    // Fetch user profile to get avatar_url
    let avatarUrl = null;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();
      
      if (profile?.avatar_url) {
        avatarUrl = profile.avatar_url;
      }
    } catch (error) {
      console.error('Error fetching avatar_url:', error);
    }

    // Check if user already exists (reconnection scenario)
    const existingUser = onlineUsers.get(userId);
    const isReconnection = existingUser && existingUser.socketId !== socket.id;

    // Store/update user info
    onlineUsers.set(userId, {
      socketId: socket.id,
      userId,
      username: username || email?.split('@')[0] || 'Anonymous',
      email: email || '',
      avatar_url: avatarUrl,
      joinedAt: existingUser?.joinedAt || new Date().toISOString()
    });

    // Notify all clients about the new user
    const newUserData = {
      id: userId,
      username: username || email?.split('@')[0] || 'Anonymous',
      email: email || '',
      avatar_url: avatarUrl,
      isOnline: true,
      joinedAt: new Date().toISOString()
    };
    io.emit('user:online', newUserData);

    // Get current online users list
    const currentUsers = Array.from(onlineUsers.values()).map(user => ({
      id: user.userId,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url || null,
      isOnline: true,
      joinedAt: user.joinedAt
    }));
    
    // Send current online users to the newly connected user
    socket.emit('users:list', currentUsers);
    
    // Also broadcast updated users list to all clients
    io.emit('users:list', currentUsers);

    // Load and send recent chat messages from database (always, even on reconnection)
    // Initially load only the last 20 messages for lazy loading
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20); // Load only recent messages initially
      
      if (error) {
        console.error('Error loading messages:', error);
        socket.emit('messages:history', []);
      } else {
        // Enrich messages with avatar_url from user_profiles
        const enrichedMessages = await Promise.all((messages || []).map(async (msg) => {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('avatar_url')
              .eq('id', msg.user_id)
              .single();
            
            if (profileError) {
              console.error(`❌ Error fetching avatar for user ${msg.user_id} (${msg.username}):`, {
                code: profileError.code,
                message: profileError.message,
                details: profileError.details,
                hint: profileError.hint
              });
            }
            
            const avatarUrl = profile?.avatar_url || null;
            
            return {
              ...msg,
              userId: msg.user_id, // Ensure userId is set
              avatar_url: avatarUrl
            };
          } catch (err) {
            console.error(`Error enriching message for user ${msg.user_id}:`, err);
            // If profile fetch fails, return message without avatar_url
            return {
              ...msg,
              userId: msg.user_id,
              avatar_url: null
            };
          }
        }));
        
        // Reverse to show oldest first, then newest
        const sortedMessages = enrichedMessages.reverse();
        socket.emit('messages:history', sortedMessages);
      }
    } catch (error) {
      console.error('Error fetching message history:', error);
      socket.emit('messages:history', []);
    }
  });

  // Handle chat messages
  socket.on('message:send', async (messageData) => {
    const user = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
    
    if (!user) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.userId,
      user_id: user.userId,
      username: user.username,
      email: user.email || '',
      avatar_url: user.avatar_url || null,
      text: messageData.text,
      timestamp: new Date().toISOString()
    };

    // Save message to database
    try {
      const { error: dbError } = await supabase
        .from('chat_messages')
        .insert({
          id: message.id,
          user_id: message.user_id,
          username: message.username,
          email: message.email,
          text: message.text,
          timestamp: message.timestamp
        });
      
      if (dbError) {
        console.error('Error saving message to database:', dbError);
        // Still broadcast the message even if DB save fails
      }
    } catch (error) {
      console.error('Error inserting message:', error);
    }

    // Broadcast message to all connected clients
    io.emit('message:new', message);
    
  });

  // Handle delete chat history (admin only)
  socket.on('messages:delete', async (data) => {
    const user = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
    
    if (!user) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }

    if (user.username !== ADMIN_USERNAME) {
      socket.emit('error', { message: 'Only admin can delete chat history' });
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .neq('id', '0');
      
      if (error) {
        console.error('Error deleting messages:', error);
        socket.emit('error', { message: 'Failed to delete messages' });
        return;
      }

      // Notify ALL clients that messages were deleted (broadcast to everyone)
      io.emit('messages:deleted', { deletedBy: user.username });
      
      // Also send confirmation to the admin
      socket.emit('messages:delete:success', { message: 'All messages deleted successfully' });
    } catch (error) {
      console.error('Error deleting messages:', error);
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  // Handle loading older messages (lazy loading)
  socket.on('messages:load-older', async (data) => {
    const { beforeTimestamp, limit = 20 } = data;
    
    if (!beforeTimestamp) {
      socket.emit('messages:older', []);
      return;
    }

    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .lt('timestamp', beforeTimestamp) // Get messages before this timestamp
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error loading older messages:', error);
        socket.emit('messages:older', []);
        return;
      }

      // Enrich messages with avatar_url from user_profiles
      const enrichedMessages = await Promise.all((messages || []).map(async (msg) => {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('avatar_url')
            .eq('id', msg.user_id)
            .single();
          
          if (profileError) {
            console.error(`Error fetching avatar for user ${msg.user_id}:`, profileError);
          }
          
          const avatarUrl = profile?.avatar_url || null;
          
          return {
            ...msg,
            userId: msg.user_id,
            avatar_url: avatarUrl
          };
        } catch (err) {
          console.error(`Error enriching message for user ${msg.user_id}:`, err);
          return {
            ...msg,
            userId: msg.user_id,
            avatar_url: null
          };
        }
      }));
      
      // Reverse to show oldest first, then newest
      const sortedMessages = enrichedMessages.reverse();
      socket.emit('messages:older', sortedMessages);
    } catch (error) {
      console.error('Error fetching older messages:', error);
      socket.emit('messages:older', []);
    }
  });

  // Handle typing indicators
  socket.on('typing:start', () => {
    const user = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
    if (user) {
      socket.broadcast.emit('typing:user', {
        userId: user.userId,
        username: user.username
      });
    }
  });

  socket.on('typing:stop', () => {
    const user = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
    if (user) {
      socket.broadcast.emit('typing:stop', {
        userId: user.userId
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    const user = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
    
    if (user) {
      // Check if user has reconnected with a different socket ID
      // Only remove if no other socket exists for this user
      const userStillOnline = Array.from(onlineUsers.values()).some(
        u => u.userId === user.userId && u.socketId !== socket.id
      );
      
      if (!userStillOnline) {
        // User truly disconnected, remove from online users
        onlineUsers.delete(user.userId);
        
        // Notify all clients that user went offline
        io.emit('user:offline', {
          id: user.userId,
          isOnline: false
        });
        
        // Broadcast updated users list
        const currentUsers = Array.from(onlineUsers.values()).map(u => ({
          id: u.userId,
          username: u.username,
          email: u.email,
          avatar_url: u.avatar_url || null,
          isOnline: true,
          joinedAt: u.joinedAt
        }));
        io.emit('users:list', currentUsers);
      } else {
      }
    }
  });
});

const PORT = process.env.PORT || 3002;

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.io server running on port ${PORT}`);
  console.log(`📡 CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
});
