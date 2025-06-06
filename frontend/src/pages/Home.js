import React from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      bgcolor: '#ffffff',
      px: 4
    }}>
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" component="h1" gutterBottom sx={{
            color: '#000000',
            fontWeight: 700,
            mb: 2
          }}>
            metis
          </Typography>
          
          <Typography variant="h5" color="#666666" sx={{ mb: 4 }}>
            An AI tool for generating changelogs from your GitHub commits
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/generate-changelog')}
            sx={{
              bgcolor: '#000000',
              color: 'white',
              '&:hover': {
                bgcolor: '#333333'
              },
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1.5
            }}
          >
            Generate Changelog
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;
