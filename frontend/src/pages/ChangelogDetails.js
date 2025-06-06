import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Container,
  Link
} from '@mui/material';
import { GitHub as GitHubIcon } from '@mui/icons-material';
import axios from '../config/axios';

const ChangelogDetails = () => {
  const { id } = useParams();
  const [changelog, setChangelog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        const response = await axios.get(`/changelog/${id}`);
        setChangelog(response.data.changelog);
      } catch (err) {
        setError(err.response?.data?.detail?.error || 'Failed to fetch changelog details');
      } finally {
        setLoading(false);
      }
    };

    fetchChangelog();
  }, [id]);

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error" sx={{ mt: 4, textAlign: 'center' }}>
          {error}
        </Typography>
      </Container>
    );
  }

  if (!changelog) {
    return null;
  }

  return (
    <Container sx={{ pt: 8 }}>
      <Box>
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
          <Box sx={{ mt: 3 }}>
            <Typography variant="body1" sx={{ mb: 1, lineHeight: 1.5 }}>
              {changelog.changes.description}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {changelog.changes.impact}
            </Typography>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#333333' }}>
              Commits ({changelog.changes.commits?.length || 0})
            </Typography>
            {changelog.changes.commits?.map((commit, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <Link 
                    href={`https://github.com/${changelog.repository}/commit/${commit.sha}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    color="primary"
                    sx={{ textDecoration: 'none' }}
                    underline="hover"
                  >
                    {commit.sha.slice(0, 7)}
                  </Link>
                  : {commit.message}
                </Typography>
              </Box>
            )) || (
              <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No commits recorded
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default ChangelogDetails;
