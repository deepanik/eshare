import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  useTheme,
  alpha,
  Alert,
  Divider,
  InputAdornment,
  Card,
  CardContent
} from '@mui/material';
import {
  Lock as LockIcon,
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon,
  AttachMoney as MoneyIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const EncryptionDialog = ({ open, onClose, onConfirm, loading }) => {
  const theme = useTheme();
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [priceError, setPriceError] = useState(null);
  const [priceUsd, setPriceUsd] = useState('0');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setUsePassword(false);
      setPassword('');
      setShowPassword(false);
      setError(null);
      setPriceError(null);
      setPriceUsd('0');
    }
  }, [open]);

  const handlePriceChange = (e) => {
    const value = e.target.value;
    setPriceUsd(value);
    setPriceError(null);
    
    if (value && (isNaN(value) || Number(value) < 0)) {
      setPriceError('Price must be a number ≥ 0');
    }
  };

  const handleConfirm = () => {
    // Validate password
    if (usePassword && !password.trim()) {
      setError('Please enter a password');
      return;
    }
    if (usePassword && password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    
    // Validate price
    const price = Number(priceUsd);
    if (isNaN(price) || price < 0) {
      setPriceError('Price must be a number ≥ 0');
      return;
    }
    
    setError(null);
    setPriceError(null);
    
    onConfirm({
      useEncryption: true,
      usePassword,
      password: usePassword ? password : null,
      priceUsd: price
    });
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
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
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: theme.palette.background.paper,
          backgroundImage: 'none'
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
          <SecurityIcon />
        </Box>
        <Box>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Encryption & Pricing
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
            Configure file security and access settings
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Alert
            severity="info"
            icon={<InfoIcon />}
            sx={{
              borderRadius: 2,
              bgcolor: theme.palette.mode === 'dark' 
                ? alpha(theme.palette.info.main, 0.2) 
                : alpha(theme.palette.info.main, 0.1),
              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
              '& .MuiAlert-icon': {
                color: 'info.main'
              }
            }}
          >
            <Typography variant="body2">
              Your file will be encrypted before uploading. Make sure to save the encryption key that will be shown after the upload.
            </Typography>
          </Alert>
        </Box>

        <Card
          variant="outlined"
          sx={{
            mb: 3,
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.primary.main, 0.15) 
              : alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            transition: 'all 0.2s ease'
          }}
        >
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <FormControlLabel
              control={
                <Switch
                  checked={usePassword}
                  onChange={(e) => {
                    setUsePassword(e.target.checked);
                    setError(null);
                    if (!e.target.checked) {
                      setPassword('');
                    }
                  }}
                  color="primary"
                  sx={{ mr: 1 }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <KeyIcon fontSize="small" color="primary" />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Add Password Protection
                  </Typography>
                </Box>
              }
              sx={{ m: 0, width: '100%' }}
            />

            {usePassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <Box sx={{ mt: 2.5 }}>
                  <TextField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    error={!!error}
                    helperText={error || 'Minimum 4 characters required'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon fontSize="small" color={error ? 'error' : 'action'} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                            aria-label="toggle password visibility"
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      }
                    }}
                    placeholder="Enter a secure password"
                  />
                </Box>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}>
            Pricing
          </Typography>
          <TextField
            type="number"
            label="Price"
            value={priceUsd}
            onChange={handlePriceChange}
            fullWidth
            error={!!priceError}
            helperText={priceError || 'Set 0 for free access'}
            inputProps={{ min: 0, step: '0.01' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MoneyIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="body2" color="text.secondary">
                    USD
                  </Typography>
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': { 
                borderRadius: 2 
              }
            }}
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
          disabled={loading}
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
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading || (usePassword && !password.trim()) || !!priceError}
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
          sx={{
            borderRadius: 2,
            px: 4,
            minWidth: 160,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: theme.palette.mode === 'dark' 
              ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
              : `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
            '&:hover': {
              boxShadow: theme.palette.mode === 'dark' 
                ? `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`
                : `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
              transform: 'translateY(-1px)'
            },
            '&:disabled': {
              boxShadow: 'none'
            },
            transition: 'all 0.2s ease'
          }}
        >
          {loading ? 'Encrypting...' : 'Encrypt & Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EncryptionDialog; 