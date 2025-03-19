import React from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  Security as SecurityIcon,
  CloudUpload as CloudUploadIcon,
  Key as KeyIcon,
  Share as ShareIcon,
} from '@mui/icons-material';

export default function Help() {
  const theme = useTheme();

  const faqSections = [
    {
      title: 'Getting Started',
      icon: <HelpIcon />,
      questions: [
        {
          q: 'How do I upload files?',
          a: 'You can upload files by either dragging and dropping them into the upload area or clicking the "Choose Files" button to select files from your device.'
        },
        {
          q: 'What file types are supported?',
          a: 'We support all common file types including images, videos, documents, and audio files. There are no restrictions on file types, but there may be size limits depending on your storage settings.'
        }
      ]
    },
    {
      title: 'Security & Encryption',
      icon: <SecurityIcon />,
      questions: [
        {
          q: 'How does file encryption work?',
          a: 'Files are encrypted using AES-256 encryption before being uploaded. Each file gets a unique encryption key that you can share with others to allow them to decrypt the file.'
        },
        {
          q: 'Where are my encryption keys stored?',
          a: 'Encryption keys can be stored in your connected wallet or managed manually. You can configure this in the Settings under "Security".'
        }
      ]
    },
    {
      title: 'Storage',
      icon: <CloudUploadIcon />,
      questions: [
        {
          q: 'Which storage providers are supported?',
          a: 'We currently support IPFS, Arweave, and Filecoin. You can select your preferred storage provider in the Settings.'
        },
        {
          q: 'How long are my files stored?',
          a: 'Files are stored permanently by default. However, you can configure auto-deletion in the Settings if desired.'
        }
      ]
    },
    {
      title: 'Sharing & Access',
      icon: <ShareIcon />,
      questions: [
        {
          q: 'How do I share files?',
          a: 'Click the share button next to any file to get a shareable link. For encrypted files, you\'ll also need to share the encryption key separately.'
        },
        {
          q: 'Can I control who accesses my files?',
          a: 'Yes, encrypted files can only be accessed by people who have both the file link and the encryption key. You control who you share these with.'
        }
      ]
    }
  ];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
        Help Center
      </Typography>

      {faqSections.map((section) => (
        <Paper
          key={section.title}
          sx={{
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.common.white, 0.1)
              : alpha(theme.palette.common.black, 0.1),
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderBottom: '1px solid',
              borderColor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.1)
                : alpha(theme.palette.common.black, 0.1)
            }}
          >
            {section.icon}
            <Typography variant="h6">{section.title}</Typography>
          </Box>

          {section.questions.map((qa, index) => (
            <Accordion
              key={index}
              disableGutters
              elevation={0}
              sx={{
                '&:before': { display: 'none' },
                borderBottom: index < section.questions.length - 1 ? '1px solid' : 'none',
                borderColor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.common.white, 0.1)
                  : alpha(theme.palette.common.black, 0.1)
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  px: 3,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                  }
                }}
              >
                <Typography fontWeight={500}>{qa.q}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                <Typography color="text.secondary">
                  {qa.a}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      ))}

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Still need help? Contact us at{' '}
          <Link href="mailto:support@eshare.com" color="primary">
            support@eshare.com
          </Link>
        </Typography>
      </Box>
    </Box>
  );
} 