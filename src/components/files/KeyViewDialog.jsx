import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Alert,
  useTheme,
  alpha,
  CircularProgress
} from '@mui/material';
import {
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const KeyViewDialog = ({ open, onClose, file, onGetKey, onPurchase, priceUsd = 0, hasPurchased = false }) => {
  const theme = useTheme();
  const [key, setKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  
  // Get price from prop or file object
  const filePrice = priceUsd || file?.priceUsd || file?.price_usd || 0;
  const isPaidFile = filePrice > 0;
  
  // Debug logging
  useEffect(() => {
    if (open && import.meta.env.DEV) {
      console.log('🔑 KeyViewDialog opened:', {
        priceUsd_prop: priceUsd,
        file_priceUsd: file?.priceUsd,
        file_price_usd: file?.price_usd,
        calculated_filePrice: filePrice,
        isPaidFile,
        hasPurchased,
        hasOnPurchase: !!onPurchase,
        file_id: file?.id,
        file_name: file?.name
      });
    }
  }, [open, priceUsd, file, filePrice, isPaidFile, hasPurchased, onPurchase]);

  useEffect(() => {
    if (open && file) {
      // Only load key if file is free or already purchased
      if (!isPaidFile || hasPurchased) {
        loadKey();
      } else {
        // For paid files that aren't purchased, don't try to load key
        setLoading(false);
        setKey(null);
        setError(null);
      }
    } else {
      // Reset state when dialog closes
      setKey(null);
      setError(null);
      setCopied(false);
      setShowKey(false);
    }
  }, [open, file, isPaidFile, hasPurchased]);

  const loadKey = async () => {
    if (!file || !onGetKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await onGetKey(file.id);
      
      if (result.canAccess && result.key) {
        setKey(result.key);
      } else {
        setError(result.reason || 'Unable to retrieve encryption key');
      }
    } catch (err) {
      console.error('Error loading encryption key:', err);
      setError('Failed to load encryption key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (key) {
      navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            ? alpha(theme.palette.primary.main, 0.25) 
            : alpha(theme.palette.primary.main, 0.12),
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
              ? alpha(theme.palette.primary.main, 0.3) 
              : alpha(theme.palette.primary.main, 0.15),
            color: 'primary.main'
          }}
        >
          <KeyIcon />
        </Box>
        <Box>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Decryption Key
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
            {file?.name || 'File encryption key'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading encryption key...
            </Typography>
          </Box>
        ) : isPaidFile && !hasPurchased ? (
          <Box>
            <Alert 
              severity="info" 
              sx={{ 
                mb: 2, 
                borderRadius: 2,
                bgcolor: theme.palette.mode === 'dark' 
                  ? alpha(theme.palette.info.main, 0.2) 
                  : alpha(theme.palette.info.main, 0.1)
              }}
            >
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>This file requires purchase.</strong> You need to purchase access to view the decryption key.
              </Typography>
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                ${filePrice.toFixed(2)} USD
              </Typography>
            </Alert>
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<ShoppingCartIcon />}
              onClick={async () => {
                if (!onPurchase) {
                  setError('Purchase handler not available. Please refresh the page.');
                  return;
                }
                setPurchasing(true);
                setError(null);
                try {
                  await onPurchase();
                  // Reload key after purchase
                  await loadKey();
                } catch (error) {
                  setError(error.message || 'Purchase failed');
                } finally {
                  setPurchasing(false);
                }
              }}
              disabled={purchasing || !onPurchase}
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
                },
                '&:disabled': {
                  bgcolor: 'action.disabledBackground'
                }
              }}
            >
              {purchasing ? 'Processing Purchase...' : `Purchase Key for $${filePrice.toFixed(2)}`}
            </Button>
            {!onPurchase && (
              <Alert severity="warning" sx={{ mt: 1, borderRadius: 2 }}>
                Purchase handler not available. Please refresh the page.
              </Alert>
            )}
          </Box>
        ) : error && !isPaidFile ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        ) : key ? (
          <Box>
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 2, 
                borderRadius: 2,
                bgcolor: theme.palette.mode === 'dark' 
                  ? alpha(theme.palette.warning.main, 0.2) 
                  : alpha(theme.palette.warning.main, 0.1)
              }}
            >
              <Typography variant="body2">
                <strong>Important:</strong> Save this key securely. You'll need it to decrypt this file. 
                If you lose this key, you won't be able to decrypt the file.
              </Typography>
            </Alert>
            
            <TextField
              label="Encryption Key"
              value={key}
              type={showKey ? 'text' : 'password'}
              fullWidth
              multiline
              rows={3}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowKey(!showKey)}
                      edge="end"
                      size="small"
                      aria-label="toggle key visibility"
                    >
                      {showKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                    <IconButton
                      onClick={handleCopy}
                      edge="end"
                      size="small"
                      aria-label="copy key"
                      sx={{ ml: 1 }}
                    >
                      {copied ? <CheckIcon color="success" /> : <CopyIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }
              }}
            />
            
            {copied && (
              <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                Key copied to clipboard!
              </Typography>
            )}
          </Box>
        ) : null}
      </DialogContent>

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
          sx={{
            borderRadius: 2,
            px: 3,
            minWidth: 100,
            textTransform: 'none',
            fontWeight: 500
          }}
        >
          Close
        </Button>
        {key && (
          <Button
            onClick={handleCopy}
            variant="contained"
            size="large"
            startIcon={copied ? <CheckIcon /> : <CopyIcon />}
            sx={{
              borderRadius: 2,
              px: 3,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            {copied ? 'Copied!' : 'Copy Key'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default KeyViewDialog;

