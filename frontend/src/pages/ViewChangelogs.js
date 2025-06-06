import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container,
  Typography,
  TextField,
  Paper,
  Autocomplete
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios';

const ViewChangelogs = () => {
  const [repositories, setRepositories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const response = await axios.get('/changelogs');
        const allChangelogs = response.data.changelogs || [];
        
        // Get unique repositories
        const uniqueRepos = [...new Set(allChangelogs.map(c => c.repository))];
        setRepositories(uniqueRepos);
      } catch (err) {
        console.error('Error fetching repositories:', err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRepositories();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      navigate(`/repository/${searchQuery}`);
    }
  }, [searchQuery, navigate]);

  return (
    <Box sx={{ pt: 8, pb: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{
            color: '#000000',
            fontWeight: 700,
            mb: 2,
            fontSize: { xs: '2.5rem', md: '3rem' }
          }}>
            View Changelogs
          </Typography>

          <Typography variant="body1" color="#666666" sx={{ mb: 2 }}>
            Select a repository to view its changelogs
          </Typography>

          <Autocomplete
            disablePortal
            id="repository-search"
            options={repositories}
            value={searchQuery}
            onChange={(event, newValue) => {
              if (newValue) {
                setSearchQuery(newValue);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Repositories"
                placeholder="Type to search..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    '& fieldset': {
                      borderColor: '#000000'
                    },
                    '&:hover fieldset': {
                      borderColor: '#000000'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#000000'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#000000'
                  }
                }}
              />
            )}
            sx={{
              width: 400,
              mx: 'auto'
            }}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default ViewChangelogs;
