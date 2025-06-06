import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  CircularProgress 
} from '@mui/material';
import axios from 'axios';
import { useParams } from 'react-router-dom';

// Configure axios base URL
axios.defaults.baseURL = 'http://localhost:8000/api/v1';
axios.defaults.withCredentials = true;

const RepositoryChangelogs = ({ repository }) => {
  const [changelogs, setChangelogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Use repository prop instead of useParams
  const decodedRepo = decodeURIComponent(repository);
  console.log('Repository prop:', repository);
  console.log('Decoded repository:', decodedRepo);

  useEffect(() => {
    if (!repository) {
      setError('No repository specified');
      setLoading(false);
      return;
    }

    const fetchChangelogs = async () => {
      try {
        console.log('Fetching changelogs for repository:', decodedRepo);
        const response = await axios.get('/changelogs');
        console.log('API Response:', response.data);
        
        if (!response.data || !response.data.changelogs) {
          console.error('Invalid API response format:', response.data);
          setError('Invalid API response format');
          return;
        }

        const allChangelogs = response.data.changelogs;
        console.log('All changelogs:', allChangelogs);
        
        // Check repository names in the data
        const uniqueRepos = new Set(allChangelogs.map(c => c.repository));
        console.log('Unique repositories in data:', Array.from(uniqueRepos));
        
        const filteredChangelogs = allChangelogs.filter(
          changelog => {
            console.log(`Checking changelog: ${changelog.repository} === ${decodedRepo}`);
            console.log('Changelog repository:', changelog.repository);
            return changelog.repository === decodedRepo;
          }
        );
        
        console.log('Filtered changelogs:', filteredChangelogs);
        setChangelogs(filteredChangelogs);
      } catch (err) {
        console.error('Error fetching changelogs:', err);
        setError('Failed to fetch changelogs: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchChangelogs();
  }, [repository]);

  return (
    <Box sx={{ pt: 8, pb: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h3" component="h1" gutterBottom sx={{
          color: '#000000',
          fontWeight: 700,
          mb: 4,
          textAlign: 'center',
          fontSize: { xs: '2.5rem', md: '3rem' }
        }}>
          {repository} Changelogs
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 4 }}>
            {error}
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ mt: 4, textAlign: 'center' }}>
            {error}
          </Typography>
        ) : changelogs.length === 0 ? (
          <Typography color="#666666" sx={{ mt: 4, textAlign: 'center' }}>
            No changelogs found for this repository
          </Typography>
        ) : (
          <Box sx={{ mt: 4 }}>
            {changelogs.map((changelog) => (
              <Box
                key={changelog.id}
                sx={{
                  mb: 4,
                  backgroundColor: '#ffffff',
                  borderRadius: 2,
                  boxShadow: 1,
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3
                  },
                  p: 4
                }}
              >
                <Box sx={{ mb: 2, borderBottom: '1px solid #e0e0e0', pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333333', mr: 2 }}>
                      {changelog.changes?.type?.toUpperCase() || 'N/A'}
                    </Typography>
                    <Typography color="text.secondary">
                      {changelog.date ? new Date(changelog.date).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}
                    </Typography>
                  </Box>
                  {changelog.changes && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" sx={{ mb: 1, lineHeight: 1.5 }}>
                        {changelog.changes.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {changelog.changes.impact}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={() => window.location.href = `/changelog/${changelog.id}`}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      padding: '8px 16px',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    Show Details
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default RepositoryChangelogs;
