import Web3 from 'web3';

class Web3Service {
  constructor() {
    this.web3 = null;
    this.provider = null;
    this.chainId = null;
  }

  async initialize() {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum !== 'undefined') {
        this.web3 = new Web3(window.ethereum);
        this.provider = window.ethereum;
        
        // Get the current chain ID
        this.chainId = await this.web3.eth.getChainId();
        
        // Listen for chain changes
        window.ethereum.on('chainChanged', (chainId) => {
          this.chainId = chainId;
        });

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length === 0) {
            // User disconnected their wallet
            this.web3 = null;
            this.provider = null;
          }
        });

        return true;
      } else {
        throw new Error('Please install MetaMask to use this application');
      }
    } catch (error) {
      console.error('Failed to initialize Web3:', error);
      throw error;
    }
  }

  async connect() {
    try {
      if (!this.web3) {
        await this.initialize();
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      return accounts;
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  async getAccounts() {
    try {
      if (!this.web3) {
        await this.initialize();
      }

      return await this.web3.eth.getAccounts();
    } catch (error) {
      console.error('Failed to get accounts:', error);
      throw error;
    }
  }

  async getBalance(address) {
    try {
      if (!this.web3) {
        await this.initialize();
      }

      const balance = await this.web3.eth.getBalance(address);
      return this.web3.utils.fromWei(balance, 'ether');
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async sendTransaction(transaction) {
    try {
      if (!this.web3) {
        await this.initialize();
      }

      const receipt = await this.web3.eth.sendTransaction(transaction);
      return receipt;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  }

  async getNetworkId() {
    try {
      if (!this.web3) {
        await this.initialize();
      }

      return await this.web3.eth.net.getId();
    } catch (error) {
      console.error('Failed to get network ID:', error);
      throw error;
    }
  }

  async getGasPrice() {
    try {
      if (!this.web3) {
        await this.initialize();
      }

      return await this.web3.eth.getGasPrice();
    } catch (error) {
      console.error('Failed to get gas price:', error);
      throw error;
    }
  }
}

export const web3Service = new Web3Service(); 