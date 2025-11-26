import React, { useState } from 'react';
import {
  Box,
  Typography,
  Switch,
  Select,
  MenuItem,
  Button,
  Alert,
  useTheme,
  alpha,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  Storage as StorageIcon,
  CloudUpload as CloudUploadIcon,
  NotificationsActive as NotificationsIcon,
  Key as KeyIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

export default function Settings({
  settings = {},
  onUpdateSettings,
  onSaveSettings,
  onResetSettings,
}) {
  const theme = useTheme();
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      await onSaveSettings(localSettings);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleReset = () => {
    setLocalSettings(settings);
    onResetSettings?.();
  };

  const settingSections = [
    {
      title: 'Appearance',
      icon: <DarkModeIcon />,
      settings: [
        {
          key: 'theme',
          label: 'Theme Mode',
          type: 'select',
          options: [
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' }
          ],
          icon: theme.palette.mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />
        },
        {
          key: 'listView',
          label: 'Use List View',
          type: 'switch',
          description: 'Switch between list and grid view for files',
          icon: <VisibilityIcon />
        }
      ]
    },
    {
      title: 'Security',
      icon: <SecurityIcon />,
      settings: [
        {
          key: 'defaultEncryption',
          label: 'Default File Encryption',
          type: 'switch',
          description: 'Automatically encrypt new files',
          icon: <KeyIcon />
        },
        {
          key: 'saveEncryptionKeys',
          label: 'Save Encryption Keys',
          type: 'switch',
          description: 'Securely store encryption keys in your wallet',
          icon: <KeyIcon />
        }
      ]
    },
    {
      title: 'Storage',
      icon: <StorageIcon />,
      settings: [
        {
          key: 'storageType',
          label: 'Default Storage',
          type: 'select',
          options: [
            { value: 'ipfs', label: 'IPFS' }
          ],
          icon: <CloudUploadIcon />
        }
      ]
    },
    {
      title: 'Notifications',
      icon: <NotificationsIcon />,
      settings: [
        {
          key: 'desktopNotifications',
          label: 'Desktop Notifications',
          type: 'switch',
          description: 'Show desktop notifications',
          icon: <NotificationsIcon />
        }
      ]
    }
  ];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
        Settings
      </Typography>

      {showSaveSuccess && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          onClose={() => setShowSaveSuccess(false)}
        >
          Settings saved successfully!
        </Alert>
      )}

      {settingSections.map((section) => (
        <Card
          key={section.title}
          sx={{
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.common.white, 0.1)
              : alpha(theme.palette.common.black, 0.1)
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
              {section.icon}
              <Typography variant="h6">{section.title}</Typography>
            </Box>
            
            <List>
              {section.settings.map((setting) => (
                <ListItem
                  key={setting.key}
                  sx={{
                    py: 1,
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.05)
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: 'primary.main' }}>
                    {setting.icon}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={setting.label}
                    secondary={setting.description}
                    primaryTypographyProps={{
                      fontWeight: 500
                    }}
                  />

                  <ListItemSecondaryAction>
                    {setting.type === 'switch' && (
                      <Switch
                        checked={localSettings[setting.key] || false}
                        onChange={(e) => handleChange(setting.key, e.target.checked)}
                        color="primary"
                      />
                    )}
                    {setting.type === 'select' && (
                      <Select
                        value={localSettings[setting.key] || ''}
                        onChange={(e) => handleChange(setting.key, e.target.value)}
                        size="small"
                        sx={{ minWidth: 120 }}
                      >
                        {setting.options.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                    {setting.type === 'number' && (
                      <TextField
                        type="number"
                        value={localSettings[setting.key] || 0}
                        onChange={(e) => handleChange(setting.key, parseInt(e.target.value, 10))}
                        size="small"
                        sx={{ width: 80 }}
                      />
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      ))}

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
        <Button
          variant="outlined"
          onClick={handleReset}
          sx={{ borderRadius: 2 }}
        >
          Reset to Defaults
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={<SaveIcon />}
          sx={{ borderRadius: 2 }}
        >
          Save Changes
        </Button>
      </Box>
    </Box>
  );
} 