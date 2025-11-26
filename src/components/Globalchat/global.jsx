import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  Avatar,
  InputAdornment,
  CircularProgress,
  Chip,
  Divider,
  Popover,
  Button,
  Alert,
  Tooltip,
  InputBase,
  ListItemAvatar
} from '@mui/material';
import {
  Send as SendIcon,
  Chat as ChatIcon,
  Mood as MoodIcon,
  Delete as DeleteIcon,
  People,
  Circle,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import EmojiPicker from 'emoji-picker-react';
import { formatDistanceToNow } from 'date-fns';
import { socketService } from '../../services/socket/socketService';
import { authService } from '../../services/auth/authService';

const GlobalChat = () => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const usersListEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const historyLoadedRef = useRef(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const inputRef = useRef(null);
  const isLoadingOlderRef = useRef(false);
  const ADMIN_USERNAMES = ['deepanik', 'prateek'];
  const isAdmin = currentUser?.username && ADMIN_USERNAMES.includes(currentUser.username);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Silently fail if audio context is not available
      console.debug('Could not play notification sound:', error);
    }
  };

  // Scroll to bottom when new messages arrive
  const scrollToBottom = (forceInstant = false) => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Try to use the container ref first
        if (messagesContainerRef.current) {
          const container = messagesContainerRef.current;
          if (forceInstant) {
            container.scrollTop = container.scrollHeight;
          } else {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          }
        } else if (messagesEndRef.current) {
          // Fallback to scrollIntoView
          if (forceInstant) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end', inline: 'nearest' });
          } else {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
          }
        }
      }, forceInstant ? 300 : 50);
    });
  };

  // Scroll to bottom when messages change (for new messages)
  useEffect(() => {
    if (messages.length > 0 && !historyLoaded) {
      // Only auto-scroll for new messages, not on initial load
      const timeoutId = setTimeout(() => {
        scrollToBottom(false);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, historyLoaded]);

  // Force scroll to bottom when history is loaded (on refresh/initial load)
  useEffect(() => {
    if (historyLoaded && messages.length > 0) {
      // Multiple attempts to ensure scroll happens after DOM is fully rendered
      const timeoutId1 = setTimeout(() => {
        scrollToBottom(true);
      }, 200);
      
      const timeoutId2 = setTimeout(() => {
        scrollToBottom(true);
      }, 500);
      
      const timeoutId3 = setTimeout(() => {
        scrollToBottom(true);
      }, 800);
      
      const timeoutId4 = setTimeout(() => {
        scrollToBottom(true);
      }, 1200);
      
      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
        clearTimeout(timeoutId4);
      };
    }
  }, [messages.length, historyLoaded]);

  // Auto-scroll users list when it updates
  useEffect(() => {
    setTimeout(() => {
      usersListEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [onlineUsers]);

  // Initialize socket connection
  useEffect(() => {
    let isMounted = true;
    let unsubscribers = [];
    
    const initializeChat = async () => {
      try {
        // Get current user
        const user = await authService.getCurrentUser();
        if (!user) {
          setLoading(false);
          return;
        }

        setCurrentUser(user);

        // Connect to socket
        // Subscribe to socket events BEFORE connecting to catch all events
        // This ensures we don't miss messages:history or users:list events
        
        // Set up event handlers first
        const unsubscribeMessage = socketService.on('message:new', (message) => {
          if (!isMounted) return;
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some(msg => msg.id === message.id);
            if (exists) {
              return prev;
            }
            // Always add new messages (history will merge/override if needed)
            
            // Play notification sound for new messages (not from current user)
            if (currentUser && message.userId !== currentUser.id) {
              playNotificationSound();
            }
            
            const updated = [...prev, message];
            // Auto-scroll to bottom after adding message (only if not loading history)
            if (historyLoadedRef.current) {
              setTimeout(() => {
                scrollToBottom(false);
              }, 100);
            }
            return updated;
          });
        });

        const unsubscribeHistory = socketService.on('messages:history', (history) => {
          if (!isMounted) return;
          if (!Array.isArray(history)) {
            console.warn('⚠️ Invalid history format:', history);
            return;
          }
          setMessages(prev => {
            // If history is empty and we have no messages, set empty array
            if (history.length === 0 && prev.length === 0) {
              historyLoadedRef.current = true;
              setHistoryLoaded(true);
              setHasMoreMessages(false);
              return [];
            }
            
            // Merge history with existing messages, avoiding duplicates
            const existingIds = new Set(prev.map(msg => msg.id));
            const historyIds = new Set(history.map(msg => msg.id));
            
            // Keep existing messages that aren't in history (new messages sent before history loaded)
            const newMessages = prev.filter(msg => !historyIds.has(msg.id));
            
            // Combine and sort by timestamp
            const combined = [...history, ...newMessages].sort((a, b) => 
              new Date(a.timestamp) - new Date(b.timestamp)
            );
            
            historyLoadedRef.current = true;
            setHistoryLoaded(true);
            // If we got less than 20 messages, there are no more to load
            setHasMoreMessages(history.length >= 20);
            
            return combined;
          });
        });

        // Handle older messages loading
        const unsubscribeOlderMessages = socketService.on('messages:older', (olderMessages) => {
          if (!isMounted) return;
          if (!Array.isArray(olderMessages)) {
            setLoadingOlder(false);
            isLoadingOlderRef.current = false;
            return;
          }
          
          setMessages(prev => {
            if (olderMessages.length === 0) {
              setHasMoreMessages(false);
              setLoadingOlder(false);
              isLoadingOlderRef.current = false;
              return prev;
            }
            
            // Store current scroll position and height before adding messages
            const container = messagesContainerRef.current;
            const previousScrollHeight = container ? container.scrollHeight : 0;
            const previousScrollTop = container ? container.scrollTop : 0;
            
            // Merge older messages with existing, avoiding duplicates
            const existingIds = new Set(prev.map(msg => msg.id));
            const newOlderMessages = olderMessages.filter(msg => !existingIds.has(msg.id));
            
            // Prepend older messages (they are older, so should be at the beginning)
            const combined = [...newOlderMessages, ...prev].sort((a, b) => 
              new Date(a.timestamp) - new Date(b.timestamp)
            );
            
            // If we got less than requested, no more messages
            setHasMoreMessages(olderMessages.length >= 20);
            setLoadingOlder(false);
            isLoadingOlderRef.current = false;
            
            // Maintain scroll position after loading older messages
            requestAnimationFrame(() => {
              if (container) {
                const newScrollHeight = container.scrollHeight;
                const heightDifference = newScrollHeight - previousScrollHeight;
                container.scrollTop = previousScrollTop + heightDifference;
              }
            });
            
            return combined;
          });
        });

        const unsubscribeUsersList = socketService.on('users:list', (users) => {
          if (!isMounted) return;
          if (Array.isArray(users) && users.length > 0) {
            setOnlineUsers(users);
            // Auto-scroll users list
            setTimeout(() => {
              usersListEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          } else {
            console.warn('⚠️ Invalid users list format:', users);
          }
        });

        const unsubscribeUserOnline = socketService.on('user:online', (user) => {
          if (!isMounted) return;
          if (!user || !user.id) {
            console.warn('⚠️ Invalid user:online event data:', user);
            return;
          }
          setOnlineUsers(prev => {
            const exists = prev.find(u => u.id === user.id);
            if (exists) {
              return prev.map(u => u.id === user.id ? { ...u, ...user, isOnline: true } : u);
            }
            const updated = [...prev, { ...user, isOnline: true }];
            // Auto-scroll users list
            setTimeout(() => {
              usersListEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            return updated;
          });
        });

        const unsubscribeUserOffline = socketService.on('user:offline', (user) => {
          setOnlineUsers(prev => prev.filter(u => u.id !== user.id));
        });

        const unsubscribeConnect = socketService.on('connect', () => {
          setIsConnected(true);
        });

        const unsubscribeDisconnect = socketService.on('disconnect', () => {
          setIsConnected(false);
        });

        const unsubscribeTyping = socketService.on('typing:user', (data) => {
          setTypingUsers(prev => new Set([...prev, data.username]));
          // Clear typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.username);
              return newSet;
            });
          }, 3000);
        });

        const unsubscribeTypingStop = socketService.on('typing:stop', (data) => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            // Remove user from typing set
            Array.from(newSet).forEach(username => {
              // We don't have userId in the event, so we'll rely on timeout
            });
            return newSet;
          });
        });

        const unsubscribeMessagesDeleted = socketService.on('messages:deleted', (data) => {
          setMessages([]);
          // Show notification
          if (data.deletedBy) {
            // Use a better notification method
            const notification = document.createElement('div');
            notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 16px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.3);';
            notification.textContent = `Chat history deleted by ${data.deletedBy}`;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
          }
        });
        
        // Now connect to socket
        await socketService.connect({
          userId: user.id,
          username: user.username,
          email: user.email
        });

        // Wait for connection and initial data
        await new Promise(resolve => setTimeout(resolve, 1000));

        const connected = socketService.getConnectionStatus();
        setIsConnected(connected);
        
        // If still not connected, try to reconnect
        if (!connected) {
          setTimeout(async () => {
            try {
              await socketService.connect({
                userId: user.id,
                username: user.username,
                email: user.email
              });
              setIsConnected(socketService.getConnectionStatus());
            } catch (err) {
              console.error('❌ Reconnection failed:', err);
            }
          }, 1000);
        }
        
        setLoading(false);

        // Store all unsubscribers
        unsubscribers = [
          unsubscribeMessage,
          unsubscribeHistory,
          unsubscribeOlderMessages,
          unsubscribeUsersList,
          unsubscribeUserOnline,
          unsubscribeUserOffline,
          unsubscribeConnect,
          unsubscribeDisconnect,
          unsubscribeTyping,
          unsubscribeTypingStop,
          unsubscribeMessagesDeleted
        ];
        
        // Cleanup on unmount
        return () => {
          isMounted = false;
          // Unsubscribe from all events
          unsubscribers.forEach(unsub => {
            if (typeof unsub === 'function') {
              unsub();
            }
          });
          unsubscribers = [];
        };
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setLoading(false);
      }
    };

    initializeChat();
  }, []);

  // Handle typing indicator
  const handleTyping = () => {
    if (socketService.getConnectionStatus()) {
      socketService.startTyping();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping();
      }, 2000);
    }
  };

  // Handle send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!messageText.trim() || !isConnected) {
      return;
    }

    try {
      const text = messageText.trim();
      socketService.sendMessage(text);
      setMessageText('');
      socketService.stopTyping();
      setEmojiPickerOpen(false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
    }
  };

  // Handle emoji picker
  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji;
    const input = inputRef.current?.querySelector('input') || inputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = messageText.substring(0, start) + emoji + messageText.substring(end);
      setMessageText(text);
      // Set cursor position after emoji
      setTimeout(() => {
        if (input.setSelectionRange) {
          input.setSelectionRange(start + emoji.length, start + emoji.length);
          input.focus();
        }
      }, 0);
    } else {
      setMessageText(prev => prev + emoji);
    }
    setEmojiPickerOpen(false);
  };

  // Handle delete chat history (admin only)
  const handleDeleteHistory = async () => {
    if (!isAdmin) {
      return;
    }

    if (!window.confirm('Are you sure you want to delete all chat history? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete via socket - use the socket instance directly
      const socket = socketService.getSocket();
      if (socketService.getConnectionStatus() && socket) {
        socket.emit('messages:delete', {});
        // The server will emit 'messages:deleted' event which we're listening to
      } else {
        // Fallback to HTTP API
        const response = await fetch('https://eshare-backend.onrender.comapi/messages', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: currentUser.username })
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete messages');
        }
        // Manually clear messages if HTTP request succeeds
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Failed to delete messages:', error);
      alert('Failed to delete chat history. Please try again.');
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (!currentUser) {
    return (
      <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Please sign in to use global chat
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      height: 'calc(100vh - 64px - 48px)', // Full height minus toolbar and padding
      gap: 2, 
      minHeight: 0,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Main Chat Area - Telegram Style */}
      <Paper sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0, 
        overflow: 'hidden',
        height: '100%'
      }}>
        {/* Header - Fixed at Top (Telegram Style) */}
        <Box sx={{ 
          height: '64px',
          px: 2, 
          py: 1.5, 
          borderBottom: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          flexShrink: 0,
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <ChatIcon color="primary" />
          <Typography variant="h6" sx={{ flex: 1 }}>Global Chat</Typography>
          <Chip
            size="small"
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'default'}
          />
          {isAdmin && (
            <Tooltip title="Delete Chat History (Admin Only)">
              <IconButton
                size="small"
                color="error"
                onClick={handleDeleteHistory}
                sx={{ ml: 1 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        {/* Search Bar - Fixed Below Header (Telegram Style) */}
        <Box sx={{ 
          height: '56px',
          px: 2, 
          py: 1, 
          borderBottom: 1, 
          borderColor: 'divider', 
          bgcolor: 'background.default', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          flexShrink: 0,
          position: 'sticky',
          top: '64px',
          zIndex: 9
        }}>
          {messages.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', minWidth: 'fit-content' }}>
              💬 {messages.length}
            </Typography>
          )}
          <Box sx={{ flex: 1 }}>
            <InputBase
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startAdornment={<SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />}
              endAdornment={
                searchQuery && (
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                    sx={{ mr: 0.5, p: 0.5 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )
              }
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                fontSize: '0.875rem',
                width: '100%',
                border: 1,
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'primary.main',
                },
                '&:focus-within': {
                  borderColor: 'primary.main',
                  borderWidth: 2,
                }
              }}
            />
          </Box>
        </Box>

        {/* Messages List - Scrollable Area (Telegram Style - Only this scrolls) */}
        <Box 
          ref={messagesContainerRef}
          onScroll={(e) => {
            const container = e.target;
            // Load older messages when user scrolls near the top (within 100px)
            if (container.scrollTop < 100 && hasMoreMessages && !loadingOlder && !isLoadingOlderRef.current && messages.length > 0) {
              const oldestMessage = messages[0];
              if (oldestMessage && oldestMessage.timestamp) {
                isLoadingOlderRef.current = true;
                setLoadingOlder(true);
                socketService.loadOlderMessages(oldestMessage.timestamp, 20);
              }
            }
          }}
          sx={{ 
            flex: 1,
            height: 0, // Critical for flex scrolling
            overflowY: 'auto', 
            overflowX: 'hidden',
            px: 2,
            py: 1,
            minHeight: 0,
            bgcolor: 'background.default',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0,0,0,0.15)',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgba(0,0,0,0.25)',
            },
          }}
        >
          {/* Loading indicator for older messages */}
          {loadingOlder && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}
          
          {/* No more messages indicator */}
          {!hasMoreMessages && messages.length > 0 && !loadingOlder && (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                No more messages
              </Typography>
            </Box>
          )}
          
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body2" color="text.secondary">
              No messages yet. Start the conversation! 💬
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {(searchQuery 
              ? messages.filter(msg => 
                  msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  msg.username?.toLowerCase().includes(searchQuery.toLowerCase())
                )
              : messages
            ).map((message) => {
              const isOwnMessage = currentUser && message.userId === currentUser.id;
              return (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                    mb: 1.5,
                    px: 1,
                    alignItems: 'flex-end',
                    gap: 1
                  }}
                >
                  <Avatar
                    src={message.avatar_url || message.avatar || undefined}
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: (message.avatar_url || message.avatar) ? 'transparent' : (isOwnMessage ? 'primary.main' : 'secondary.main'),
                      flexShrink: 0
                    }}
                    imgProps={{
                      onError: (e) => {
                        e.target.style.display = 'none';
                      }
                    }}
                  >
                    {(!message.avatar_url && !message.avatar) && (
                      message.username?.charAt(0).toUpperCase() || 'U'
                    )}
                  </Avatar>
                  <Box
                    sx={{
                      maxWidth: '65%',
                      bgcolor: isOwnMessage ? 'primary.main' : 'background.paper',
                      color: isOwnMessage ? 'white' : 'text.primary',
                      borderRadius: 2,
                      px: 1.5,
                      py: 1,
                      borderTopLeftRadius: isOwnMessage ? 2 : 0.5,
                      borderTopRightRadius: isOwnMessage ? 0.5 : 2,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5
                    }}
                  >
                    {!isOwnMessage && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          display: 'block', 
                          fontWeight: 600,
                          color: 'primary.main',
                          fontSize: '0.75rem'
                        }}
                      >
                        {message.username || 'Anonymous'}
                      </Typography>
                    )}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        wordBreak: 'break-word',
                        lineHeight: 1.4
                      }}
                    >
                      {message.text}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'flex',
                        justifyContent: 'flex-end',
                        fontSize: '0.7rem',
                        opacity: 0.7,
                        mt: 0.25
                      }}
                    >
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            {typingUsers.size > 0 && (
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </Typography>
              </Box>
            )}
            {searchQuery && messages.filter(msg => 
              msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
              msg.username?.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 && messages.length > 0 && (
              <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  🔍 No messages found matching "{searchQuery}"
                </Typography>
              </Box>
            )}
            <Box ref={messagesEndRef} sx={{ height: '1px', flexShrink: 0, minHeight: '1px' }} />
          </Box>
        )}
      </Box>

      {/* Message Input - Fixed at Bottom (Telegram Style) */}
      <Box 
        component="form" 
        onSubmit={handleSendMessage} 
        sx={{ 
          height: '72px',
          px: 2, 
          py: 1.5,
          flexShrink: 0,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <IconButton
          onClick={(e) => {
            setEmojiPickerAnchor(e.currentTarget);
            setEmojiPickerOpen(true);
          }}
          disabled={!isConnected}
          sx={{ mr: 1 }}
        >
          <MoodIcon />
        </IconButton>
        <TextField
          fullWidth
          size="small"
          placeholder={isConnected ? "Type a message..." : "Connecting..."}
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            handleTyping();
          }}
          disabled={!isConnected}
          inputRef={inputRef}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: 'background.default',
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  type="submit"
                  color="primary"
                  disabled={!messageText.trim() || !isConnected}
                  edge="end"
                  sx={{ 
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '&.Mui-disabled': {
                      bgcolor: 'action.disabledBackground',
                    }
                  }}
                >
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        {/* Emoji Picker Popover */}
        <Popover
          open={emojiPickerOpen}
          anchorEl={emojiPickerAnchor}
          onClose={() => setEmojiPickerOpen(false)}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            theme="light"
          />
        </Popover>
      </Box>
      </Paper>

      {/* Online Users Sidebar - Telegram Style */}
      <Paper sx={{ 
        width: 280, 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0, 
        overflow: 'hidden',
        height: '100%'
      }}>
        {/* Sidebar Header - Fixed */}
        <Box sx={{ 
          height: '64px',
          px: 2, 
          py: 1.5, 
          borderBottom: 1, 
          borderColor: 'divider', 
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <People fontSize="small" />
            Online ({onlineUsers.length})
          </Typography>
        </Box>
        {/* Sidebar Content - Scrollable */}
        <Box sx={{ 
          flex: 1,
          height: 0, // Critical for flex scrolling
          overflowY: 'auto', 
          overflowX: 'hidden',
          p: 1, 
          minHeight: 0,
          bgcolor: 'background.default',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.15)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(0,0,0,0.25)',
          },
        }}>
          {onlineUsers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No users online
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {onlineUsers.map((user) => (
                <ListItem key={user.id} sx={{ px: 1, py: 0.5 }}>
                  <ListItemAvatar>
                    <Avatar 
                      src={user.avatar_url || user.avatar || undefined}
                      sx={{ 
                        width: 28, 
                        height: 28, 
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
                      <Typography variant="body2" noWrap component="span">
                        {user.username || 'Anonymous'}
                      </Typography>
                    }
                    secondary={
                      <Box 
                        component="span"
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <Circle sx={{ fontSize: 8, color: 'success.main' }} />
                        <Typography variant="caption" color="text.secondary" component="span">
                          Online
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              <div ref={usersListEndRef} />
            </List>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default GlobalChat;

