import Web3 from 'web3';
import { walletConnectionService } from '../wallet/walletConnectionService';

/**
 * Payment Service
 * Handles blockchain payments for file purchases
 */
class PaymentService {
  constructor() {
    this.web3 = null;
    this.ethUsdRate = null;
    this.rateCacheTime = null;
    this.rateCacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize Web3 instance
   */
  async initializeWeb3() {
    if (this.web3) return this.web3;

    const walletInfo = walletConnectionService.getConnectionData();
    if (!walletInfo.isConnected || !walletInfo.address) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    // Get provider from wallet connection
    let provider = null;
    
    if (walletInfo.wallet === 'MetaMask' || walletInfo.wallet === 'Coinbase Wallet') {
      provider = window.ethereum;
    } else if (walletInfo.wallet === 'WalletConnect') {
      provider = walletConnectionService.walletConnectProvider;
    }

    if (!provider) {
      throw new Error('Wallet provider not available');
    }

    this.web3 = new Web3(provider);
    return this.web3;
  }

  /**
   * Get current ETH to USD exchange rate
   */
  async getEthUsdRate() {
    // Use cached rate if still valid
    if (this.ethUsdRate && this.rateCacheTime && 
        Date.now() - this.rateCacheTime < this.rateCacheDuration) {
      return this.ethUsdRate;
    }

    try {
      // Use CoinGecko API for exchange rate
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      
      if (data.ethereum && data.ethereum.usd) {
        this.ethUsdRate = data.ethereum.usd;
        this.rateCacheTime = Date.now();
        return this.ethUsdRate;
      }
      
      throw new Error('Failed to fetch ETH price');
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      // Fallback to a default rate if API fails (you can update this)
      this.ethUsdRate = 3000; // Default fallback rate
      this.rateCacheTime = Date.now();
      return this.ethUsdRate;
    }
  }

  /**
   * Convert USD amount to ETH
   */
  async usdToEth(usdAmount) {
    const rate = await this.getEthUsdRate();
    const ethAmount = usdAmount / rate;
    return ethAmount;
  }

  /**
   * Send ETH payment to file owner
   * @param {string} recipientAddress - File owner's wallet address
   * @param {number} usdAmount - Price in USD
   * @returns {Promise<{success: boolean, transactionHash: string, error: string}>}
   */
  async sendPayment(recipientAddress, usdAmount) {
    try {
      // Initialize Web3
      const web3 = await this.initializeWeb3();
      
      // Get buyer's address
      const walletInfo = walletConnectionService.getConnectionData();
      const buyerAddress = walletInfo.address;

      if (!buyerAddress) {
        throw new Error('Buyer wallet address not found');
      }

      // Validate recipient address
      if (!web3.utils.isAddress(recipientAddress)) {
        throw new Error('Invalid recipient address');
      }

      // Convert USD to ETH
      const ethAmount = await this.usdToEth(usdAmount);
      const ethAmountWei = web3.utils.toWei(ethAmount.toFixed(6), 'ether');

      // Check buyer's balance
      const balance = await web3.eth.getBalance(buyerAddress);
      if (BigInt(balance) < BigInt(ethAmountWei)) {
        throw new Error(`Insufficient balance. You need ${ethAmount.toFixed(6)} ETH but have ${web3.utils.fromWei(balance, 'ether')} ETH`);
      }

      // Get gas price
      const gasPrice = await web3.eth.getGasPrice();
      
      // Estimate gas
      const gasEstimate = await web3.eth.estimateGas({
        from: buyerAddress,
        to: recipientAddress,
        value: ethAmountWei
      });

      // Send transaction
      const transaction = await web3.eth.sendTransaction({
        from: buyerAddress,
        to: recipientAddress,
        value: ethAmountWei,
        gas: gasEstimate,
        gasPrice: gasPrice
      });

      return {
        success: true,
        transactionHash: transaction.transactionHash,
        blockNumber: transaction.blockNumber,
        ethAmount: ethAmount,
        usdAmount: usdAmount
      };
    } catch (error) {
      console.error('Payment error:', error);
      return {
        success: false,
        error: error.message || 'Payment failed',
        transactionHash: null
      };
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(transactionHash) {
    try {
      const web3 = await this.initializeWeb3();
      const receipt = await web3.eth.getTransactionReceipt(transactionHash);
      return receipt;
    } catch (error) {
      console.error('Error getting transaction receipt:', error);
      return null;
    }
  }

  /**
   * Format ETH amount for display
   */
  formatEth(amount) {
    return parseFloat(amount).toFixed(6);
  }

  /**
   * Format USD amount for display
   */
  formatUsd(amount) {
    return parseFloat(amount).toFixed(2);
  }
}

export const paymentService = new PaymentService();

