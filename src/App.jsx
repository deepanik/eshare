import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Snackbar,
  Alert,
  Grid
} from '@mui/material';
import {
  Menu as MenuIcon,
  CloudUpload as CloudUploadIcon,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  Help as HelpIcon,
  Chat as ChatIcon,
  Description as ReportIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Computer as ComputerIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createAppTheme } from './theme';
import FileList from './components/files/FileList';
import FileUpload from './components/files/FileUpload';
import Settings from './components/settings/Settings';
import Help from './components/help/Help';
import OnlineUsers from './components/users/OnlineUsers';
import EncryptionDialog from './components/encryption/EncryptionDialog';
import UnlockDialog from './components/files/UnlockDialog';
import KeyViewDialog from './components/files/KeyViewDialog';
import KeyRequiredDialog from './components/files/KeyRequiredDialog';
import AuthDialog from './components/auth/AuthDialog';
import WalletConnectDialog from './components/wallet/WalletConnectDialog';
import Profile from './components/profile/Profile';
import Devloper from './components/Devloper/Devloper';
import GlobalChat from './components/Globalchat/global';
import Report from './components/Report/Report';
import { fileService } from './services/files/fileService';
import { settingsService } from './services/settings/settingsService';
import { authService } from './services/auth/authService';
import { walletConnectionService } from './services/wallet/walletConnectionService';

const drawerWidth = 240;

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Authentication state
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [showEncryptionDialog, setShowEncryptionDialog] = useState(false);
  const [keyViewDialog, setKeyViewDialog] = useState({ open: false, file: null, hasPurchased: false });
  const [keyRequiredDialog, setKeyRequiredDialog] = useState({ 
    open: false, 
    file: null, 
    priceUsd: 0, 
    hasPurchased: false 
  });

  // File state
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]); // Files waiting for encryption dialog
  const [uploadProgress, setUploadProgress] = useState(0);
  const [decryptProgress, setDecryptProgress] = useState(0);

  // Settings state
  const [settings, setSettings] = useState({});
  const [themeMode, setThemeMode] = useState('light');

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
    autoHideDuration: 4000
  });

  // Unlock dialog state
  const [unlockDialog, setUnlockDialog] = useState({
    open: false,
    file: null,
    priceUsd: 0,
    requiresPassword: false
  });

  // Theme
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize wallet connection service (restores previous connections)
        try {
          await walletConnectionService.initialize();
        } catch (walletError) {
          console.warn('Wallet connection initialization failed:', walletError);
          // Continue even if wallet initialization fails
        }

        // Load settings
        const savedSettings = settingsService.loadSettings();
        setSettings(savedSettings);
        setThemeMode(savedSettings.theme || 'light');

        // Check authentication
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          setUserProfile(currentUser);
          
          // Update user's online status and last seen
          try {
            await authService.updateLastSeen(currentUser.id);
            // Also update online status if the function exists
            if (authService.updateOnlineStatus) {
              await authService.updateOnlineStatus(currentUser.id, true);
            }
          } catch (statusError) {
            console.warn('Failed to update user status:', statusError);
          }
        }

        // Load files (gracefully handle missing credentials)
        try {
          const userFiles = await fileService.listFiles();
          setFiles(userFiles);
        } catch (fileError) {
          console.warn('Could not load files (credentials may be missing):', fileError.message);
          setFiles([]); // Set empty array instead of crashing
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Expose helper functions to browser console (dev mode only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.updateFilePrice = async (fileId, price, ownerWalletAddress = null) => {
        try {
          const success = await fileService.updateFilePrice(fileId, price, ownerWalletAddress);
          if (success) {
            // Refresh file list after update
            const updatedFiles = await fileService.listFiles();
            setFiles(updatedFiles);
            showSnackbar(`Price updated to $${price.toFixed(2)}`, 'success');
          } else {
            console.warn(`❌ Failed to update price for file ${fileId}.`);
            showSnackbar('Failed to update file price.', 'error');
          }
        } catch (error) {
          console.error(`❌ Error updating price for file ${fileId}:`, error);
          showSnackbar(error.message || 'Failed to update file price.', 'error');
        }
      };
      
      // Dev helper available: window.updateFilePrice(fileId, price, ownerWalletAddress?)
    }
  }, []);

  // Set up periodic updates for user's online status when user is logged in
  useEffect(() => {
    if (!user?.id) return;

    const updateUserStatus = async () => {
      try {
        await authService.updateLastSeen(user.id);
      } catch (error) {
        console.warn('Failed to update user status:', error);
      }
    };

    // Update immediately
    updateUserStatus();

    // Update every 30 seconds
    const statusInterval = setInterval(updateUserStatus, 30000);

    return () => {
      clearInterval(statusInterval);
    };
  }, [user?.id]);

  // Handler functions
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setUserProfile(userData);
    setIsAuthenticated(true);
    setShowAuthDialog(false);
    showSnackbar('Welcome! You are signed in.', 'success');
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setUserProfile(null);
      setIsAuthenticated(false);
      showSnackbar('You have been signed out.', 'info');
    } catch (error) {
      console.error('Sign out error:', error);
      showSnackbar('Failed to sign out.', 'error');
    }
  };

  const handleWalletConnected = (walletInfo) => {
    setShowWalletDialog(false);
    showSnackbar('Wallet connected successfully!', 'success');
  };

  const handleThemeMenuOpen = (event) => {
    setThemeMenuAnchor(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setThemeMenuAnchor(null);
  };

  const handleThemeSelect = (mode) => {
    setThemeMode(mode);
    const updatedSettings = { ...settings, theme: mode };
    setSettings(updatedSettings);
    settingsService.saveSettings(updatedSettings);
    handleThemeMenuClose();
  };

  const handleFileSelect = async (selectedFiles) => {
    if (selectedFiles.length === 0) return;

    try {
      setUploadProgress(0);

      // Show encryption dialog if encryption is enabled in settings
      if (settings.defaultEncryption) {
        // Store files for later upload after encryption dialog
        setPendingFiles(selectedFiles);
        setShowEncryptionDialog(true);
        return;
      }

      // Upload files without encryption
      for (const file of selectedFiles) {
        await uploadFile(file);
      }
    } catch (error) {
      console.error('File selection error:', error);
      showSnackbar('Failed to select files.', 'error');
    }
  };

  const handleEncryptionClose = () => {
    setShowEncryptionDialog(false);
    // Clear pending files if dialog is closed without confirming
    setPendingFiles([]);
  };

  const handleEncryptionConfirm = async (encryptionOptions) => {
    // Check if wallet is connected (required for receiving payments)
    // First, try to restore/verify connection if it exists
    try {
      await walletConnectionService.initialize();
    } catch (error) {
      console.debug('Wallet initialization check:', error);
    }
    
    const walletInfo = walletConnectionService.getConnectionData();
    if (!walletInfo || !walletInfo.isConnected || !walletInfo.address) {
      showSnackbar('Please connect your wallet to upload files. You need it to receive payments.', 'warning');
      setShowWalletDialog(true);
      setShowEncryptionDialog(false);
      setPendingFiles([]);
      return;
    }

    setShowEncryptionDialog(false);
    
    // Use pending files stored from handleFileSelect
    const filesToUpload = pendingFiles.length > 0 ? pendingFiles : [];
    
    if (filesToUpload.length === 0) {
      showSnackbar('No files selected for upload.', 'error');
      setPendingFiles([]);
      return;
    }

    // Prepare encryption options in the format expected by uploadToIPFS
    const formattedOptions = {
      useEncryption: true,
      password: encryptionOptions?.password || null,
      priceUsd: encryptionOptions?.priceUsd || 0 // Include price from dialog
    };

    // Upload files with encryption
    try {
      for (const file of filesToUpload) {
        await uploadFile(file, formattedOptions);
      }
    } catch (error) {
      console.error('Upload error:', error);
      showSnackbar('Failed to upload files.', 'error');
    } finally {
      // Clear pending files
      setPendingFiles([]);
    }
  };

  const uploadFile = async (file, encryptionOptions = null) => {
    try {
      const result = await fileService.uploadToIPFS(file, encryptionOptions);
      showSnackbar('File uploaded successfully!', 'success');
      
      // Refresh file list
      const updatedFiles = await fileService.listFiles();
      setFiles(updatedFiles);

      // Show encryption key if encrypted
      if (result.encryptionKey) {
        showSnackbar(
          `File encrypted! Save this key: ${result.encryptionKey}`,
          'warning'
        );
      }
    } catch (error) {
      console.error('Upload error:', error);
      showSnackbar('Failed to upload file.', 'error');
    } finally {
      setUploadProgress(0);
    }
  };

  const handleViewKey = async (file) => {
    if (file) {
      // Get price from file object or local DB
      let price = file.priceUsd || file.price_usd || 0;
      
      // If price not in file object, try to get from local DB
      if (price === 0) {
        try {
          const db = await fileService.getDb();
          const dbFile = db.files.find(f => f.id === file.id);
          price = dbFile?.priceUsd || 0;
          if (import.meta.env.DEV) {
          }
        } catch (dbError) {
          console.debug('Could not access local DB for price:', dbError);
        }
      }
      
      // Check purchase status for paid files
      let hasPurchased = false;
      if (price > 0) {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          hasPurchased = await checkPurchaseStatus(file.id);
        }
      } else {
        hasPurchased = true; // Free files are always "purchased"
      }
      
      if (import.meta.env.DEV) {
      }
      
      setKeyViewDialog({ 
        open: true, 
        file: { ...file, priceUsd: price, price_usd: price }, 
        hasPurchased 
      });
    } else if (keyRequiredDialog.file) {
      const file = keyRequiredDialog.file;
      let price = file.priceUsd || file.price_usd || 0;
      
      // If price not in file object, try to get from local DB
      if (price === 0) {
        try {
          const db = await fileService.getDb();
          const dbFile = db.files.find(f => f.id === file.id);
          price = dbFile?.priceUsd || 0;
        } catch (dbError) {
          console.debug('Could not access local DB for price:', dbError);
        }
      }
      
      let hasPurchased = false;
      if (price > 0) {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          hasPurchased = await checkPurchaseStatus(file.id);
        }
      } else {
        hasPurchased = true;
      }
      
      setKeyViewDialog({ 
        open: true, 
        file: { ...file, priceUsd: price, price_usd: price }, 
        hasPurchased 
      });
    }
  };

  const handleEnterKey = async (key) => {
    if (!keyRequiredDialog.file) return;
    
    if (!key || !key.trim()) {
      throw new Error('Please enter a decryption key');
    }
    
    try {
      const file = keyRequiredDialog.file;
      
      // First, validate the key by attempting to decrypt a small portion
      // This prevents downloading the entire file with a wrong key
      showSnackbar('Validating key...', 'info');
      
      try {
        // Attempt to download and decrypt - this will fail if key is wrong
        const blob = await fileService.downloadFile(file.id, file.storageType, {
          decryptionKey: key.trim(),
          password: file.password
        });

        // If we get here, decryption was successful
        showSnackbar('Key validated. Downloading file...', 'info');
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setKeyRequiredDialog({ open: false, file: null, priceUsd: 0, hasPurchased: false });
        showSnackbar('File downloaded successfully!', 'success');
      } catch (decryptError) {
        console.error('Decryption validation error:', decryptError);
        let errorMessage = decryptError.message || 'Decryption failed';
        
        // Provide specific error messages
        if (errorMessage.includes('Decryption failed') || 
            errorMessage.includes('Invalid key') ||
            errorMessage.includes('Cannot read properties') ||
            errorMessage.includes('sigBytes')) {
          errorMessage = 'Invalid decryption key. The key you entered is incorrect. Please check and try again.';
        } else if (errorMessage.includes('Password')) {
          errorMessage = 'Incorrect password. Please check your password and try again.';
        } else if (errorMessage.includes('required')) {
          errorMessage = errorMessage;
        } else {
          errorMessage = 'Failed to decrypt file. Please verify the decryption key is correct.';
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Download error:', error);
      // Re-throw with user-friendly message
      throw error;
    }
  };

  const handleGetKey = async (fileId) => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      return { key: null, canAccess: false, reason: 'Please log in to view encryption keys' };
    }
    return await fileService.getEncryptionKey(fileId, currentUser.id);
  };

  const handlePurchaseKey = async () => {
    if (!keyRequiredDialog.file) return;
    
    const file = keyRequiredDialog.file;
    const price = file.priceUsd || file.price_usd || 0;
    
    if (price <= 0) {
      showSnackbar('This file is free. No purchase required.', 'info');
      return;
    }

    try {
      // Check if wallet is connected
      const walletInfo = walletConnectionService.getConnectionData();
      if (!walletInfo.isConnected || !walletInfo.address) {
        showSnackbar('Please connect your wallet to purchase files.', 'warning');
        setShowWalletDialog(true);
        return;
      }

      // Get file owner's wallet address
      const ownerWalletAddress = file.ownerWalletAddress;
      if (!ownerWalletAddress) {
        showSnackbar('File owner wallet address not found. Cannot process payment.', 'error');
        return;
      }

      // Check if buyer is trying to buy their own file
      if (ownerWalletAddress.toLowerCase() === walletInfo.address.toLowerCase()) {
        showSnackbar('You cannot purchase your own file. The key is already available to you.', 'info');
        // Still grant access since they're the owner
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          const keyResult = await fileService.getEncryptionKey(file.id, currentUser.id);
          if (keyResult.canAccess && keyResult.key) {
            await handleEnterKey(keyResult.key);
          }
        }
        return;
      }

      // Get current user
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        showSnackbar('Please log in to purchase files.', 'error');
        return;
      }

      // Import payment service
      const { paymentService } = await import('./services/payment/paymentService');
      
      // Get ETH amount for display
      const ethAmount = await paymentService.usdToEth(price);
      const ethDisplay = paymentService.formatEth(ethAmount);
      
      // Confirm payment with user
      const confirmPayment = window.confirm(
        `Purchase this file for $${price.toFixed(2)} USD (${ethDisplay} ETH)?\n\n` +
        `You will send ${ethDisplay} ETH to:\n${ownerWalletAddress}\n\n` +
        `Click OK to proceed with the transaction.`
      );

      if (!confirmPayment) {
        showSnackbar('Purchase cancelled.', 'info');
        return;
      }

      showSnackbar(`Sending ${ethDisplay} ETH to file owner...`, 'info');

      // Send payment
      const paymentResult = await paymentService.sendPayment(ownerWalletAddress, price);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      showSnackbar(`Payment successful! Transaction: ${paymentResult.transactionHash.substring(0, 10)}...`, 'success');

      // Create purchase record in Supabase with transaction hash
      const { createFilePurchase } = await import('./services/supabase/supabaseClient');
      const purchaseResult = await createFilePurchase({
        file_id: file.id,
        buyer_id: currentUser.id,
        price_usd: price,
        purchase_date: new Date().toISOString(),
        payment_method: walletInfo.wallet || 'wallet',
        transaction_hash: paymentResult.transactionHash,
        eth_amount: ethAmount
      });

      if (purchaseResult.error) {
        console.warn('Failed to create purchase record:', purchaseResult.error);
        // Continue anyway - payment was successful
      }

      showSnackbar('Purchase complete! You now have access to the decryption key.', 'success');
      
      // After purchase, try to retrieve the key automatically
      const keyResult = await fileService.getEncryptionKey(file.id, currentUser.id);
      if (keyResult.canAccess && keyResult.key) {
        // Auto-download after purchase
        await handleEnterKey(keyResult.key);
      } else {
        // Refresh the dialog to show key options
        setKeyRequiredDialog({ open: true, file, priceUsd: price, hasPurchased: true });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      showSnackbar(error.message || 'Failed to complete purchase. Please try again.', 'error');
      throw error;
    }
  };

  const checkPurchaseStatus = async (fileId) => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) return false;

      const { getFilePurchases } = await import('./services/supabase/supabaseClient');
      const { data: purchases } = await getFilePurchases(fileId);
      return purchases?.some(p => p.buyer_id === currentUser.id) || false;
    } catch (error) {
      console.debug('Could not check purchase status:', error);
      return false;
    }
  };

  const handleDownload = async (file) => {
    try {
      showSnackbar('Downloading file...', 'info');
      
      let decryptionKey = file.encryptionKey;
      const price = file.priceUsd || file.price_usd || 0;
      const isFree = price === 0;

      // For encrypted files, get the decryption key if not already available
      if (file.encrypted && !decryptionKey) {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          const keyResult = await fileService.getEncryptionKey(file.id, currentUser.id);
          if (keyResult.canAccess && keyResult.key) {
            decryptionKey = keyResult.key;
          } else {
            // Key not found - check if file is paid and if user has purchased
            // Get price from file object or check local DB
            let price = file.priceUsd || file.price_usd || 0;
            
            // If price not in file object, try to get from local DB
            if (price === 0) {
              try {
                const db = await fileService.getDb();
                const dbFile = db.files.find(f => f.id === file.id);
                price = dbFile?.priceUsd || 0;
                if (import.meta.env.DEV) {
                }
              } catch (dbError) {
                // Silently continue
                if (import.meta.env.DEV) {
                  console.warn('Could not access local DB for price:', dbError);
                }
              }
            }
            
            const hasPurchased = price > 0 ? await checkPurchaseStatus(file.id) : true;
            
            // Show dialog to get the key (with purchase option if needed)
            setKeyRequiredDialog({ 
              open: true, 
              file: { ...file, priceUsd: price, price_usd: price }, // Ensure price is in file object
              priceUsd: price,
              hasPurchased: hasPurchased || price === 0
            });
            return;
          }
        } else {
          showSnackbar('Please log in to download encrypted files.', 'error');
          return;
        }
      }
      
      // Check if decryption key is still missing
      if (file.encrypted && !decryptionKey) {
        // Check purchase status for paid files
        let price = file.priceUsd || file.price_usd || 0;
        
        // If price not in file object, try to get from local DB
        if (price === 0) {
          try {
            const db = await fileService.getDb();
            const dbFile = db.files.find(f => f.id === file.id);
            price = dbFile?.priceUsd || 0;
          } catch (dbError) {
            // Silently continue
          }
        }
        
        const currentUser = await authService.getCurrentUser();
        const hasPurchased = price > 0 && currentUser ? await checkPurchaseStatus(file.id) : true;
        
        // Show dialog to get the key
        setKeyRequiredDialog({ 
          open: true, 
          file: { ...file, priceUsd: price, price_usd: price }, // Ensure price is in file object
          priceUsd: price,
          hasPurchased: hasPurchased || price === 0
        });
        return;
      }
      
      const blob = await fileService.downloadFile(file.id, file.storageType, {
        decryptionKey: decryptionKey,
        password: file.password
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showSnackbar('File downloaded successfully!', 'success');
    } catch (error) {
      console.error('Download error:', error);
      
      // Provide helpful error messages
      let errorMessage = error.message || 'Failed to download file.';
      if (errorMessage.includes('Decryption key required')) {
        errorMessage = 'Decryption key required. Please use "View Decrypt Key" button to retrieve it.';
      } else if (errorMessage.includes('Decryption failed')) {
        errorMessage = 'Decryption failed. Please verify the encryption key is correct.';
      }
      
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDelete = async (fileId, storageType = 'IPFS') => {
    try {
      if (!fileId) {
        showSnackbar('File ID is required for deletion.', 'error');
        return;
      }

      await fileService.deleteFile(fileId, storageType);
      showSnackbar('File deleted successfully!', 'success');
      
      // Refresh file list
      const updatedFiles = await fileService.listFiles();
      setFiles(updatedFiles);
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar(error.message || 'Failed to delete file.', 'error');
    }
  };

  const handleShare = (file) => {
    const shareUrl = `${window.location.origin}/file/${file.id}`;
    navigator.clipboard.writeText(shareUrl);
    showSnackbar('Share link copied to clipboard!', 'success');
  };

  const handleUnlockSubmit = async ({ key, password }) => {
    try {
      if (unlockDialog.file) {
        const decryptedFile = await fileService.downloadFile(
          unlockDialog.file.id,
          unlockDialog.file.storageType,
          { decryptionKey: key, password }
        );

        // Create download link
        const url = window.URL.createObjectURL(decryptedFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = unlockDialog.file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setUnlockDialog({ open: false, file: null, priceUsd: 0 });
        showSnackbar('File unlocked and downloaded!', 'success');
      }
    } catch (error) {
      console.error('Unlock error:', error);
      showSnackbar(error.message || 'Failed to unlock file.', 'error');
    }
  };

  const handleUpdateSettings = (newSettings) => {
    setSettings(newSettings);
  };

  const handleSaveSettings = async (newSettings) => {
    settingsService.saveSettings(newSettings);
    setSettings(newSettings);
    showSnackbar('Settings saved successfully!', 'success');
  };

  const handleResetSettings = () => {
    const defaultSettings = settingsService.getDefaultSettings();
    setSettings(defaultSettings);
    settingsService.saveSettings(defaultSettings);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
      autoHideDuration: 4000
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Main content
  const mainContent = (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12} md={9}>
          <FileUpload
            onFileSelect={handleFileSelect}
            disabled={!isAuthenticated}
            encryptionEnabled={settings.defaultEncryption}
            loading={loading}
          />
          <FileList
            files={files}
            selectedFiles={selectedFiles}
            onSelectFiles={setSelectedFiles}
            onDownload={handleDownload}
            onShare={handleShare}
            onDelete={handleDelete}
            onViewKey={handleViewKey}
            loading={loading}
            uploadProgress={uploadProgress}
            decryptProgress={decryptProgress}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <OnlineUsers />
        </Grid>
      </Grid>
    </>
  );

  // Encryption dialog
  const encryptionDialogEl = (
    <EncryptionDialog
      open={showEncryptionDialog}
      onClose={handleEncryptionClose}
      onConfirm={handleEncryptionConfirm}
      loading={loading}
    />
  );

  // Protected Route Component
  const ProtectedRoute = ({ children }) => {
    // If user is authenticated, show the content immediately
    if (user) {
      return children;
    }
    
    // If not authenticated and not loading, show auth prompt
    if (!loading) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '50vh',
          textAlign: 'center'
        }}>
          <Typography variant="h5" gutterBottom>
            Authentication Required
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please sign in to access eShare.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setShowAuthDialog(true)}
            startIcon={<LoginIcon />}
          >
            Sign In
          </Button>
        </Box>
      );
    }
    
    // Show loading state only while checking authentication
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '50vh',
        textAlign: 'center'
      }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h5" gutterBottom>
          Loading...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we verify your authentication.
        </Typography>
      </Box>
    );
  };

  const menuItems = [
    { text: 'Files', icon: <CloudUploadIcon />, path: '/' },
    { text: 'Profile', icon: <AccountCircleIcon />, path: '/profile' },
    { text: 'Chat', icon: <ChatIcon />, path: '/chat' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    { text: 'Developer', icon: <CodeIcon />, path: '/developer' },
    { text: 'Report', icon: <ReportIcon />, path: '/report' },
    { text: 'Help', icon: <HelpIcon />, path: '/help' }
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar
          position="fixed"
          color="inherit"
          sx={{
            boxShadow: 'none',
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            zIndex: (theme) => theme.zIndex.drawer + 1
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              eShare
            </Typography>
            <IconButton color="inherit" onClick={handleThemeMenuOpen}>
              {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            <Menu
              anchorEl={themeMenuAnchor}
              open={Boolean(themeMenuAnchor)}
              onClose={handleThemeMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={() => handleThemeSelect('light')}>
                <ListItemIcon>
                  <LightModeIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Light</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleThemeSelect('dark')}>
                <ListItemIcon>
                  <DarkModeIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Dark</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleThemeSelect('system')}>
                <ListItemIcon>
                  <ComputerIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>System</ListItemText>
              </MenuItem>
            </Menu>
            {isAuthenticated ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {userProfile?.username || 'User'}
                </Typography>
                <Button variant="outlined" size="small" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </Box>
            ) : (
              <Button variant="contained" onClick={() => setShowAuthDialog(true)}>
                Sign In
              </Button>
            )}
          </Toolbar>
        </AppBar>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto', mt: 2 }}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.text}
                  startIcon={item.icon}
                  onClick={() => navigate(item.path)}
                  sx={{
                    justifyContent: 'flex-start',
                    px: 3,
                    py: 1.5,
                    width: '100%',
                    color: isActive ? 'primary.main' : 'text.primary',
                    bgcolor: isActive ? 'primary.light' : 'transparent',
                    fontWeight: isActive ? 600 : 400,
                    '&:hover': {
                      bgcolor: isActive ? 'primary.light' : 'action.hover'
                    }
                  }}
                >
                  {item.text}
                </Button>
              );
            })}
          </Box>
        </Drawer>

        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: 'background.paper'
            }
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto', mt: 2 }}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.text}
                  startIcon={item.icon}
                  onClick={() => {
                    navigate(item.path);
                    setDrawerOpen(false);
                  }}
                  sx={{
                    justifyContent: 'flex-start',
                    px: 3,
                    py: 1.5,
                    width: '100%',
                    color: isActive ? 'primary.main' : 'text.primary',
                    bgcolor: isActive ? 'primary.light' : 'transparent',
                    fontWeight: isActive ? 600 : 400,
                    '&:hover': {
                      bgcolor: isActive ? 'primary.light' : 'action.hover'
                    }
                  }}
                >
                  {item.text}
                </Button>
              );
            })}
          </Box>
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}
        >
          <Toolbar />
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                {mainContent}
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
              <Settings
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onSaveSettings={handleSaveSettings}
                onResetSettings={handleResetSettings}
              />
              </ProtectedRoute>
            } />
            <Route path="/help" element={<Help />} />
            <Route path="/developer" element={<Devloper themeMode={themeMode} />} />
            <Route path="/report" element={<Report themeMode={themeMode} />} />
            <Route path="/chat" element={
              <ProtectedRoute>
                <GlobalChat />
              </ProtectedRoute>
            } />
          </Routes>
        </Box>
      </Box>

      {/* Dialogs - Always rendered at app level */}
      <AuthDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <WalletConnectDialog
        open={showWalletDialog}
        onClose={() => setShowWalletDialog(false)}
        onWalletConnected={handleWalletConnected}
      />

      {encryptionDialogEl}

      <UnlockDialog
        open={unlockDialog.open}
        onClose={() => setUnlockDialog({ open: false, file: null, priceUsd: 0 })}
        onSubmit={handleUnlockSubmit}
        priceUsd={unlockDialog.priceUsd}
        requiresPassword={unlockDialog.requiresPassword}
      />

      <KeyViewDialog
        open={keyViewDialog.open}
        onClose={() => setKeyViewDialog({ open: false, file: null, hasPurchased: false })}
        file={keyViewDialog.file}
        priceUsd={keyViewDialog.file?.priceUsd || keyViewDialog.file?.price_usd || 0}
        hasPurchased={keyViewDialog.hasPurchased || false}
        onGetKey={handleGetKey}
        onPurchase={async () => {
          if (keyViewDialog.file) {
            // Set the file in keyRequiredDialog for purchase handler
            const file = keyViewDialog.file;
            let price = file.priceUsd || file.price_usd || 0;
            
            // Try to get price from local DB if not in file object
            if (price === 0) {
              try {
                const db = await fileService.getDb();
                const dbFile = db.files.find(f => f.id === file.id);
                price = dbFile?.priceUsd || 0;
              } catch (dbError) {
                console.debug('Could not get price from DB:', dbError);
              }
            }
            
            setKeyRequiredDialog({ 
              open: false, 
              file: { ...file, priceUsd: price, price_usd: price }, 
              priceUsd: price, 
              hasPurchased: false 
            });
            await handlePurchaseKey();
            // Refresh key view after purchase
            const currentUser = await authService.getCurrentUser();
            if (currentUser) {
              const keyResult = await fileService.getEncryptionKey(file.id, currentUser.id);
              if (keyResult.canAccess && keyResult.key) {
                // Update dialog to show purchased state and reload key
                setKeyViewDialog({ open: true, file: { ...file, priceUsd: price, price_usd: price }, hasPurchased: true });
              }
            }
          }
        }}
      />

      <KeyRequiredDialog
        open={keyRequiredDialog.open}
        onClose={() => setKeyRequiredDialog({ open: false, file: null, priceUsd: 0, hasPurchased: false })}
        file={keyRequiredDialog.file}
        priceUsd={keyRequiredDialog.priceUsd || 0}
        hasPurchased={keyRequiredDialog.hasPurchased || false}
        onViewKey={() => handleViewKey(keyRequiredDialog.file)}
        onEnterKey={handleEnterKey}
        onGetKey={handleGetKey}
        onPurchase={handlePurchaseKey}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.autoHideDuration}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

// Helper functions are exposed in useEffect above

export default App;
