import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  useTheme,
  alpha,
  Tooltip,
  Button,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Rotate90DegreesCcw as RotateIcon,
  Lock as LockIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Code as CodeIcon,
  InsertDriveFile as FileIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const FilePreview = ({
  file,
  open,
  onClose,
  onDownload,
  loading = false
}) => {
  const theme = useTheme();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const renderPreviewContent = () => {
    if (loading) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            minHeight: 400
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            Loading preview...
          </Typography>
        </Box>
      );
    }

    if (!file) return null;

    const PreviewIcon = () => {
      const iconProps = { sx: { fontSize: 48, color: 'text.secondary' } };
      if (file.type?.startsWith('image/')) return <ImageIcon {...iconProps} />;
      if (file.type === 'application/pdf') return <PdfIcon {...iconProps} />;
      if (file.type?.startsWith('video/')) return <VideoIcon {...iconProps} />;
      if (file.type?.startsWith('audio/')) return <AudioIcon {...iconProps} />;
      if (file.type?.startsWith('text/')) return <CodeIcon {...iconProps} />;
      return <FileIcon {...iconProps} />;
    };

    switch (true) {
      case file.type?.startsWith('image/'):
        return (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'auto'
            }}
          >
            <img
              src={file.previewUrl || file.url}
              alt={file.name}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease'
              }}
            />
          </Box>
        );

      case file.type === 'application/pdf':
        return (
          <iframe
            src={file.url}
            title={file.name}
            width="100%"
            height="70vh"
            style={{ border: 'none' }}
          />
        );

      case file.type?.startsWith('video/'):
        return (
          <video
            controls
            style={{ maxWidth: '100%', maxHeight: '70vh' }}
          >
            <source src={file.url} type={file.type} />
            Your browser does not support the video tag.
          </video>
        );

      case file.type?.startsWith('audio/'):
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              p: 4
            }}
          >
            <AudioIcon sx={{ fontSize: 64, color: 'primary.main' }} />
            <audio controls>
              <source src={file.url} type={file.type} />
              Your browser does not support the audio tag.
            </audio>
          </Box>
        );

      default:
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              textAlign: 'center',
              minHeight: 400
            }}
          >
            <PreviewIcon />
            <Typography variant="h6" sx={{ mt: 2, color: 'text.primary' }}>
              {file.name}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              Preview not available for this file type
            </Typography>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => onDownload(file)}
              sx={{ mt: 3 }}
            >
              Download to view
            </Button>
          </Box>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperComponent={motion.div}
      PaperProps={{
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
        transition: { duration: 0.2 },
        sx: {
          borderRadius: 3,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.1) : alpha(theme.palette.common.black, 0.1),
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 500 }}>
          {file?.name}
        </Typography>

        {file?.encrypted && (
          <Chip
            icon={<LockIcon fontSize="small" />}
            label="Encrypted"
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.main,
              mr: 1
            }}
          />
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          {file?.type?.startsWith('image/') && (
            <>
              <Tooltip title="Zoom In">
                <IconButton size="small" onClick={handleZoomIn}>
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out">
                <IconButton size="small" onClick={handleZoomOut}>
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rotate">
                <IconButton size="small" onClick={handleRotate}>
                  <RotateIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="Download">
            <IconButton
              size="small"
              onClick={() => onDownload(file)}
              sx={{ color: 'primary.main' }}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ color: 'error.main' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(8px)'
        }}
      >
        {renderPreviewContent()}
      </DialogContent>
    </Dialog>
  );
};

export default FilePreview; 