import { io } from 'socket.io-client';
import { authService } from '../auth/authService';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3002';
  }

  /**
   * Connect to the socket server
   * @param {Object} userData - User information { userId, username, email }
   * @returns {Promise<void>}
   */
  async connect(userData = null) {
    // If already connected, re-join with user data to ensure state is synced
    if (this.socket?.connected) {
      if (userData) {
        // Re-emit user:join to get fresh state (messages and users)
        this.socket.emit('user:join', userData);
      }
      return;
    }

    // If socket exists but not connected, disconnect and reconnect
    if (this.socket && !this.socket.connected) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }

    try {
      // Get user data if not provided
      if (!userData) {
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          throw new Error('User must be authenticated to connect to socket');
        }
        userData = {
          userId: currentUser.id,
          username: currentUser.username,
          email: currentUser.email
        };
      }

      // Store userData for reconnection
      this.lastUserData = userData;

      // Create socket connection
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity, // Keep trying to reconnect
        reconnectionDelayMax: 5000
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        this.isConnected = true;
        this.emit('connect', { socketId: this.socket.id });
        
        // Always join with user data after connection (including reconnection)
        if (this.lastUserData) {
          this.socket.emit('user:join', this.lastUserData);
        }
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        this.emit('disconnect', { reason });
      });

      // Handle reconnection - always re-join to get fresh state
      this.socket.on('reconnect', (attemptNumber) => {
        this.isConnected = true;
        this.emit('connect', { socketId: this.socket.id });
        // Re-join with user data on reconnection to get messages and users
        if (this.lastUserData) {
          this.socket.emit('user:join', this.lastUserData);
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.emit('error', { message: 'Connection failed', error });
      });

      // Message handlers
      this.socket.on('message:new', (message) => {
        this.emit('message:new', message);
      });

      this.socket.on('messages:history', (messages) => {
        this.emit('messages:history', messages);
      });

      this.socket.on('user:online', (user) => {
        this.emit('user:online', user);
      });

      this.socket.on('user:offline', (user) => {
        this.emit('user:offline', user);
      });

      this.socket.on('users:list', (users) => {
        this.emit('users:list', users);
      });

      this.socket.on('typing:user', (data) => {
        this.emit('typing:user', data);
      });

      this.socket.on('typing:stop', (data) => {
        this.emit('typing:stop', data);
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        this.emit('error', error);
      });

      this.socket.on('messages:deleted', (data) => {
        this.emit('messages:deleted', data);
      });

      this.socket.on('messages:delete:success', (data) => {
        this.emit('messages:delete:success', data);
      });

      this.socket.on('messages:older', (messages) => {
        this.emit('messages:older', messages);
      });

    } catch (error) {
      console.error('Failed to connect socket:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the socket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  /**
   * Send a chat message
   * @param {string} text - Message text
   */
  sendMessage(text) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('message:send', { text });
  }

  /**
   * Start typing indicator
   */
  startTyping() {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing:start');
    }
  }

  /**
   * Stop typing indicator
   */
  stopTyping() {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing:stop');
    }
  }

  /**
   * Load older messages (lazy loading)
   * @param {string} beforeTimestamp - ISO timestamp of the oldest message currently loaded
   * @param {number} limit - Number of messages to load (default: 20)
   */
  loadOlderMessages(beforeTimestamp, limit = 20) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('messages:load-older', { beforeTimestamp, limit });
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit an event to all listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected && this.socket?.connected;
  }

  /**
   * Get the socket instance (for advanced operations)
   * @returns {Object|null}
   */
  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();

