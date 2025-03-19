import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  useTheme,
  alpha,
  CircularProgress
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Lock as LockIcon
} from '@mui/icons-material';

export default function FileUpload({
  onFileSelect,
  disabled = false,
  encryptionEnabled = false,
  loading = false
}) {
  const theme = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || loading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (disabled || loading) return;

    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(Array.from(e.target.files));
      e.target.value = ''; // Reset file input
    }
  };

  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        border: '2px dashed',
        borderColor: isDragging 
          ? 'primary.main'
          : theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.1)
            : alpha(theme.palette.common.black, 0.1),
        bgcolor: isDragging
          ? alpha(theme.palette.primary.main, 0.05)
          : theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.4)
            : alpha(theme.palette.background.paper, 0.7),
        borderRadius: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: !disabled && 'primary.main',
          bgcolor: !disabled && alpha(theme.palette.primary.main, 0.05)
        }
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && !loading && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        multiple
        disabled={disabled || loading}
      />
      
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          opacity: disabled ? 0.5 : 1
        }}
      >
        {loading ? (
          <CircularProgress size={48} />
        ) : (
          <CloudUploadIcon
            sx={{
              fontSize: 48,
              color: isDragging ? 'primary.main' : 'text.secondary'
            }}
          />
        )}

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Drag and drop your files here
          </Typography>
          <Typography variant="body2" color="text.secondary">
            or click to select files
          </Typography>
        </Box>

        {encryptionEnabled && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'success.main',
              bgcolor: alpha(theme.palette.success.main, 0.1),
              px: 2,
              py: 1,
              borderRadius: 1
            }}
          >
            <LockIcon fontSize="small" />
            <Typography variant="body2">
              Files will be encrypted before upload
            </Typography>
          </Box>
        )}

        {disabled && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Please connect your wallet to upload files
          </Typography>
        )}

        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          disabled={disabled || loading}
          sx={{ mt: 2 }}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          Choose Files
        </Button>
      </Box>
    </Paper>
  );
} 