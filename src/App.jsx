import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Alert, Snackbar, Paper, AppBar, Toolbar, Drawer, IconButton, CircularProgress, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import Settings from './components/settings/Settings';
import Help from './components/help/Help';
import FileList from './components/files/FileList';
import FileUpload from './components/files/FileUpload';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import KeyIcon from '@mui/icons-material/Key';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { motion, AnimatePresence } from 'framer-motion';
import { web3Service } from './services/web3/web3Service';
import { fileService } from './services/files/fileService';
import { encryptionService } from './services/encryption/encryptionService';
import JSZip from 'jszip';
import CryptoJS from 'crypto-js';

const drawerWidth = 240;

function App() {
  const [themeMode, setThemeMode] = useState('dark');
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [error, setError] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [decryptProgress, setDecryptProgress] = useState({});
  const [filePasswords, setFilePasswords] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [keyStatus, setKeyStatus] = useState({});
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [keyDialogType, setKeyDialogType] = useState('');
  const [keyDialogData, setKeyDialogData] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [showKeyInfo, setShowKeyInfo] = useState(false);
  const [selectedKeyInfo, setSelectedKeyInfo] = useState(null);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreData, setRestoreData] = useState('');
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [decryptionDialog, setDecryptionDialog] = useState({
    open: false,
    fileToDecrypt: null,
    decryptionKey: '',
    password: '',
    error: null
  });
  const [encryptionKeyDialog, setEncryptionKeyDialog] = useState({
    open: false,
    fileName: '',
    encryptionKey: '',
  });

  // Add settings state
  const [settings, setSettings] = useState({
    theme: 'system',
    listView: false,
    defaultEncryption: true,
    saveEncryptionKeys: true,
    storageType: 'ipfs',
    autoDeleteDays: 0,
    emailNotifications: false,
    desktopNotifications: true
  });

  // Theme handling
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(
    settings.theme === 'system' 
      ? (prefersDarkMode.matches ? 'dark' : 'light')
      : settings.theme
  );

  useEffect(() => {
    const handleChange = (e) => {
      if (settings.theme === 'system') {
        setMode(e.matches ? 'dark' : 'light');
      }
    };
    prefersDarkMode.addEventListener('change', handleChange);
    return () => prefersDarkMode.removeEventListener('change', handleChange);
  }, [settings.theme]);

  // Settings handlers
  const handleUpdateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    
    // Handle theme changes
    if (newSettings.theme) {
      if (newSettings.theme === 'system') {
        setMode(prefersDarkMode.matches ? 'dark' : 'light');
      } else {
        setMode(newSettings.theme);
      }
    }

    // Handle encryption settings
    if (newSettings.defaultEncryption !== undefined) {
      // Update encryption state
      setEncryptionEnabled(newSettings.defaultEncryption);
      if (newSettings.defaultEncryption && !encryptionKey) {
        const newKey = encryptionService.generateEncryptionKey();
        setEncryptionKey(newKey);
      } else if (!newSettings.defaultEncryption) {
        setEncryptionKey(null);
      }
    }

    // Handle storage settings
    if (newSettings.storageType) {
      // Update the storage type in settings
      // The actual storage type will be used when uploading files
      console.log('Storage type updated to:', newSettings.storageType);
    }

    // Handle notifications
    if (newSettings.desktopNotifications !== undefined) {
      if (newSettings.desktopNotifications) {
        Notification.requestPermission();
      }
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      // Save settings to local storage
      localStorage.setItem('appSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      
      // Apply immediate settings
      handleUpdateSettings(newSettings);

      // Update file list view if changed
      if (newSettings.listView !== settings.listView) {
        // Trigger file list refresh
        setRefreshFiles(prev => !prev);
      }

      // Configure auto-deletion if enabled
      if (newSettings.autoDeleteDays > 0) {
        const deleteAfter = newSettings.autoDeleteDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
        fileService.setAutoDelete(deleteAfter);
      } else {
        fileService.setAutoDelete(null);
      }

      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  const handleResetSettings = () => {
    const defaultSettings = {
      theme: 'system',
      listView: false,
      defaultEncryption: true,
      saveEncryptionKeys: true,
      storageType: 'ipfs',
      autoDeleteDays: 0,
      emailNotifications: false,
      desktopNotifications: true
    };

    setSettings(defaultSettings);
    localStorage.setItem('appSettings', JSON.stringify(defaultSettings));
    handleUpdateSettings(defaultSettings);
  };

  // Load settings from local storage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
      handleUpdateSettings(parsedSettings);
    }
  }, []);

  // Create theme with current mode
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode],
  );

  const customTheme = createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: '#2D7FF9'
      },
      background: {
        default: themeMode === 'dark' ? '#0A0C10' : '#F8FAFC',
        paper: themeMode === 'dark' ? '#111318' : '#FFFFFF'
      },
      text: {
        primary: themeMode === 'dark' ? '#FFFFFF' : '#1A1D1F',
        secondary: themeMode === 'dark' ? '#9BA1A9' : '#6F767E'
      }
    },
    shape: {
      borderRadius: 8
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: {
        fontSize: '2rem',
        fontWeight: 600
      },
      h2: {
        fontSize: '1.5rem',
        fontWeight: 600
      },
      button: {
        textTransform: 'none',
        fontWeight: 500
      }
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: '0.9375rem'
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none'
            }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none'
          }
        }
      }
    }
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    initWeb3();
    loadFiles(); // Load files when component mounts
    loadKeyStatus();
  }, []);

  const initWeb3 = async () => {
    try {
      setLoading(true);
      await web3Service.initialize();
      const accounts = await web3Service.getAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const balance = await web3Service.getBalance(accounts[0]);
        setBalance(balance);
      }
    } catch (err) {
      setError('Failed to initialize Web3');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const fileList = await fileService.listFiles();
      setFiles(fileList);
    } catch (err) {
      setError('Failed to load files');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      const accounts = await web3Service.connect();
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const balance = await web3Service.getBalance(accounts[0]);
        setBalance(balance);
      }
    } catch (err) {
      setError('Failed to connect wallet');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setBalance('0');
  };

  const handleFileSelect = async (files, encryptionOptions = null) => {
    try {
      setLoading(true);
      setError(null);

      // Ensure files is always an array of valid File objects
      const fileArray = Array.isArray(files) ? files : [files];
      
      if (!fileArray.length) {
        throw new Error('No files selected');
      }

      // Validate each file
      fileArray.forEach(file => {
        if (!(file instanceof File)) {
          throw new Error('Invalid file object');
        }
      });

      // Create an array to track uploading files
      const uploading = fileArray.map(file => ({
        id: `temp-${Date.now()}-${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString(),
        uploading: true
      }));

      setUploadingFiles(prev => [...prev, ...uploading]);

      // Upload each file
      const uploadPromises = fileArray.map(async (file) => {
        try {
          const updateProgress = (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: progress
            }));
          };

          updateProgress(0);

          // Upload to IPFS with encryption if enabled
          const { ipfsHash, metadata, encryptionKey } = await fileService.uploadToIPFS(file, {
            ...encryptionOptions,
            useEncryption: encryptionEnabled
          });
          
          updateProgress(100);

          // If file was encrypted, save the key and show it to user
          if (encryptionKey && account) {
            const db = await fileService.getDb();
            db.keys.push({
              fileId: ipfsHash,
              fileName: file.name,
              encryptionKey,
              walletAddress: account,
              createdAt: new Date().toISOString(),
              isPasswordProtected: !!encryptionOptions?.password
            });
            await fileService.saveDb(db);

            // Show encryption key dialog
            setEncryptionKeyDialog({
              open: true,
              fileName: file.name,
              encryptionKey: encryptionKey
            });
          }

          const now = new Date().toISOString();
          return {
            id: ipfsHash,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadDate: now,
            storageType: 'IPFS',
            metadata: {
              fileId: ipfsHash,
              encrypted: encryptionEnabled,
              uploadDate: now,
              ...metadata
            }
          };
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          throw error;
        }
      });

      // Wait for all uploads to complete
      const uploadedFiles = await Promise.all(uploadPromises);

      // Update files list and clean up
      setFiles(prev => [...prev, ...uploadedFiles]);
      setUploadingFiles([]);
      setUploadProgress({});

    } catch (error) {
      console.error('File upload failed:', error);
      setError(error.message || 'Failed to upload files. Please try again.');
      setUploadingFiles([]);
      setUploadProgress({});
    } finally {
      setLoading(false);
    }
  };

  // Add a function to get user's encryption keys
  const getUserEncryptionKeys = async () => {
    try {
      if (!account) {
        showSnackbar('Please connect your wallet first', 'warning');
        return [];
      }

      const db = await fileService.getDb();
      return db.keys.filter(key => key.walletAddress === account);
    } catch (error) {
      console.error('Failed to get encryption keys:', error);
      return [];
    }
  };

  // Update showEncryptionKeysDialog to refresh keys
  const showEncryptionKeysDialog = async () => {
    const keys = await getUserEncryptionKeys();
    setKeyDialogType('view');
    setKeyDialogData({ keys });
    setShowKeyDialog(true);
  };

  const handleKeyDialogSubmit = async (data) => {
    try {
      setLoading(true);
      if (keyDialogType === 'share') {
        const { fileIds, expirationHours } = keyDialogData;
        const bundles = fileIds.map(fileId => {
          const file = files.find(f => f.id === fileId);
          return encryptionService.createKeyBundle(file.metadata.fileId, null, expirationHours);
        });

        const bundleString = JSON.stringify(bundles);
        const encoded = btoa(bundleString);
        const shareLink = `${window.location.origin}/share?keys=${encoded}`;
        await navigator.clipboard.writeText(shareLink);
        showSnackbar('Share link copied to clipboard!', 'success');
      } else if (keyDialogType === 'import') {
        const { encodedKeys } = data;
        if (!encodedKeys) {
          throw new Error('No key data provided');
        }

        // Try to parse the key data
        let keyData;
        try {
          // First try to parse as direct key
          if (encodedKeys.length === 64 && /^[0-9a-f]+$/i.test(encodedKeys)) {
            keyData = {
              fileId: encodedKeys.substring(0, 16),
              fileName: 'Imported Key',
              encryptionKey: encodedKeys,
              walletAddress: account,
              createdAt: new Date().toISOString(),
              isPasswordProtected: false
            };
          } else {
            // Try to decode as base64 and parse as JSON
            const decoded = atob(encodedKeys);
            keyData = JSON.parse(decoded);
          }
        } catch (error) {
          throw new Error('Invalid key format. Please ensure you\'ve copied the entire key data correctly.');
        }

        // Get current database
        const db = await fileService.getDb();
        
        // Add the new key(s)
        if (Array.isArray(keyData)) {
          keyData.forEach(key => {
            if (!key.walletAddress) key.walletAddress = account;
            db.keys.push(key);
          });
        } else {
          if (!keyData.walletAddress) keyData.walletAddress = account;
          db.keys.push(keyData);
        }

        // Save updated database
        await fileService.saveDb(db);
        
        showSnackbar('Keys imported successfully!', 'success');
        setShowKeyDialog(false);
        
        // Refresh the keys display
        const updatedKeys = await getUserEncryptionKeys();
        setKeyDialogType('view');
        setKeyDialogData({ keys: updatedKeys });
        setShowKeyDialog(true);
      }
    } catch (error) {
      console.error('Key dialog action failed:', error);
      showSnackbar(error.message || 'Failed to process keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'info', duration = 6000) => {
    setSnackbar({ open: true, message, severity, autoHideDuration: duration });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const setFilePassword = (fileId, password) => {
    setFilePasswords(prev => ({
      ...prev,
      [fileId]: password
    }));
  };

  const handleShare = async (fileId) => {
    try {
      setLoading(true);
      setError(null);

      // Prompt for target wallet address
      const targetWallet = prompt('Enter the wallet address to share with:');
      if (!targetWallet) {
        return;
      }

      await fileService.shareFile(fileId, targetWallet);
      showSnackbar('File shared successfully!', 'success');
    } catch (err) {
      setError(err.message || 'Failed to share file');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId, storageType) => {
    try {
      setLoading(true);
      setError(null);
      await fileService.deleteFile(fileId, storageType);
      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
    } catch (err) {
      setError('Failed to delete file');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const toggleEncryption = () => {
    if (encryptionEnabled) {
      setEncryptionEnabled(false);
      setEncryptionKey(null);
    } else {
      const newKey = encryptionService.generateEncryptionKey();
      setEncryptionKey(newKey);
      setEncryptionEnabled(true);
    }
  };

  // Load key status for files
  const loadKeyStatus = () => {
    const newStatus = {};
    files.forEach(file => {
      if (file.metadata?.fileId) {
        newStatus[file.id] = encryptionService.getKeyStatus(file.metadata.fileId);
      }
    });
    setKeyStatus(newStatus);
  };

  // Handle key rotation
  const handleKeyRotation = async (fileId) => {
    try {
      setLoading(true);
      await encryptionService.rotateKey(fileId);
      loadKeyStatus();
      showSnackbar('Key rotated successfully', 'success');
    } catch (error) {
      showSnackbar(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Show key information dialog
  const showKeyInformation = (fileId) => {
    const status = keyStatus[fileId];
    if (status) {
      setSelectedKeyInfo({
        ...status,
        fileId
      });
      setShowKeyInfo(true);
    }
  };

  const handleBackupKeys = async () => {
    try {
      setLoading(true);
      const backupData = {
        keys: Array.from(encryptionService.keyMap.entries()),
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      // Encrypt backup data with password
      const encryptedBackup = CryptoJS.AES.encrypt(
        JSON.stringify(backupData),
        backupPassword
      ).toString();

      // Create backup file
      const blob = new Blob([encryptedBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `key-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSnackbar('Key backup created successfully!', 'success');
      setShowBackupDialog(false);
      setBackupPassword('');
    } catch (error) {
      showSnackbar(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreKeys = async () => {
    try {
      setLoading(true);
      
      // First try to decrypt the backup data
      const decryptedData = CryptoJS.AES.decrypt(
        restoreData.trim(), // Remove any extra whitespace
        backupPassword
      ).toString(CryptoJS.enc.Utf8);
      
      if (!decryptedData) {
        throw new Error('Failed to decrypt backup data. Please check your password.');
      }

      // Then parse the decrypted JSON data
      let parsedBackup;
      try {
        parsedBackup = JSON.parse(decryptedData);
      } catch (e) {
        throw new Error('Invalid backup data format. Please make sure you\'ve copied the entire backup file content.');
      }
      
      // Validate backup version
      if (!parsedBackup || !parsedBackup.version || parsedBackup.version !== '1.0') {
        throw new Error('Unsupported or invalid backup version');
      }

      if (!Array.isArray(parsedBackup.keys)) {
        throw new Error('Invalid backup data structure');
      }

      // Restore keys
      encryptionService.keyMap = new Map(parsedBackup.keys);
      loadKeyStatus();
      
      showSnackbar('Keys restored successfully!', 'success');
      setShowRestoreDialog(false);
      setRestoreData('');
      setBackupPassword('');
    } catch (error) {
      console.error('Restore error:', error);
      let errorMessage = 'Failed to restore keys.';
      
      if (error.message.includes('malformed UTF-8 data')) {
        errorMessage = 'Invalid backup data or incorrect password.';
      } else if (error.message.includes('Unexpected token')) {
        errorMessage = 'Invalid backup data format. Please make sure you\'ve copied the entire backup file content.';
      } else {
        errorMessage = error.message;
      }
      
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Modify the key dialog render function
  const renderKeyDialog = () => (
    <Dialog 
      open={showKeyDialog} 
      onClose={() => setShowKeyDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {keyDialogType === 'share' ? 'Share Encryption Keys' : 
         keyDialogType === 'import' ? 'Import Encryption Keys' : 
         'Your Encryption Keys'}
      </DialogTitle>
      <DialogContent>
        {keyDialogType === 'view' && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Here are all your encryption keys. Keep them safe - you'll need them to decrypt your files.
            </Typography>
            {keyDialogData?.keys?.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                {keyDialogData.keys.map((key) => (
                  <Paper
                    key={key.fileId}
                    sx={{
                      p: 2,
                      mb: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      {key.fileName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      File ID: {key.fileId}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        bgcolor: 'background.default',
                        p: 1,
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                      }}
                    >
                      {key.encryptionKey}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Created: {new Date(key.createdAt).toLocaleString()}
                    </Typography>
                  </Paper>
                ))}
                <Button
                  variant="contained"
                  onClick={handleBackupKeys}
                  startIcon={<BackupIcon />}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Backup All Keys
                </Button>
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                No encryption keys found for your wallet address.
              </Typography>
            )}
          </Box>
        )}
        {keyDialogType === 'share' && (
          <TextField
            label="Expiration (hours)"
            type="number"
            fullWidth
            defaultValue={24}
            onChange={(e) => setKeyDialogData({ ...keyDialogData, expirationHours: parseInt(e.target.value) })}
            margin="normal"
          />
        )}
        {keyDialogType === 'import' && (
          <TextField
            label="Encoded Keys"
            fullWidth
            multiline
            rows={4}
            onChange={(e) => setKeyDialogData({ encodedKeys: e.target.value })}
            margin="normal"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowKeyDialog(false)}>Close</Button>
        {keyDialogType !== 'view' && (
          <Button 
            onClick={() => handleKeyDialogSubmit(keyDialogData)} 
            color="primary"
            variant="contained"
          >
            {keyDialogType === 'share' ? 'Generate Share Link' : 'Import Keys'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  const renderKeyInfoDialog = () => (
    <Dialog open={showKeyInfo} onClose={() => setShowKeyInfo(false)}>
      <DialogTitle>Key Information</DialogTitle>
      <DialogContent>
        {selectedKeyInfo && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              <strong>Status:</strong> {selectedKeyInfo.isExpired ? 'Expired' : 'Active'}
            </Typography>
            <Typography variant="body1">
              <strong>Days until expiration:</strong> {selectedKeyInfo.daysUntilExpiration}
            </Typography>
            <Typography variant="body1">
              <strong>Days until rotation:</strong> {selectedKeyInfo.daysUntilRotation}
            </Typography>
            <Typography variant="body1">
              <strong>Version:</strong> {selectedKeyInfo.version}
            </Typography>
            <Typography variant="body1">
              <strong>Password Protected:</strong> {selectedKeyInfo.isPasswordProtected ? 'Yes' : 'No'}
            </Typography>
            <Typography variant="body1">
              <strong>Created:</strong> {new Date(selectedKeyInfo.createdAt).toLocaleString()}
            </Typography>
            {selectedKeyInfo.importedAt && (
              <Typography variant="body1">
                <strong>Imported:</strong> {new Date(selectedKeyInfo.importedAt).toLocaleString()}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowKeyInfo(false)}>Close</Button>
        {selectedKeyInfo && !selectedKeyInfo.isExpired && (
          <Button
            onClick={() => {
              handleKeyRotation(selectedKeyInfo.fileId);
              setShowKeyInfo(false);
            }}
            color="primary"
            startIcon={<RotateLeftIcon />}
          >
            Rotate Key
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  const renderBackupDialog = () => (
    <Dialog open={showBackupDialog} onClose={() => setShowBackupDialog(false)}>
      <DialogTitle>Backup Encryption Keys</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create a secure backup of your encryption keys. This backup will be encrypted with your password.
          Store this backup file and password securely - you'll need both to restore your keys later.
        </Typography>
        <TextField
          label="Backup Password"
          type="password"
          fullWidth
          value={backupPassword}
          onChange={(e) => setBackupPassword(e.target.value)}
          margin="normal"
          helperText="Choose a strong password to protect your backup"
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          ⚠️ Important: Store both the backup file and password securely. Without either, you won't be able to restore your keys.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowBackupDialog(false)}>Cancel</Button>
        <Button 
          onClick={handleBackupKeys} 
          color="primary"
          disabled={!backupPassword || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <BackupIcon />}
        >
          Create Backup
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderRestoreDialog = () => (
    <Dialog open={showRestoreDialog} onClose={() => setShowRestoreDialog(false)}>
      <DialogTitle>Restore Encryption Keys</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Restore your encryption keys from a backup file. You'll need both the backup file and the password used to create it.
        </Typography>
        <TextField
          label="Backup Password"
          type="password"
          fullWidth
          value={backupPassword}
          onChange={(e) => setBackupPassword(e.target.value)}
          margin="normal"
          helperText="Enter the password used to create the backup"
        />
        <TextField
          label="Backup Data"
          fullWidth
          multiline
          rows={4}
          value={restoreData}
          onChange={(e) => setRestoreData(e.target.value)}
          margin="normal"
          helperText={
            <Box>
              <Typography variant="caption" component="div">
                1. Open your backup file in a text editor
              </Typography>
              <Typography variant="caption" component="div">
                2. Copy all the contents
              </Typography>
              <Typography variant="caption" component="div">
                3. Paste them here
              </Typography>
            </Box>
          }
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          ⚠️ Warning: Restoring keys will replace any existing keys. Make sure you have a backup of your current keys if needed.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowRestoreDialog(false)}>Cancel</Button>
        <Button 
          onClick={handleRestoreKeys} 
          color="primary"
          disabled={!backupPassword || !restoreData || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <RestoreIcon />}
        >
          Restore Keys
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderDecryptionDialog = () => (
    <Dialog 
      open={decryptionDialog.open} 
      onClose={() => setDecryptionDialog(prev => ({ ...prev, open: false }))}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Decrypt File
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            This file is encrypted. Please enter the decryption key that was shown when the file was uploaded.
          </Typography>
          
          <TextField
            label="Decryption Key"
            fullWidth
            value={decryptionDialog.decryptionKey}
            onChange={(e) => setDecryptionDialog(prev => ({ ...prev, decryptionKey: e.target.value }))}
            margin="normal"
            error={!!decryptionDialog.error}
            helperText={decryptionDialog.error}
            autoFocus
          />

          {decryptionDialog.fileToDecrypt?.isPasswordProtected && (
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={decryptionDialog.password}
              onChange={(e) => setDecryptionDialog(prev => ({ ...prev, password: e.target.value }))}
              margin="normal"
            />
          )}

          <Button
            variant="text"
            onClick={showEncryptionKeysDialog}
            startIcon={<KeyIcon />}
            sx={{ mt: 1 }}
          >
            View My Saved Keys
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => setDecryptionDialog(prev => ({ ...prev, open: false }))}
        >
          Cancel
        </Button>
        <Button 
          onClick={() => handleDecryptAndDownload()} 
          variant="contained"
          disabled={!decryptionDialog.decryptionKey}
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );

  const handleDecryptAndDownload = async () => {
    try {
      const { fileToDecrypt, decryptionKey, password } = decryptionDialog;
      
      if (!fileToDecrypt || !decryptionKey) {
        return;
      }

      setLoading(true);
      setDecryptionDialog(prev => ({ ...prev, error: null }));

      const downloadOptions = {
        decryptionKey: decryptionKey.trim(),
        password: password.trim()
      };

      const downloadedFile = await fileService.downloadFile(
        fileToDecrypt.id,
        fileToDecrypt.storageType || 'IPFS',
        downloadOptions
      );

      if (!downloadedFile) {
        throw new Error('Failed to download file content');
      }

      // Create and trigger download
      const blob = new Blob([downloadedFile], { 
        type: fileToDecrypt.metadata?.originalType || fileToDecrypt.type || 'application/octet-stream'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileToDecrypt.metadata?.originalName || fileToDecrypt.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDecryptionDialog(prev => ({ ...prev, open: false }));
      showSnackbar('File downloaded successfully!', 'success');
    } catch (err) {
      console.error('Download failed:', err);
      let errorMessage = 'Failed to download file';
      
      if (err.message.includes('File not found')) {
        errorMessage = 'File not found. The file may have been deleted or moved.';
      } else if (err.message.includes('Encryption key not found')) {
        errorMessage = 'Invalid decryption key. Please make sure you are using the correct key.';
      } else if (err.message.includes('Incorrect password')) {
        errorMessage = 'Incorrect password. Please try again.';
      }
      
      setDecryptionDialog(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setLoading(false);
    }
  };

  const renderEncryptionKeyDialog = () => (
    <Dialog
      open={encryptionKeyDialog.open}
      onClose={() => setEncryptionKeyDialog(prev => ({ ...prev, open: false }))}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Save Your Encryption Key</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Your file <strong>{encryptionKeyDialog.fileName}</strong> has been encrypted successfully!
          </Typography>
          <Typography variant="body2" color="error" gutterBottom sx={{ mt: 2 }}>
            ⚠️ IMPORTANT: Save this encryption key immediately. You will need it to decrypt your file later.
          </Typography>
          
          <Paper
            sx={{
              p: 2,
              mt: 2,
              mb: 2,
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}
            >
              {encryptionKeyDialog.encryptionKey}
            </Typography>
          </Paper>

          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              navigator.clipboard.writeText(encryptionKeyDialog.encryptionKey);
              showSnackbar('Encryption key copied to clipboard!', 'success');
            }}
            sx={{ mb: 2 }}
          >
            Copy Key to Clipboard
          </Button>

          <Typography variant="body2" color="text.secondary">
            This key has been saved to your account and can be viewed later in "View My Keys", but we recommend saving it somewhere safe as a backup.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => setEncryptionKeyDialog(prev => ({ ...prev, open: false }))}
          variant="contained"
        >
          I Have Saved The Key
        </Button>
      </DialogActions>
    </Dialog>
  );

  const handleDownload = async (file) => {
    try {
      if (!file || !file.id) {
        throw new Error('Invalid file object');
      }

      // If file is encrypted, show decryption dialog
      if (file.encrypted || file.metadata?.encrypted) {
        setDecryptionDialog({
          open: true,
          fileToDecrypt: file,
          decryptionKey: '',
          password: '',
          error: null
        });
        return;
      }

      // For unencrypted files, download directly
      setLoading(true);
      const downloadedFile = await fileService.downloadFile(
        file.id,
        file.storageType || 'IPFS',
        {}
      );

      if (!downloadedFile) {
        throw new Error('Failed to download file content');
      }

      // Create and trigger download
      const blob = new Blob([downloadedFile], { 
        type: file.metadata?.originalType || file.type || 'application/octet-stream'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.metadata?.originalName || file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSnackbar('File downloaded successfully!', 'success');
    } catch (err) {
      console.error('Download failed:', err);
      setError(err.message || 'Failed to download file');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDownload = async () => {
    try {
      setLoading(true);
      setError(null);

      const filesToDownload = selectedFiles.map(fileId => {
        const file = files.find(f => f.id === fileId);
        return {
          data: file,
          fileId: file.metadata?.fileId,
          originalName: file.metadata?.originalName || file.name,
          originalType: file.metadata?.originalType || file.type,
          password: file.metadata?.isPasswordProtected ? filePasswords[file.id] : null
        };
      });

      const results = await encryptionService.batchDecrypt(
        filesToDownload,
        null,
        (progress) => {
          setDecryptProgress(prev => ({
            ...prev,
            batch: progress
          }));
        }
      );

      // Create zip file with decrypted files
      const zip = new JSZip();
      results.forEach(result => {
        if (result.success) {
          zip.file(result.originalName, result.file);
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'decrypted_files.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show results
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        setError(`Failed to decrypt ${failed.length} files: ${failed.map(f => f.originalName).join(', ')}`);
      }

    } catch (err) {
      console.error('Batch download failed:', err);
      setError('Failed to download files');
    } finally {
      setLoading(false);
      setDecryptProgress(prev => ({
        ...prev,
        batch: 0
      }));
    }
  };

  const handleShareKeys = async (fileIds) => {
    try {
      setKeyDialogType('share');
      setKeyDialogData({ fileIds });
      setShowKeyDialog(true);
    } catch (error) {
      showSnackbar(error.message, 'error');
    }
  };

  const handleImportKeys = () => {
    setKeyDialogType('import');
    setShowKeyDialog(true);
  };

  const mainContent = (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          onClick={toggleEncryption}
          color={encryptionKey ? "success" : "primary"}
          startIcon={encryptionKey ? <LockIcon /> : <LockOpenIcon />}
        >
          {encryptionKey ? "Encryption Enabled" : "Enable Encryption"}
        </Button>

        {account && (
          <Button
            variant="outlined"
            onClick={showEncryptionKeysDialog}
            startIcon={<KeyIcon />}
          >
            View My Keys
          </Button>
        )}

        {encryptionKey && (
          <>
            <Button
              variant="outlined"
              onClick={handleImportKeys}
              startIcon={<KeyIcon />}
            >
              Import Keys
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowBackupDialog(true)}
              startIcon={<BackupIcon />}
            >
              Backup Keys
            </Button>
          </>
        )}

        {selectedFiles.length > 0 && (
          <>
            <Button
              variant="contained"
              onClick={handleBatchDownload}
              startIcon={<DownloadIcon />}
            >
              Download Selected
            </Button>
            <Button
              variant="contained"
              onClick={() => handleShareKeys(selectedFiles)}
              startIcon={<ShareIcon />}
            >
              Share Keys
            </Button>
          </>
        )}
      </Box>
      
      <FileUpload
        onFileSelect={handleFileSelect}
        disabled={!account}
        encryptionEnabled={!!encryptionKey}
      />
      
      <FileList
        files={[...uploadingFiles, ...files]}
        selectedFiles={selectedFiles}
        onSelectFiles={setSelectedFiles}
        onDownload={handleDownload}
        onShare={handleShare}
        onDelete={handleDelete}
        onSetPassword={setFilePassword}
        loading={loading}
        uploadProgress={uploadProgress}
        decryptProgress={decryptProgress}
        keyStatus={keyStatus}
        onShowKeyInfo={showKeyInformation}
        onRotateKey={handleKeyRotation}
      />

      {renderKeyDialog()}
      {renderKeyInfoDialog()}
      {renderBackupDialog()}
      {renderRestoreDialog()}
      {renderDecryptionDialog()}
      {renderEncryptionKeyDialog()}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.autoHideDuration}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );

  const menuItems = [
    { text: 'Files', icon: <CloudUploadIcon />, path: '/' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    { text: 'Help', icon: <HelpIcon />, path: '/help' }
  ];

  return (
    <ThemeProvider theme={customTheme}>
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
            <IconButton color="inherit" onClick={toggleTheme}>
              {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            {account ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </Typography>
                <Button variant="outlined" size="small" onClick={disconnectWallet}>
                  Disconnect
                </Button>
              </Box>
            ) : (
              <Button variant="contained" onClick={connectWallet}>
                Connect Wallet
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
            {menuItems.map((item) => (
              <Button
                key={item.text}
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                sx={{
                  justifyContent: 'flex-start',
                  px: 3,
                  py: 1.5,
                  width: '100%',
                  color: 'text.primary',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                {item.text}
              </Button>
            ))}
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
            {menuItems.map((item) => (
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
                  color: 'text.primary',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                {item.text}
              </Button>
            ))}
          </Box>
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` }
          }}
        >
          <Toolbar />
          <Routes>
            <Route path="/" element={mainContent} />
            <Route path="/settings" element={
              <Settings
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onSaveSettings={handleSaveSettings}
                onResetSettings={handleResetSettings}
              />
            } />
            <Route path="/help" element={<Help />} />
          </Routes>
        </Box>

        {renderKeyDialog()}
        {renderKeyInfoDialog()}
        {renderBackupDialog()}
        {renderRestoreDialog()}
        {renderDecryptionDialog()}
        {renderEncryptionKeyDialog()}
      </Box>
    </ThemeProvider>
  );
}

export default App;
