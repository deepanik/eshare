import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  useTheme,
  alpha,
  CircularProgress
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Lock as LockIcon,
  DriveFolderUpload as FolderIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const FileUpload = ({ onFileSelect, disabled, encryptionEnabled }) => {
  const theme = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
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

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = async (fileList) => {
    try {
      setLoading(true);
      // Convert FileList to Array and ensure they are File objects
      const files = Array.from(fileList).map(file => {
        if (file instanceof File) return file;
        return new File([file], file.name, {
          type: file.type,
          lastModified: file.lastModified
        });
      });
      await onFileSelect(files);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Box
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              position: 'relative',
              width: '100%',
              minHeight: 300,
              border: '2px dashed',
              borderColor: isDragging ? 'primary.main' : alpha(theme.palette.divider, 0.4),
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              bgcolor: isDragging ? 
                alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.05) : 
                alpha(theme.palette.background.paper, 0.6),
              backdropFilter: 'blur(8px)',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.05)
              }
            }}
          >
            {loading ? (
              <CircularProgress size={48} />
            ) : (
              <>
                <Box
                  component={motion.div}
                  animate={{
                    y: isDragging ? -10 : 0,
                    scale: isDragging ? 1.1 : 1
                  }}
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '20px',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main'
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 40 }} />
                </Box>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: 'text.primary',
                      fontWeight: 600,
                      mb: 1
                    }}
                  >
                    Drag and drop your files here
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary',
                      mb: 2
                    }}
                  >
                    or click to select files
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      startIcon={<FolderIcon />}
                      disabled={disabled}
                      sx={{
                        borderRadius: 2,
                        px: 3,
                        py: 1,
                        bgcolor: theme.palette.mode === 'dark' ? 'primary.main' : 'primary.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.dark'
                        }
                      }}
                    >
                      Choose Files
                    </Button>
                    {encryptionEnabled && (
                      <Button
                        variant="outlined"
                        startIcon={<LockIcon />}
                        sx={{
                          borderRadius: 2,
                          px: 3,
                          py: 1,
                          borderColor: theme.palette.success.main,
                          color: theme.palette.success.main,
                          '&:hover': {
                            borderColor: theme.palette.success.dark,
                            bgcolor: alpha(theme.palette.success.main, 0.1)
                          }
                        }}
                      >
                        Encryption Enabled
                      </Button>
                    )}
                  </Box>
                </Box>

                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    position: 'absolute',
                    bottom: 16
                  }}
                >
                  Supported formats: Images, Videos, Documents, and more
                </Typography>
              </>
            )}
          </Box>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            style={{ display: 'none' }}
          />
        </motion.div>
      </AnimatePresence>
    </Box>
  );
};

export default FileUpload; 