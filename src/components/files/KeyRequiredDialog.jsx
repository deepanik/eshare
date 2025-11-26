import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  useTheme,
  alpha,
  Divider
} from '@mui/material';
import {
  Key as KeyIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const KeyRequiredDialog = ({ open, onClose, file, onViewKey, onEnterKey, onGetKey, onPurchase, priceUsd = 0, hasPurchased = false }) => {
  const theme = useTheme();
  const [manualKey, setManualKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyError, setKeyError] = useState(null);
  
  // Get price from prop or file object
  const filePrice = priceUsd || file?.priceUsd || file?.price_usd || 0;
  const isPaidFile = filePrice > 0;
  
  // Debug logging (remove in production)
  if (import.meta.env.DEV && open) {
    console.log('🔑 KeyRequiredDialog Debug:', {
      priceUsd_prop: priceUsd,
      file_priceUsd: file?.priceUsd,
      file_price_usd: file?.price_usd,
      calculated_filePrice: filePrice,
      isPaidFile,
      hasPurchased,
      file_id: file?.id,
      file_name: file?.name
    });
  }

  const handleViewKey = async () => {
    if (onViewKey) {
      onViewKey();
      onClose();
    }
  };

  const handleEnterKey = async () => {
    if (!manualKey.trim()) {
      setKeyError('Please enter a decryption key');
      return;
    }

    setLoading(true);
    setKeyError(null);
    
    try {
      if (onEnterKey) {
        await onEnterKey(manualKey.trim());
        onClose();
        setManualKey('');
      }
    } catch (error) {
      setKeyError(error.message || 'Invalid decryption key');
    } finally {
      setLoading(false);
    }
  };

  const handleTryAutoRetrieve = async () => {
    if (!onGetKey || !file) return;
    
    setLoading(true);
    setKeyError(null);
    
    try {
      const result = await onGetKey(file.id);
      if (result.canAccess && result.key) {
        // Key found automatically - use it
        if (onEnterKey) {
          await onEnterKey(result.key);
          onClose();
        }
      } else {
        setKeyError(result.reason || 'Key not found. Please view or enter the key manually.');
      }
    } catch (error) {
      setKeyError('Failed to retrieve key: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperComponent={motion.div}
      PaperProps={{
        initial: { opacity: 0, scale: 0.95, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        transition: { duration: 0.2, ease: 'easeOut' },
        style: {
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: theme.palette.background.paper
        }
      }}
    >
      <DialogTitle
        sx={{
          p: 3,
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.warning.main, 0.25) 
            : alpha(theme.palette.warning.main, 0.12),
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.warning.main, 0.3) 
              : alpha(theme.palette.warning.main, 0.15),
            color: 'warning.main'
          }}
        >
          <LockIcon />
        </Box>
        <Box>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Decryption Key Required
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
            {file?.name || 'This file'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {isPaidFile && !hasPurchased && (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              bgcolor: theme.palette.mode === 'dark' 
                ? alpha(theme.palette.info.main, 0.2) 
                : alpha(theme.palette.info.main, 0.1)
            }}
          >
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>This file requires purchase.</strong> You need to purchase access to get the decryption key.
            </Typography>
            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
              ${filePrice.toFixed(2)} USD
            </Typography>
          </Alert>
        )}

        {(!isPaidFile || hasPurchased) && (
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              bgcolor: theme.palette.mode === 'dark' 
                ? alpha(theme.palette.warning.main, 0.2) 
                : alpha(theme.palette.warning.main, 0.1)
            }}
          >
            <Typography variant="body2">
              This file is encrypted and requires a decryption key to download. Please retrieve or enter the key below.
            </Typography>
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          {isPaidFile && !hasPurchased ? (
            // Show purchase option for paid files
            <>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<ShoppingCartIcon />}
                onClick={async () => {
                  if (onPurchase) {
                    setLoading(true);
                    setKeyError(null);
                    try {
                      await onPurchase();
                      // After purchase, try to retrieve key automatically
                      if (onGetKey) {
                        const result = await onGetKey(file.id);
                        if (result.canAccess && result.key && onEnterKey) {
                          await onEnterKey(result.key);
                          onClose();
                        }
                      }
                    } catch (error) {
                      setKeyError(error.message || 'Purchase failed. Please try again.');
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                disabled={loading}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  fontSize: '1rem',
                  bgcolor: 'success.main',
                  '&:hover': {
                    bgcolor: 'success.dark'
                  }
                }}
              >
                {loading ? 'Processing Purchase...' : `Purchase Key for $${filePrice.toFixed(2)}`}
              </Button>
              {keyError && (
                <Alert severity="error" sx={{ mt: 1, borderRadius: 2 }}>
                  {keyError}
                </Alert>
              )}
            </>
          ) : (
            // Show key retrieval options for free files or purchased files
            <>
              <Button
                variant="contained"
                fullWidth
                startIcon={<KeyIcon />}
                onClick={handleTryAutoRetrieve}
                disabled={loading}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                {loading ? 'Retrieving Key...' : 'Try to Retrieve Key Automatically'}
              </Button>

              <Divider sx={{ my: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  OR
                </Typography>
              </Divider>

              <Button
                variant="outlined"
                fullWidth
                startIcon={<KeyIcon />}
                onClick={handleViewKey}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                View Decryption Key
              </Button>
            </>
          )}
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}>
            Enter Key Manually
          </Typography>
          <TextField
            label="Decryption Key"
            type={showKey ? 'text' : 'password'}
            fullWidth
            value={manualKey}
            onChange={(e) => {
              setManualKey(e.target.value);
              setKeyError(null);
            }}
            error={!!keyError}
            helperText={keyError || 'Paste the decryption key here'}
            InputProps={{
              endAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Button
                    onClick={() => setShowKey(!showKey)}
                    size="small"
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    {showKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </Button>
                </Box>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }
            }}
            placeholder="Enter decryption key..."
          />
        </Box>
      </DialogContent>

      <Divider />
      <DialogActions
        sx={{
          p: 2.5,
          gap: 1.5,
          bgcolor: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.divider}`
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          size="large"
          disabled={loading}
          sx={{
            borderRadius: 2,
            px: 3,
            minWidth: 100,
            textTransform: 'none',
            fontWeight: 500
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleEnterKey}
          variant="contained"
          size="large"
          disabled={loading || !manualKey.trim()}
          startIcon={<LockIcon />}
          sx={{
            borderRadius: 2,
            px: 4,
            minWidth: 160,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          {loading ? 'Processing...' : 'Use Key & Download'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KeyRequiredDialog;

