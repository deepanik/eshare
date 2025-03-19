import { createTheme } from '@mui/material/styles';

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode
          primary: {
            main: '#7C3AED',
            light: '#A78BFA',
            dark: '#5B21B6',
            contrastText: '#ffffff'
          },
          secondary: {
            main: '#10B981',
            light: '#34D399',
            dark: '#059669',
            contrastText: '#ffffff'
          },
          background: {
            default: '#F9FAFB',
            paper: '#ffffff'
          },
          text: {
            primary: '#111827',
            secondary: '#4B5563'
          }
        }
      : {
          // Dark mode
          primary: {
            main: '#A78BFA',
            light: '#C4B5FD',
            dark: '#7C3AED',
            contrastText: '#ffffff'
          },
          secondary: {
            main: '#34D399',
            light: '#6EE7B7',
            dark: '#10B981',
            contrastText: '#ffffff'
          },
          background: {
            default: '#111827',
            paper: '#1F2937'
          },
          text: {
            primary: '#F9FAFB',
            secondary: '#D1D5DB'
          }
        })
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5
    },
    button: {
      textTransform: 'none',
      fontWeight: 500
    }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px'
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none'
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }
      }
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 4
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          height: 24
        }
      }
    }
  }
});

export const createAppTheme = (mode) => createTheme(getDesignTokens(mode)); 