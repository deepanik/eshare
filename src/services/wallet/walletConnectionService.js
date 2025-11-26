import Web3 from 'web3';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
// Import @reown/appkit to ensure it's available for QR modal
import '@reown/appkit';

class WalletConnectionService {
  constructor() {
    this.isConnected = false;
    this.walletAddress = null;
    this.walletBalance = '0';
    this.walletType = null;
    this.listeners = [];
    this.storageKey = 'wallet_connection_state';
    this.walletConnectProvider = null;
  }

  // Initialize wallet connection service
  async initialize() {
    try {
      // Try to restore existing connection
      await this.restoreConnection();
      return true;
    } catch (error) {
      console.error('Wallet connection initialization error:', error);
      throw error;
    }
  }

  // Connect MetaMask wallet
  async connectMetaMask() {
    try {
      // Check if MetaMask is available
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      const address = accounts[0];
      
      // Get balance
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      
      const balanceInEth = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);
      
      // Update state
      this.isConnected = true;
      this.walletAddress = address;
      this.walletBalance = balanceInEth;
      this.walletType = 'MetaMask';
      
      // Save to localStorage
      this.saveConnection();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Notify listeners
      this.notifyListeners('connect', {
        wallet: 'MetaMask',
        address: address,
        balance: balanceInEth
      });
      
      return {
        wallet: 'MetaMask',
        address: address,
        balance: balanceInEth
      };
    } catch (error) {
      console.error('MetaMask connection error:', error);
      throw error;
    }
  }

  // Connect Coinbase Wallet
  async connectCoinbaseWallet() {
    try {
      // Check if Coinbase Wallet is available
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Coinbase Wallet is not installed. Please install Coinbase Wallet to continue.');
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      const address = accounts[0];
      
      // Get balance
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      
      const balanceInEth = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);
      
      // Update state
      this.isConnected = true;
      this.walletAddress = address;
      this.walletBalance = balanceInEth;
      this.walletType = 'Coinbase Wallet';
      
      // Save to localStorage
      this.saveConnection();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Notify listeners
      this.notifyListeners('connect', {
        wallet: 'Coinbase Wallet',
        address: address,
        balance: balanceInEth
      });
      
      return {
        wallet: 'Coinbase Wallet',
        address: address,
        balance: balanceInEth
      };
    } catch (error) {
      console.error('Coinbase Wallet connection error:', error);
      throw error;
    }
  }

  // Connect WalletConnect (real implementation with v2)
  async connectWalletConnect() {
    try {
      // Check if project ID is available
      const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID?.trim();
      if (!projectId || projectId === 'your-project-id' || projectId === '') {
        throw new Error('WalletConnect Project ID not configured. Please set VITE_WALLET_CONNECT_PROJECT_ID in your .env file and restart the dev server.');
      }

      // Clean up any existing provider first
      if (this.walletConnectProvider) {
        try {
          await this.walletConnectProvider.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.walletConnectProvider = null;
      }

      // Initialize WalletConnect v2 provider with QR modal
      this.walletConnectProvider = await EthereumProvider.init({
        projectId: projectId,
        chains: [1], // Ethereum mainnet
        showQrModal: true, // Enable QR modal (requires @reown/appkit)
        metadata: {
          name: 'eShare',
          description: 'Decentralized file sharing platform',
          url: window.location.origin,
          icons: [`${window.location.origin}/favicon.ico`]
        }
      });

      // Set up event listeners before enabling
      this.walletConnectProvider.on('display_uri', (uri) => {
        console.log('WalletConnect URI:', uri);
      });

      this.walletConnectProvider.on('session_event', (event) => {
        console.log('WalletConnect session event:', event);
      });

      // Enable session with timeout (triggers QR Code modal via @reown/appkit)
      const enablePromise = this.walletConnectProvider.enable();
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Connection timeout. Please check if your domain is whitelisted in WalletConnect Cloud.'));
        }, 120000); // 2 minute timeout
      });

      try {
        await Promise.race([enablePromise, timeoutPromise]);
      } catch (error) {
        // Check for 403 or domain-related errors
        if (error.message?.includes('403') || error.message?.includes('Forbidden') || error.message?.includes('origin not allowed')) {
          throw new Error('Domain not whitelisted. Please add your domain to WalletConnect Cloud project settings.');
        }
        throw error;
      }

      // Wait a bit for accounts to be populated
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get accounts
      const accounts = this.walletConnectProvider.accounts;
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please approve the connection in your wallet.');
      }

      const address = accounts[0];
      
      // Get balance using WalletConnect provider
      try {
        const web3 = new Web3(this.walletConnectProvider);
        const balanceWei = await web3.eth.getBalance(address);
        const balance = web3.utils.fromWei(balanceWei, 'ether');
        this.walletBalance = parseFloat(balance).toFixed(4);
      } catch (balanceError) {
        console.warn('Could not fetch balance:', balanceError);
        this.walletBalance = '0.0000';
      }
      
      this.isConnected = true;
      this.walletAddress = address;
      this.walletType = 'WalletConnect';
      this.saveConnection();
      this.notifyListeners('connect', this.getConnectionData());
      
      return this.getConnectionData();
    } catch (error) {
      console.error('WalletConnect connection error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message || 'Failed to connect wallet';
      if (errorMessage.includes('reset') || errorMessage.includes('Connection request reset')) {
        errorMessage = 'Connection was cancelled or timed out. Please try again and make sure to approve the connection in your wallet app.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Connection timed out. Please try again.';
      }
      
      // Clean up provider on error
      if (this.walletConnectProvider) {
        try {
          await this.walletConnectProvider.disconnect();
        } catch (disconnectError) {
          // Ignore disconnect errors
        }
        this.walletConnectProvider = null;
      }
      
      throw new Error(errorMessage);
    }
  }

  // Disconnect wallet
  async disconnect() {
    try {
      // Disconnect WalletConnect if connected
      if (this.walletType === 'WalletConnect' && this.walletConnectProvider) {
        await this.walletConnectProvider.disconnect();
        this.walletConnectProvider = null;
      }
      
      this.isConnected = false;
      this.walletAddress = null;
      this.walletBalance = '0';
      this.walletType = null;
      
      // Clear localStorage
      localStorage.removeItem(this.storageKey);
      
      // Remove event listeners
      this.removeEventListeners();
      
      // Notify listeners
      this.notifyListeners('disconnect', null);
    } catch (error) {
      console.error('Wallet disconnection error:', error);
      throw error;
    }
  }

  // Restore connection from localStorage
  async restoreConnection() {
    try {
      const savedConnection = localStorage.getItem(this.storageKey);
      
      if (savedConnection) {
        const connection = JSON.parse(savedConnection);
        
        // Check if connection is still valid
        if (connection.expiresAt && Date.now() < connection.expiresAt) {
          this.isConnected = connection.isConnected;
          this.walletAddress = connection.walletAddress;
          this.walletBalance = connection.walletBalance;
          this.walletType = connection.walletType;
          
          // For WalletConnect, try to restore the provider session
          if (this.walletType === 'WalletConnect' && this.isConnected && this.walletAddress) {
            try {
              await this.restoreWalletConnectSession();
            } catch (wcError) {
              console.warn('Failed to restore WalletConnect session:', wcError);
              // If restoration fails, mark as disconnected but keep the address for display
              this.isConnected = false;
            }
          }
          
          // For MetaMask/Coinbase, verify the connection is still active
          if ((this.walletType === 'MetaMask' || this.walletType === 'Coinbase Wallet') && this.isConnected) {
            try {
              if (typeof window.ethereum !== 'undefined') {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length === 0 || accounts[0] !== this.walletAddress) {
                  // Connection lost - but don't clear if user just needs to reconnect
                  console.warn('Wallet accounts changed or disconnected');
                  // Keep the connection info but mark as needing reconnection
                  // Don't clear localStorage - let user reconnect easily
                  this.isConnected = false;
                  return false;
                }
                // Connection is still valid
              } else {
                // Provider not available - but connection might still be valid
                // Keep connection info, just mark as needing provider
                this.isConnected = false;
                return false;
              }
            } catch (error) {
              console.warn('Failed to verify wallet connection (non-fatal):', error);
              // Don't clear connection - might be a temporary issue
              // Keep the connection info for user to reconnect easily
              this.isConnected = false;
              return false;
            }
          }
          
          // Set up event listeners if connected
          if (this.isConnected) {
            this.setupEventListeners();
          }
          
          return this.isConnected;
        } else {
          // Connection expired, clear it
          localStorage.removeItem(this.storageKey);
        }
      }

      return false;
    } catch (error) {
      console.error('Wallet connection restoration error:', error);
      return false;
    }
  }

  // Restore WalletConnect session
  async restoreWalletConnectSession() {
    try {
      const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID?.trim();
      if (!projectId) {
        throw new Error('WalletConnect Project ID not configured');
      }

      // Try to initialize provider and check for existing session
      this.walletConnectProvider = await EthereumProvider.init({
        projectId: projectId,
        chains: [1],
        showQrModal: false, // Don't show modal on restore
        metadata: {
          name: 'eShare',
          description: 'Decentralized file sharing platform',
          url: window.location.origin,
          icons: [`${window.location.origin}/favicon.ico`]
        }
      });

      // Check if there's an active session
      if (this.walletConnectProvider.session) {
        // Session exists, verify accounts
        const accounts = this.walletConnectProvider.accounts;
        if (accounts && accounts.length > 0 && accounts[0] === this.walletAddress) {
          // Session is valid and matches saved address
          this.isConnected = true;
          this.setupEventListeners();
          return true;
        }
      }

      // No valid session found
      this.walletConnectProvider = null;
      this.isConnected = false;
      return false;
    } catch (error) {
      console.warn('WalletConnect session restoration failed:', error);
      this.walletConnectProvider = null;
      this.isConnected = false;
      return false;
    }
  }

  // Save connection to localStorage
  saveConnection() {
    const connectionToSave = {
      isConnected: this.isConnected,
      walletAddress: this.walletAddress,
      walletBalance: this.walletBalance,
      walletType: this.walletType,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    localStorage.setItem(this.storageKey, JSON.stringify(connectionToSave));
  }

  // Set up event listeners for wallet changes
  setupEventListeners() {
    if (typeof window.ethereum !== 'undefined') {
      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          this.disconnect();
        } else if (accounts[0] !== this.walletAddress) {
          // User switched accounts
          this.walletAddress = accounts[0];
          this.saveConnection();
          this.notifyListeners('accountsChanged', accounts);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', (chainId) => {
        console.log('Chain changed:', chainId);
        this.notifyListeners('chainChanged', chainId);
      });
    }
  }

  // Remove event listeners
  removeEventListeners() {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  }

  // Check if wallet is connected
  isWalletConnected() {
    return this.isConnected && this.walletAddress !== null;
  }

  // Get current wallet address
  getCurrentAddress() {
    return this.walletAddress;
  }

  // Get current wallet balance
  getCurrentBalance() {
    return this.walletBalance;
  }

  // Get current wallet type
  getCurrentWalletType() {
    return this.walletType;
  }

  // Get connection data
  getConnectionData() {
    return {
      isConnected: this.isConnected,
      wallet: this.walletType,
      address: this.walletAddress,
      balance: this.walletBalance
    };
  }

  // Add event listener
  addEventListener(event, callback) {
    this.listeners.push({ event, callback });
  }

  // Remove event listener
  removeEventListener(event, callback) {
    this.listeners = this.listeners.filter(
      listener => !(listener.event === event && listener.callback === callback)
    );
  }

  // Notify listeners
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        listener.callback(data);
      }
    });
  }

  // Clean up
  destroy() {
    this.removeEventListeners();
    this.listeners = [];
    this.isConnected = false;
    this.walletAddress = null;
    this.walletBalance = '0';
    this.walletType = null;
  }
}

export const walletConnectionService = new WalletConnectionService();
