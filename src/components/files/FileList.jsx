// credit Kumud

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Paper,
  CircularProgress,
  Tooltip,
  Chip,
  TextField,
  InputAdornment,
  Checkbox,
  Button,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  LinearProgress,
  Badge,
  Grid,
  Card,
  CardContent,
  CardActions,
  useTheme,
  alpha
} from '@mui/material';
import {
  Download as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Storage as StorageIcon,
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Lock as LockIcon,
  Key as KeyIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  InsertDriveFile as InsertDriveFileIcon,
  Image as ImageIcon,
  PictureAsPdf as PictureAsPdfIcon,
  VideoFile as VideoFileIcon,
  AudioFile as AudioIcon,
  Code as CodeIcon,
  Archive as ArchiveIcon,
  Sort as SortIcon,
  People
} from '@mui/icons-material';
import FilePreview from './FilePreview';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { socketService } from '../../services/socket/socketService';
import { authService } from '../../services/auth/authService';

const getFileIcon = (fileType) => {
  if (fileType?.startsWith('image/')) return <ImageIcon />;
  if (fileType === 'application/pdf') return <PictureAsPdfIcon />;
  if (fileType?.startsWith('video/')) return <VideoFileIcon />;
  if (fileType?.startsWith('audio/')) return <AudioIcon />;
  if (fileType?.startsWith('text/')) return <CodeIcon />;
  if (fileType?.includes('zip') || fileType?.includes('rar')) return <ArchiveIcon />;
  return <InsertDriveFileIcon />;
};

const FileList = ({
  files,
  selectedFiles,
  onSelectFiles,
  onDownload,
  onShare,
  onDelete,
  onViewKey,
  onSetPassword,
  loading,
  uploadProgress,
  decryptProgress,
  keyStatus,
  onShowKeyInfo,
  onRotateKey
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentTab, setCurrentTab] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const theme = useTheme();

  const container = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  // File type categories
  const fileTypes = {
    all: { label: 'All Files', filter: () => true },
    images: { 
      label: 'Images', 
      filter: file => file.type?.startsWith('image/') || file.name?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    },
    documents: { 
      label: 'Documents', 
      filter: file => file.type?.startsWith('application/') || file.name?.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i)
    },
    videos: { 
      label: 'Videos', 
      filter: file => file.type?.startsWith('video/') || file.name?.match(/\.(mp4|avi|mov|wmv|flv|mkv)$/i)
    },
    audio: { 
      label: 'Audio', 
      filter: file => file.type?.startsWith('audio/') || file.name?.match(/\.(mp3|wav|ogg|m4a|flac)$/i)
    }
  };

  // Sort functions
  const sortFunctions = {
    date: (a, b) => new Date(b.uploadDate) - new Date(a.uploadDate),
    name: (a, b) => a.name.localeCompare(b.name),
    size: (a, b) => b.size - a.size
  };

  // Sort options
  const sortOptions = [
    { id: 'date', label: 'Date Added' },
    { id: 'name', label: 'Name' },
    { id: 'size', label: 'Size' }
  ];

  const handleSortChange = (option) => {
    setSortBy(option);
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    setSortAnchorEl(null);
  };

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    return files
      .filter(fileTypes[currentTab].filter)
      .filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const sortResult = sortFunctions[sortBy](a, b);
        return sortDirection === 'asc' ? -sortResult : sortResult;
      });
  }, [files, currentTab, searchTerm, sortBy, sortDirection]);

  // Handle menu
  const handleMenuOpen = (event, file) => {
    setAnchorEl(event.currentTarget);
    setSelectedFile(file);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFile(null);
  };

  // Handle file selection
  const handleSelectFile = (fileId) => {
    const newSelected = selectedFiles.includes(fileId)
      ? selectedFiles.filter(id => id !== fileId)
      : [...selectedFiles, fileId];
    onSelectFiles(newSelected);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatFileDate = (date) => {
    try {
      if (!date) return 'Unknown date';
      
      // Handle string dates
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if the date is valid
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown date';
    }
  };

  if (loading && (!files || files.length === 0)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Your Files
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              placeholder="Search files..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{
                width: 250,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.black, 0.02)
                }
              }}
            />
            <Button
              startIcon={<SortIcon />}
              onClick={(e) => setSortAnchorEl(e.currentTarget)}
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderColor: alpha(theme.palette.divider, 0.1),
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'primary.main'
                }
              }}
            >
              Sort
            </Button>
            <Menu
              anchorEl={sortAnchorEl}
              open={Boolean(sortAnchorEl)}
              onClose={() => setSortAnchorEl(null)}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 180,
                  borderRadius: 2,
                  boxShadow: theme.shadows[3]
                }
              }}
            >
              {sortOptions.map((option) => (
                <MenuItem
                  key={option.id}
                  selected={sortBy === option.id}
                  onClick={() => handleSortChange(option.id)}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Box>

        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 3,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minWidth: 120,
              borderRadius: '8px 8px 0 0'
            }
          }}
        >
          {Object.entries(fileTypes).map(([key, { label }]) => {
            const Icon = key === 'all' ? InsertDriveFileIcon : key === 'images' ? ImageIcon : key === 'documents' ? PictureAsPdfIcon : key === 'videos' ? VideoFileIcon : key === 'audio' ? AudioIcon : null;
            const count = files.filter(file => 
              key === 'all' ? true : fileTypes[key].filter(file)
            ).length;

            return (
              <Tab
                key={key}
                value={key}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon fontSize="small" />
                    <span>{label}</span>
                    <Badge
                      badgeContent={count}
                      color="primary"
                      sx={{
                        '& .MuiBadge-badge': {
                          right: -16,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main'
                        }
                      }}
                    />
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Box>

      <AnimatePresence>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          <Grid container spacing={2}>
            {loading && !files.length ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : filteredFiles.length === 0 ? (
              <Box
                sx={{
                  width: '100%',
                  textAlign: 'center',
                  py: 8,
                  color: 'text.secondary'
                }}
              >
                <Typography variant="h6">No files found</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Try adjusting your search or filters
                </Typography>
              </Box>
            ) : (
              filteredFiles.map((file, index) => (
                <Grid item xs={12} key={`${file.id || 'temp'}-${file.name}-${index}-${file.status || 'saved'}`}>
                  <Paper
                    component={motion.div}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.1) : alpha(theme.palette.common.black, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.03) : alpha(theme.palette.common.black, 0.02),
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[2]
                      }
                    }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
                        color: 'primary.main',
                        display: 'flex'
                      }}
                    >
                      {getFileIcon(file.type)}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        noWrap
                        title={file.name}
                        sx={{ 
                          color: 'text.primary',
                          fontWeight: 500
                        }}
                      >
                        {file.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {file.uploadDate ? formatFileDate(file.uploadDate) : 'Just now'}
                        </Typography>
                        {file.size && (
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                        )}
                        {file.size && (
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.size)}
                          </Typography>
                        )}
                        {file.uploading && (
                          <Box sx={{ flex: 1, maxWidth: 100 }}>
                            <LinearProgress
                              variant="determinate"
                              value={file.uploadProgress || 0}
                              sx={{
                                height: 4,
                                borderRadius: 2,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 2
                                }
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {file.encrypted && (
                      <Chip
                        icon={<LockIcon fontSize="small" />}
                        label="Encrypted"
                        size="small"
                        sx={{
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          color: theme.palette.success.main,
                          borderRadius: 2,
                          '& .MuiChip-icon': {
                            color: 'inherit'
                          }
                        }}
                      />
                    )}

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {file.encrypted && onViewKey && (
                        <Tooltip title="View Decrypt Key">
                          <IconButton
                            onClick={() => onViewKey(file)}
                            size="small"
                            sx={{
                              color: 'warning.main',
                              bgcolor: alpha(theme.palette.warning.main, 0.1),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.warning.main, 0.2)
                              }
                            }}
                          >
                            <KeyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Download">
                        <IconButton
                          onClick={() => onDownload(file)}
                          size="small"
                          sx={{
                            color: 'primary.main',
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.2)
                            }
                          }}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          onClick={() => {
                            if (!file.id) {
                              console.error('Cannot delete file: file.id is missing', file);
                              return;
                            }
                            onDelete(file.id, file.storageType || 'IPFS');
                          }}
                          size="small"
                          sx={{
                            color: 'error.main',
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            '&:hover': {
                              bgcolor: alpha(theme.palette.error.main, 0.2)
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>
                </Grid>
              ))
            )}
          </Grid>
        </motion.div>
      </AnimatePresence>
    </Box>
  );
};

export default FileList; 
