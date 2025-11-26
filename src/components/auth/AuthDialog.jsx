import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Google as GoogleIcon,
  GitHub as GitHubIcon
} from '@mui/icons-material';
import { authService } from '../../services/auth/authService';

const AuthDialog = ({ open, onClose, onAuthSuccess }) => {
  const [activeTab, setActiveTab] = useState(0); // 0 = Sign In, 1 = Sign Up
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Sign In form state
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  // Sign Up form state
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  });

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError(null);
    setSignInData({ email: '', password: '' });
    setSignUpData({ email: '', password: '', confirmPassword: '', username: '' });
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!signInData.email || !signInData.password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      const { user, error: authError } = await authService.signInWithPassword(
        signInData.email,
        signInData.password
      );

      if (authError) {
        // Provide user-friendly error messages
        let errorMessage = authError.message || 'Failed to sign in';
        if (authError.name === 'NetworkError' || errorMessage.includes('Network error')) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in.';
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (user && onAuthSuccess) {
        onAuthSuccess(user);
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!signUpData.email || !signUpData.password || !signUpData.confirmPassword) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (signUpData.password !== signUpData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (signUpData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }

      const { user, error: authError } = await authService.signUp(
        signUpData.email,
        signUpData.password,
        signUpData.username || null
      );

      if (authError) {
        // Provide user-friendly error messages
        let errorMessage = authError.message || 'Failed to sign up';
        if (authError.name === 'NetworkError' || errorMessage.includes('Network error')) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (errorMessage.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (errorMessage.includes('Password')) {
          errorMessage = 'Password does not meet requirements. Please use a stronger password.';
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (user && onAuthSuccess) {
        onAuthSuccess(user);
      }
    } catch (err) {
      console.error('Sign up error:', err);
      setError(err.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider) => {
    setError(null);
    setLoading(true);

    try {
      const { error: oauthError } = await authService.signInWithOAuth(provider);
      
      if (oauthError) {
        setError(oauthError.message || `Failed to sign in with ${provider}`);
        setLoading(false);
      }
      // OAuth will redirect, so we don't need to handle success here
    } catch (err) {
      console.error('OAuth sign in error:', err);
      setError(err.message || 'An error occurred during OAuth sign in');
      setLoading(false);
    }
  };

  const handleInputChange = (form, field, value) => {
    if (form === 'signIn') {
      setSignInData(prev => ({ ...prev, [field]: value }));
    } else {
      setSignUpData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleClose = () => {
    setError(null);
    setSignInData({ email: '', password: '' });
    setSignUpData({ email: '', password: '', confirmPassword: '', username: '' });
    setShowPassword(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Authentication</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          <Tab label="Sign In" />
          <Tab label="Sign Up" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {activeTab === 0 ? (
          <Box component="form" onSubmit={handleSignIn}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={signInData.email}
              onChange={(e) => handleInputChange('signIn', 'email', e.target.value)}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                )
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={signInData.password}
              onChange={(e) => handleInputChange('signIn', 'password', e.target.value)}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSignUp}>
            <TextField
              fullWidth
              label="Username"
              value={signUpData.username}
              onChange={(e) => handleInputChange('signUp', 'username', e.target.value)}
              margin="normal"
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon />
                  </InputAdornment>
                )
              }}
              helperText="Optional - will use email if not provided"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={signUpData.email}
              onChange={(e) => handleInputChange('signUp', 'email', e.target.value)}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                )
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={signUpData.password}
              onChange={(e) => handleInputChange('signUp', 'password', e.target.value)}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              value={signUpData.confirmPassword}
              onChange={(e) => handleInputChange('signUp', 'confirmPassword', e.target.value)}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                )
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign Up'}
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 2 }}>OR</Divider>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={() => handleOAuthSignIn('google')}
            disabled={loading}
          >
            Continue with Google
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<GitHubIcon />}
            onClick={() => handleOAuthSignIn('github')}
            disabled={loading}
          >
            Continue with GitHub
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuthDialog;

