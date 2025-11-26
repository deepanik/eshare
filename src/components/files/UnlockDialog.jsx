import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Box } from '@mui/material';

const UnlockDialog = ({ open, onClose, onSubmit, priceUsd = 0, requiresPassword = false }) => {
  const [key, setKey] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitKey = async () => {
    setLoading(true);
    try {
      await onSubmit({ mode: 'key', key, password: requiresPassword ? password : null });
    } finally {
      setLoading(false);
    }
  };

  const handlePayToUnlock = async () => {
    setLoading(true);
    try {
      await onSubmit({ mode: 'pay', password: requiresPassword ? password : null });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !loading && onClose()}>
      <DialogTitle>Unlock File</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {priceUsd > 0 ? `This file costs $${priceUsd.toFixed(2)} to unlock.` : 'This file is free to unlock.'}
        </Typography>
        {priceUsd > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField label="Enter decryption key" fullWidth value={key} onChange={(e) => setKey(e.target.value)} />
            <Button onClick={handleSubmitKey} disabled={!key || loading} variant="contained">Use Key</Button>
          </Box>
        )}
        {requiresPassword && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="Password" type="password" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handlePayToUnlock} disabled={loading} variant="contained">
          {priceUsd > 0 ? 'Pay to Unlock' : 'Unlock'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UnlockDialog;


