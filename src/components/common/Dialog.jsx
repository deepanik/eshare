import React from 'react';
import {
  Dialog as MuiDialog,
  DialogTitle as MuiDialogTitle,
  DialogContent as MuiDialogContent,
  DialogActions as MuiDialogActions,
  IconButton,
  Typography,
  Box,
  useTheme
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const Dialog = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  ...props
}) => {
  const theme = useTheme();

  return (
    <AnimatePresence>
      {open && (
        <MuiDialog
          open={open}
          onClose={onClose}
          maxWidth={maxWidth}
          fullWidth={fullWidth}
          PaperComponent={motion.div}
          PaperProps={{
            initial: { opacity: 0, y: -20 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: 20 },
            transition: { duration: 0.2 },
            style: {
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: theme.palette.background.paper
            }
          }}
          {...props}
        >
          <MuiDialogTitle
            sx={{
              m: 0,
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid',
              borderColor: theme.palette.divider
            }}
          >
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'text.primary',
                  backgroundColor: 'action.hover'
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </MuiDialogTitle>

          <MuiDialogContent
            sx={{
              p: 3,
              '&:first-of-type': {
                pt: 3
              }
            }}
          >
            {children}
          </MuiDialogContent>

          {actions && (
            <MuiDialogActions
              sx={{
                p: 2,
                borderTop: '1px solid',
                borderColor: theme.palette.divider,
                gap: 1
              }}
            >
              {actions}
            </MuiDialogActions>
          )}
        </MuiDialog>
      )}
    </AnimatePresence>
  );
};

export default Dialog; 