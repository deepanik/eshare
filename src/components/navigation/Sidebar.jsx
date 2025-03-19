import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Button,
  useTheme,
  alpha,
  Tooltip,
  useMediaQuery,
  SwipeableDrawer,
  Collapse
} from '@mui/material';
import {
  FolderOutlined as FolderIcon,
  Settings as SettingsIcon,
  HelpOutline as HelpIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  LogoutOutlined as DisconnectIcon,
  AccountBalanceWalletOutlined as WalletIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const DRAWER_WIDTH = 240;
const COLLAPSED_WIDTH = 72;

const Sidebar = ({
  open,
  onClose,
  ethAddress,
  onDisconnect,
  onThemeToggle,
  isDarkMode,
  currentPath,
  onNavigate
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigationItems = [
    { path: '/files', label: 'Files', icon: FolderIcon },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
    { path: '/help', label: 'Help', icon: HelpIcon }
  ];

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: isCollapsed ? 1 : 2,
        transition: theme.transitions.create(['padding'], {
          duration: theme.transitions.duration.standard
        })
      }}
    >
      {/* Collapse Toggle Button */}
      {!isMobile && (
        <IconButton
          onClick={() => setIsCollapsed(!isCollapsed)}
          sx={{
            alignSelf: isCollapsed ? 'center' : 'flex-end',
            mb: 1,
            color: 'text.secondary',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.05)
                : alpha(theme.palette.common.black, 0.05)
            }
          }}
        >
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      )}

      {/* Header with ETH Address */}
      <Collapse in={!isCollapsed} collapsedSize={48}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1,
            p: 1,
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.05),
            transition: theme.transitions.create(['padding', 'margin'], {
              duration: theme.transitions.duration.standard
            })
          }}
        >
          <Box component="span">
            <Tooltip title={isCollapsed ? formatAddress(ethAddress) : ''}>
              <WalletIcon
                sx={{
                  color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
                  fontSize: 20
                }}
              />
            </Tooltip>
          </Box>
          {!isCollapsed && (
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 600,
                color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
                opacity: isCollapsed ? 0 : 1,
                transition: theme.transitions.create('opacity')
              }}
            >
              {formatAddress(ethAddress)}
            </Typography>
          )}
          <Box component="span">
            <Tooltip title="Disconnect">
              <IconButton
                size="small"
                onClick={onDisconnect}
                sx={{
                  ml: 'auto',
                  color: theme.palette.error.main,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.error.main, 0.1)
                  }
                }}
              >
                <DisconnectIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Collapse>

      {/* Navigation Items */}
      <List sx={{ flex: 1, mt: 2 }}>
        <AnimatePresence>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;

            return (
              <ListItem
                key={item.path}
                component={motion.div}
                initial={false}
                animate={{
                  x: 0,
                  opacity: 1
                }}
                exit={{
                  x: -20,
                  opacity: 0
                }}
                whileHover={{ x: isCollapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate(item.path)}
                sx={{
                  mb: 1,
                  borderRadius: 2,
                  cursor: 'pointer',
                  padding: isCollapsed ? '12px 8px' : '12px 16px',
                  bgcolor: isActive
                    ? theme.palette.mode === 'dark'
                      ? alpha(theme.palette.primary.main, 0.2)
                      : alpha(theme.palette.primary.main, 0.1)
                    : 'transparent',
                  color: isActive
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'dark'
                      ? alpha(theme.palette.primary.main, 0.1)
                      : alpha(theme.palette.primary.main, 0.05)
                  },
                  transition: theme.transitions.create(['padding', 'margin', 'background-color'], {
                    duration: theme.transitions.duration.standard
                  })
                }}
              >
                <Box component="span">
                  <Tooltip title={isCollapsed ? item.label : ''}>
                    <ListItemIcon
                      sx={{
                        minWidth: isCollapsed ? 0 : 36,
                        color: 'inherit',
                        justifyContent: 'center'
                      }}
                    >
                      <Icon fontSize="small" />
                    </ListItemIcon>
                  </Tooltip>
                </Box>
                <Collapse in={!isCollapsed} orientation="horizontal">
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 400,
                      noWrap: true
                    }}
                  />
                </Collapse>
              </ListItem>
            );
          })}
        </AnimatePresence>
      </List>

      {/* Theme Toggle */}
      <Box
        sx={{
          mt: 'auto',
          pt: 2,
          borderTop: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.1) : alpha(theme.palette.common.black, 0.1)
        }}
      >
        <Box component="span">
          <Tooltip title={isCollapsed ? (isDarkMode ? 'Light Theme' : 'Dark Theme') : ''}>
            <Button
              fullWidth
              onClick={onThemeToggle}
              startIcon={!isCollapsed && (isDarkMode ? <LightModeIcon /> : <DarkModeIcon />)}
              sx={{
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                px: isCollapsed ? 1 : 2,
                py: 1,
                borderRadius: 2,
                color: 'text.secondary',
                minWidth: 0,
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.common.white, 0.05)
                    : alpha(theme.palette.common.black, 0.05)
                }
              }}
            >
              {isCollapsed ? (
                isDarkMode ? <LightModeIcon /> : <DarkModeIcon />
              ) : (
                `${isDarkMode ? 'Light' : 'Dark'} Theme`
              )}
            </Button>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  // Mobile drawer
  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={() => onClose(!open)}
          sx={{
            position: 'fixed',
            left: 16,
            top: 16,
            zIndex: theme.zIndex.drawer + 2,
            bgcolor: theme.palette.background.paper,
            boxShadow: theme.shadows[2],
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.05)
                : alpha(theme.palette.common.black, 0.05)
            }
          }}
        >
          <MenuIcon />
        </IconButton>
        <SwipeableDrawer
          variant="temporary"
          anchor="left"
          open={open}
          onClose={() => onClose(false)}
          onOpen={() => onClose(true)}
          swipeAreaWidth={30}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.8) : alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(10px)'
            }
          }}
        >
          {drawerContent}
        </SwipeableDrawer>
      </>
    );
  }

  // Desktop drawer
  return (
    <Drawer
      variant="permanent"
      open={true}
      sx={{
        width: isCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.8) : alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.1) : alpha(theme.palette.common.black, 0.1),
          transition: theme.transitions.create(['width'], {
            duration: theme.transitions.duration.standard
          })
        }
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar; 