import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Person,
  Circle,
  Refresh,
  People
} from '@mui/icons-material';
import { authService } from '../../services/auth/authService';
import { socketService } from '../../services/socket/socketService';
import { formatDistanceToNow } from 'date-fns';

const OnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize socket connection for online users
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        setLoading(true);
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          setLoading(false);
          return;
        }

        const userData = {
          userId: currentUser.id,
          username: currentUser.username,
          email: currentUser.email
        };

        // Subscribe to socket events BEFORE connecting to catch all events
        const unsubscribeUsersList = socketService.on('users:list', (users) => {
          if (Array.isArray(users)) {
            setOnlineUsers(users);
            setLastUpdated(new Date());
            setLoading(false);
          }
        });

        const unsubscribeUserOnline = socketService.on('user:online', (user) => {
          setOnlineUsers(prev => {
            // Check if user already exists
            const existingIndex = prev.findIndex(u => u.id === user.id);
            if (existingIndex >= 0) {
              // Update existing user
              const updated = [...prev];
              updated[existingIndex] = { ...updated[existingIndex], ...user, isOnline: true };
              return updated;
            }
            // Add new user
            return [...prev, { ...user, isOnline: true }];
          });
          setLastUpdated(new Date());
        });

        const unsubscribeUserOffline = socketService.on('user:offline', (user) => {
          setOnlineUsers(prev => prev.filter(u => u.id !== user.id));
          setLastUpdated(new Date());
        });

        const unsubscribeConnect = socketService.on('connect', () => {
          setIsConnected(true);
        });

        const unsubscribeDisconnect = socketService.on('disconnect', () => {
          setIsConnected(false);
        });

        // Connect to socket if not already connected
        if (!socketService.getConnectionStatus()) {
          await socketService.connect(userData);
        } else {
          // If already connected, re-emit user:join to get fresh users list
          const socket = socketService.getSocket();
          if (socket && socket.connected) {
            socket.emit('user:join', userData);
          }
        }

        setIsConnected(socketService.getConnectionStatus());

        // Wait a bit for users:list event, then check if we got users
        const checkUsersTimeout = setTimeout(() => {
          setOnlineUsers(currentUsers => {
            if (currentUsers.length === 0 && socketService.getConnectionStatus()) {
              const socket = socketService.getSocket();
              if (socket && socket.connected) {
                socket.emit('user:join', userData);
              }
            }
            return currentUsers; // Return unchanged
          });
        }, 1500);

        // Cleanup timeout
        return () => {
          clearTimeout(checkUsersTimeout);
          unsubscribeUsersList();
          unsubscribeUserOnline();
          unsubscribeUserOffline();
          unsubscribeConnect();
          unsubscribeDisconnect();
        };

        // Cleanup
        return () => {
          unsubscribeUsersList();
          unsubscribeUserOnline();
          unsubscribeUserOffline();
          unsubscribeConnect();
          unsubscribeDisconnect();
        };
      } catch (error) {
        console.error('Failed to initialize socket for online users:', error);
        setLoading(false);
      }
    };

    initializeSocket();
  }, []);

  const fetchOnlineUsers = async () => {
    setLoading(true);
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const userData = {
        userId: currentUser.id,
        username: currentUser.username,
        email: currentUser.email
      };

      // If socket is not connected, connect it
      if (!socketService.getConnectionStatus()) {
        await socketService.connect(userData);
      } else {
        // If already connected, re-emit user:join to get fresh users list
        const socket = socketService.getSocket();
        if (socket && socket.connected) {
          socket.emit('user:join', userData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch online users:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (isOnline) => {
    return isOnline ? 'success' : 'default';
  };

  const getStatusText = (isOnline, lastSeen) => {
    if (isOnline) {
      return 'Active';
    }
    if (lastSeen) {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    }
    return 'Offline';
  };

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <People fontSize="small" />
          Online Users
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={onlineUsers.length} color="primary">
            <Circle color={isConnected ? 'success' : 'default'} fontSize="small" />
          </Badge>
          <Tooltip title="Refresh">
            <IconButton 
              size="small" 
              onClick={fetchOnlineUsers}
              disabled={loading}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {lastUpdated && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        </Typography>
      )}

      {loading && onlineUsers.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Loading online users...
          </Typography>
        </Box>
      ) : onlineUsers.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No users online
          </Typography>
        </Box>
      ) : (
        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
          {onlineUsers.map((user) => (
            <ListItem key={user.id} sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar 
                  src={user.avatar_url || user.avatar || undefined}
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: (user.avatar_url || user.avatar) ? 'transparent' : 'primary.main'
                  }}
                  imgProps={{
                    onError: (e) => {
                      e.target.style.display = 'none';
                    }
                  }}
                >
                  {(!user.avatar_url && !user.avatar) && (
                    user.username?.charAt(0).toUpperCase() || 'U'
                  )}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography component="span" variant="body2" noWrap>
                      {user.username || 'Anonymous'}
                    </Typography>
                    <Chip
                      size="small"
                      label={getStatusText(user.isOnline || user.is_online, user.lastSeen || user.last_seen)}
                      color={getStatusColor(user.isOnline || user.is_online)}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {(user.isOnline || user.is_online)
                      ? 'Currently active' 
                      : user.lastSeen || user.last_seen
                        ? `Last seen ${formatDistanceToNow(new Date(user.lastSeen || user.last_seen), { addSuffix: true })}`
                        : 'Offline'
                    }
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          {onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''} online
        </Typography>
      </Box>
    </Paper>
  );
};

export default OnlineUsers;
