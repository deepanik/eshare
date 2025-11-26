import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  TextField,
  Button,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AccountBalanceWallet as WalletIcon,
  CheckCircle as CheckCircleIcon,
  CloudUpload as CloudUploadIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import { authService } from '../../services/auth/authService';
import { walletConnectionService } from '../../services/wallet/walletConnectionService';
import WalletConnectDialog from '../wallet/WalletConnectDialog';
import { supabase } from '../../services/supabase/supabaseClient';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    avatar_url: ''
  });

  useEffect(() => {
    loadUserProfile();
    // Initialize wallet service and check connection
    const initWallet = async () => {
      try {
        // Ensure wallet service is initialized (restores connections)
        await walletConnectionService.initialize();
        checkWalletConnection();
      } catch (error) {
        console.error('Error initializing wallet:', error);
        checkWalletConnection(); // Still check even if init fails
      }
    };
    initWallet();
  }, []);

  const checkWalletConnection = async () => {
    try {
      const isConnected = walletConnectionService.isWalletConnected();
      setWalletConnected(isConnected);
      if (isConnected) {
        const connectionData = walletConnectionService.getConnectionData();
        setWalletInfo(connectionData);
      } else {
        // Check if there's a saved connection that just needs to be restored
        const savedConnection = localStorage.getItem('wallet_connection_state');
        if (savedConnection) {
          try {
            const connection = JSON.parse(savedConnection);
            if (connection.walletAddress && connection.expiresAt && Date.now() < connection.expiresAt) {
              // There's a saved connection, try to restore it
              await walletConnectionService.initialize();
              const restored = walletConnectionService.isWalletConnected();
              if (restored) {
                setWalletConnected(true);
                setWalletInfo(walletConnectionService.getConnectionData());
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        // Handle both avatar and avatar_url from the user object
        const avatarUrl = currentUser.avatar_url || currentUser.avatar || '';
        setFormData({
          username: currentUser.username || '',
          email: currentUser.email || '',
          avatar_url: avatarUrl || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showSnackbar('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    // Reset form data to original user data
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        avatar_url: user.avatar_url || ''
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (!user || !user.id) {
        showSnackbar('User not found', 'error');
        return;
      }

      const { data, error } = await authService.updateProfile(user.id, {
        username: formData.username,
        avatar_url: formData.avatar_url
      });

      if (error) {
        throw error;
      }

      // Reload user profile
      await loadUserProfile();
      setEditing(false);
      showSnackbar('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Error saving profile:', error);
      showSnackbar(error.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleWalletConnected = (walletData) => {
    setWalletConnected(true);
    setWalletInfo(walletData);
    showSnackbar('Wallet connected successfully!', 'success');
    checkWalletConnection();
  };

  const handleDisconnectWallet = async () => {
    try {
      await walletConnectionService.disconnect();
      setWalletConnected(false);
      setWalletInfo(null);
      showSnackbar('Wallet disconnected', 'info');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      showSnackbar('Failed to disconnect wallet', 'error');
    }
  };

  // Upload profile photo to Supabase Storage
  const uploadProfilePhoto = async (file) => {
    try {
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('You must be logged in to upload files. Please sign in and try again.');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file.');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Upload to eShare bucket
      const { data, error } = await supabase.storage
        .from('eShare')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting if same user uploads again
        });
      
      if (error) {
        console.error('Error uploading image:', error);
        
        // Provide more helpful error messages
        if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
          throw new Error('Storage bucket "eShare" not found. Please check your Supabase Storage configuration.');
        } else if (error.message?.includes('new row violates row-level security')) {
          throw new Error('Permission denied. Please check your Storage bucket policies.');
        } else if (error.message?.includes('JWT')) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('eShare')
        .getPublicUrl(fileName);
      
      const publicUrl = urlData.publicUrl;
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading to Supabase Storage:', error);
      
      // Return a more user-friendly error message
      if (error.message) {
        throw new Error(error.message);
      }
      
      throw new Error('Failed to upload image. Please check your connection and try again.');
    }
  };

  // Handle profile photo upload
  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const imageUrl = await uploadProfilePhoto(file);
      
      // Update form data with new image URL
      setFormData(prev => ({
        ...prev,
        avatar_url: imageUrl
      }));

      // Auto-save if not in editing mode, or just update the form data if in editing mode
      if (!editing) {
        // Save immediately if not editing
        const { data, error } = await authService.updateProfile(user.id, {
          avatar_url: imageUrl
        });

        if (error) {
          console.error('Error saving avatar_url to database:', error);
          throw error;
        }

        
        // Reload user profile
        await loadUserProfile();
        showSnackbar('Profile photo uploaded successfully!', 'success');
      } else {
        // Just update form data if in editing mode
        showSnackbar('Photo selected. Click Save to update your profile.', 'info');
      }
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      const errorMessage = error.message || 'Failed to upload photo. Please try again.';
      showSnackbar(errorMessage, 'error');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please sign in to view your profile.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', pt: 4 }}>
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                {(() => {
                  const avatarSrc = formData.avatar_url || user?.avatar_url || user?.avatar || '';
                  return (
                    <Avatar
                      src={avatarSrc || undefined}
                      sx={{
                        width: 120,
                        height: 120,
                        mx: 'auto',
                        bgcolor: avatarSrc ? 'transparent' : 'primary.main',
                        border: avatarSrc ? 'none' : '2px solid',
                        borderColor: 'divider',
                        '& img': {
                          objectFit: 'cover'
                        }
                      }}
                      imgProps={{
                        onError: (e) => {
                          e.target.style.display = 'none';
                        }
                      }}
                    >
                      {!avatarSrc && (
                        user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
                      )}
                    </Avatar>
                  );
                })()}
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="profile-photo-upload"
                  type="file"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
                <label htmlFor="profile-photo-upload">
                  <Button
                    component="span"
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={uploading ? <CircularProgress size={16} /> : <PhotoCameraIcon />}
                    disabled={uploading}
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      minWidth: 'auto',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      padding: 0,
                      boxShadow: 2
                    }}
                  >
                  </Button>
                </label>
              </Box>
              <Typography variant="h6" gutterBottom>
                {user.username || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Wallet Connection Section */}
              <Box sx={{ mt: 2 }}>
                {walletConnected && walletInfo ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                      <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                      <Typography variant="body2" color="success.main" fontWeight="medium">
                        Wallet Connected
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {walletInfo.wallet}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      display="block" 
                      sx={{ 
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        fontSize: '0.7rem'
                      }}
                    >
                      {walletInfo.address}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleDisconnectWallet}
                      sx={{ mt: 1 }}
                      fullWidth
                    >
                      Disconnect
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<WalletIcon />}
                    onClick={() => setShowWalletDialog(true)}
                  >
                    Connect Wallet
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Account Information
              </Typography>
              {!editing ? (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                >
                  Edit
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: <AccountCircleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={formData.email}
                  disabled
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  helperText="Email cannot be changed"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Avatar URL"
                  value={formData.avatar_url}
                  onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                  disabled={!editing}
                  placeholder="https://example.com/avatar.jpg"
                  helperText="Enter a URL for your profile picture"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <WalletConnectDialog
        open={showWalletDialog}
        onClose={() => setShowWalletDialog(false)}
        onWalletConnected={handleWalletConnected}
      />
    </Box>
  );
};

export default Profile;
