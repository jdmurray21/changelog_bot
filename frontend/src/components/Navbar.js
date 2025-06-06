import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Navbar = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: '#000000',
        borderBottom: '1px solid #333333',
        py: 1.5,
        px: { xs: 1.5, md: 4 },
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000
      }}
    >
      <Box
        sx={{
          maxWidth: '1200px',
          mx: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 2, md: 3 }
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center'
        }}>
          <Typography
            component={RouterLink}
            to="/"
            variant="h6"
            sx={{
              color: '#ffffff',
              fontWeight: 700,
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'none'
              }
            }}
          >
            metis
          </Typography>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 2,
          ml: 'auto'
        }}>
          <Button
            component={RouterLink}
            to="/generate-changelog"
            variant="contained"
            sx={{
              color: '#ffffff',
              bgcolor: '#333333',
              '&:hover': {
                bgcolor: '#444444'
              },
              borderRadius: 1,
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:active': {
                boxShadow: 'none'
              }
            }}
          >
            Generate Changelog
          </Button>
          <Button
            component={RouterLink}
            to="/view-changelogs"
            variant="contained"
            sx={{
              color: '#ffffff',
              bgcolor: '#333333',
              '&:hover': {
                bgcolor: '#444444'
              },
              borderRadius: 1,
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:active': {
                boxShadow: 'none'
              }
            }}
          >
            View Changelogs
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Navbar;
