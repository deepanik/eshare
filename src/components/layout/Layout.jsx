import React from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountBalanceWallet,
  Storage,
  Settings,
  Help,
  DarkMode,
  LightMode
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Layout = ({
  children,
  account,
  balance,
  onConnect,
  onDisconnect,
  loading,
  themeMode,
  onThemeToggle
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Toolbar>
        <Typography variant="h6" noWrap>
          eShare
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem button onClick={() => navigate('/')}>
          <ListItemIcon>
            <Storage />
          </ListItemIcon>
          <ListItemText primary="Files" />
        </ListItem>
        <ListItem button onClick={() => navigate('/settings')}>
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
        <ListItem button onClick={() => navigate('/help')}>
          <ListItemIcon>
            <Help />
          </ListItemIcon>
          <ListItemText primary="Help" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem>
          <ListItemIcon>
            {themeMode === 'dark' ? <DarkMode /> : <LightMode />}
          </ListItemIcon>
          <ListItemText primary="Theme" />
          <IconButton onClick={onThemeToggle} color="inherit">
            {themeMode === 'dark' ? <LightMode /> : <DarkMode />}
          </IconButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            eShare
          </Typography>
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : account ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" noWrap>
                {balance} ETH
              </Typography>
              <Typography variant="body2" noWrap>
                {`${account.slice(0, 6)}...${account.slice(-4)}`}
              </Typography>
              <Button
                color="inherit"
                onClick={onDisconnect}
                startIcon={<AccountBalanceWallet />}
              >
                Disconnect
              </Button>
            </Box>
          ) : (
            <Button
              color="inherit"
              onClick={onConnect}
              startIcon={<AccountBalanceWallet />}
            >
              Connect Wallet
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: 250 }, flexShrink: { sm: 0 } }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: 250
              }
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: 250
              }
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 250px)` },
          mt: 8
        }}
      >
        <Container maxWidth="lg">
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout; 