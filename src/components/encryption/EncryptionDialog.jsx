import React, { useState } from 'react';
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
  Alert
} from '@mui/material';
import {
  Lock as LockIcon,
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const EncryptionDialog = ({ open, onClose, onConfirm, loading }) => {
  const theme = useTheme();
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = () => {
    if (usePassword && !password) {
      setError('Please enter a password');
      return;
    }
    onConfirm({
      usePassword,
      password: usePassword ? password : null
    });
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      PaperComponent={motion.div}
      PaperProps={{
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2 },
        style: {
          borderRadius: 16,
          overflow: 'hidden',
          minWidth: 400
        }
      }}
    >
      <DialogTitle
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.05),
          color: 'primary.main'
        }}
      >
        <LockIcon />
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          Encryption Options
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Alert
            severity="info"
            icon={<InfoIcon />}
            sx={{
              borderRadius: 2,
              '& .MuiAlert-icon': {
                color: 'primary.main'
              }
            }}
          >
            Your file will be encrypted before uploading. Make sure to save the encryption key that will be shown after the upload.
          </Alert>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.05),
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.primary.main, 0.1),
            mb: 3
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={usePassword}
                onChange={(e) => {
                  setUsePassword(e.target.checked);
                  setError(null);
                }}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <KeyIcon fontSize="small" color="primary" />
                <Typography>Add Password Protection</Typography>
              </Box>
            }
          />

          {usePassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.2 }}
            >
              <TextField
                margin="normal"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                error={!!error}
                helperText={error}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  )
                }}
                sx={{
                  mt: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
            </motion.div>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          gap: 1,
          bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.5) : alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(8px)'
        }}
      >
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
          sx={{
            borderRadius: 2,
            px: 3
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading || (usePassword && !password)}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <LockIcon />}
          sx={{
            borderRadius: 2,
            px: 3,
            bgcolor: theme.palette.mode === 'dark' ? 'primary.main' : 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.dark'
            }
          }}
        >
          {loading ? 'Encrypting...' : 'Encrypt & Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EncryptionDialog; 