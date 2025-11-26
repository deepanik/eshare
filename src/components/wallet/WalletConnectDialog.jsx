import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  QrCode as QrCodeIcon,
  CheckCircle as CheckIcon,
  PhoneAndroid as MobileIcon
} from '@mui/icons-material';
import { walletConnectionService } from '../../services/wallet/walletConnectionService';

const WalletConnectDialog = ({ open, onClose, onWalletConnected }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, connecting, connected, error
  const [error, setError] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError(null);
    setConnectionStatus('idle');
  };

  const handleWalletSelect = async (walletType) => {
    setSelectedWallet(walletType);
    setConnectionStatus('connecting');
    setError(null);

    try {
      let walletInfo;

      switch (walletType) {
        case 'metamask':
          walletInfo = await walletConnectionService.connectMetaMask();
          break;
        case 'coinbase':
          walletInfo = await walletConnectionService.connectCoinbaseWallet();
          break;
        case 'walletconnect':
          walletInfo = await walletConnectionService.connectWalletConnect();
          break;
        default:
          throw new Error('Unknown wallet type');
      }

      setConnectionStatus('connected');
      
      // Call the callback after a short delay to show success state
      setTimeout(() => {
        if (onWalletConnected) {
          onWalletConnected(walletInfo);
        }
        handleClose();
      }, 1000);
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
      setConnectionStatus('error');
    }
  };

  const handleClose = () => {
    setConnectionStatus('idle');
    setError(null);
    setSelectedWallet(null);
    setActiveTab(0);
    onClose();
  };

  const renderWalletList = () => {
    const wallets = [
      {
        id: 'metamask',
        name: 'MetaMask',
        description: 'Connect using MetaMask browser extension',
        icon: <WalletIcon />,
        available: typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask
      },
      {
        id: 'coinbase',
        name: 'Coinbase Wallet',
        description: 'Connect using Coinbase Wallet',
        icon: <WalletIcon />,
        available: typeof window.ethereum !== 'undefined' && window.ethereum.isCoinbaseWallet
      },
      {
        id: 'walletconnect',
        name: 'WalletConnect',
        description: 'Scan QR code to connect with mobile wallet',
        icon: <QrCodeIcon />,
        available: true
      }
    ];

    return (
      <Box sx={{ mt: 2 }}>
        <List>
          {wallets.map((wallet, index) => (
            <React.Fragment key={wallet.id}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleWalletSelect(wallet.id)}
                  disabled={connectionStatus === 'connecting' || !wallet.available}
                  selected={selectedWallet === wallet.id && connectionStatus === 'connecting'}
                >
                  <ListItemIcon>
                    {wallet.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={wallet.name}
                    secondary={wallet.available ? wallet.description : 'Not available'}
                  />
                  {selectedWallet === wallet.id && connectionStatus === 'connecting' && (
                    <CircularProgress size={20} sx={{ ml: 2 }} />
                  )}
                  {selectedWallet === wallet.id && connectionStatus === 'connected' && (
                    <CheckIcon color="success" sx={{ ml: 2 }} />
                  )}
                </ListItemButton>
              </ListItem>
              {index < wallets.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Box>
    );
  };

  const renderQRCode = () => {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: 300,
        p: 3
      }}>
        <Typography variant="h6" gutterBottom>
          WalletConnect QR Code
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
          Click "Generate QR Code" to create a QR code that you can scan with your mobile wallet app.
        </Typography>
        <Button
          variant="contained"
          onClick={() => handleWalletSelect('walletconnect')}
          disabled={connectionStatus === 'connecting'}
          startIcon={<QrCodeIcon />}
          size="large"
        >
          Generate QR Code
        </Button>
      </Box>
    );
  };

  const renderConnectionStatus = () => {
    return (
      <Box sx={{ p: 3 }}>
        {connectionStatus === 'idle' && (
          <Alert severity="info">
            Select a wallet option to get started.
          </Alert>
        )}
        {connectionStatus === 'connecting' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={60} />
            <Typography variant="h6">Connecting to wallet...</Typography>
            <Typography variant="body2" color="text.secondary">
              Please approve the connection in your wallet.
            </Typography>
          </Box>
        )}
        {connectionStatus === 'connected' && (
          <Alert severity="success" icon={<CheckIcon />}>
            Wallet connected successfully!
          </Alert>
        )}
        {connectionStatus === 'error' && error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        Connect Wallet
      </DialogTitle>
      
      <DialogContent>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
            variant={isMobile ? "fullWidth" : "standard"}
            sx={{ px: 2 }}
          >
            <Tab 
              label="Wallets" 
              icon={<MobileIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="QR Code" 
              icon={<QrCodeIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Status" 
              icon={<CheckIcon />} 
              iconPosition="start"
            />
          </Tabs>
        
        {activeTab === 0 && renderWalletList()}
        {activeTab === 1 && renderQRCode()}
        {activeTab === 2 && renderConnectionStatus()}
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={connectionStatus === 'connecting'}>
          Cancel
        </Button>
        {connectionStatus === 'connecting' && (
          <Button
            variant="contained"
            disabled
            startIcon={<CircularProgress size={20} />}
          >
            Connecting...
          </Button>
        )}
        {connectionStatus === 'idle' && activeTab === 1 && (
          <Button
            variant="contained"
            onClick={() => handleWalletSelect('walletconnect')}
            startIcon={<QrCodeIcon />}
          >
            Generate QR Code
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WalletConnectDialog;
