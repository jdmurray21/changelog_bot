import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  ButtonGroup,
  Stack,
  Alert,
  Paper,
  CircularProgress
} from '@mui/material';
import axios from '../config/axios';

// Custom theme colors
const theme = {
  primary: '#000000',
  secondary: '#ffffff',
  background: '#ffffff',
  text: '#000000',
  lightText: '#666666',
  accent: '#000000',
  accentLight: '#333333'
};

const GenerateChangelog = () => {
  const [repository, setRepository] = useState('');
  const [shas, setShas] = useState([]);  // Processed and validated SHAs
  const [rawInput, setRawInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [changelog, setChangelog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('sha');
  const navigate = useNavigate();

  // Handle the generated changelog
  useEffect(() => {
    if (changelog && changelog.type && changelog.description) {
      // Format and navigate to repository page
      const [owner, repo] = changelog.repository.split('/');
      const encodedRepo = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
      navigate(`/repository/${encodedRepo}`);
    }
  }, [changelog, navigate]);

  const generateChangelog = async () => {
    // Validate inputs before making API calls
    if (!repository) {
      setError('❌ Please enter a repository name');
      return;
    }

    // Validate repository format (owner/repo)
    const repoParts = repository.split('/');
    if (repoParts.length !== 2) {
      setError('❌ Invalid repository format. Please use format: owner/repo');
      return;
    }

    const [owner, repo] = repoParts;
    if (!owner || !repo) {
      setError('❌ Invalid repository format. Please use format: owner/repo');
      return;
    }

    // Validate that owner and repo don't contain invalid characters
    const invalidChars = /[<>:"\\|?*]/;
    if (invalidChars.test(owner) || invalidChars.test(repo)) {
      setError('❌ Repository name contains invalid characters. Please use only letters, numbers, and hyphens.');
      return;
    }

    if (mode === 'sha') {
      // Validate SHAs
      if (shas.length === 0) {
        setError('❌ Please enter at least one commit SHA');
        return;
      }

      // We already validated SHAs in the input handler, so we can be confident they're valid here
      // No need for additional validation since it's done on input change
    }

    if (mode === 'date') {
      // Validate dates
      if (!startDate || !endDate) {
        setError('❌ Please enter both start and end dates');
        return;
      }

      // Parse dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Validate date format
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        setError('❌ Invalid date format. Please use YYYY-MM-DD');
        return;
      }

      // Validate that start date is not after end date
      if (start > end) {
        setError('❌ Start date cannot be after end date');
        return;
      }

      // Validate that dates are not too far apart (max 30 days)
      const maxDays = 30;
      const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > maxDays) {
        setError(`❌ Date range cannot be more than ${maxDays} days`);
        return;
      }
    }

    setLoading(true);
    setError('');
    setChangelog(null);

    try {
      const data = mode === 'date'
        ? {
          repository: repository,
          start_date: startDate,
          end_date: endDate
        }
        : {
          repository: repository,
          commit_shas: shas
        };

      const response = await axios.post(
        mode === 'date' ? '/commits' : '/generate',
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          validateStatus: function (status) {
            // Allow all status codes to handle errors properly
            return true;
          }
        }
      );

      // Handle API errors
      if (response.status >= 400) {
        const errorData = response.data?.detail || response.data || {};
        const errorMessage = errorData.message || errorData.error || '❌ Failed to generate changelog';
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Check if we have a valid response
      if (!response?.data) {
        throw new Error('No response data received from server');
      }

      // For date range mode, we expect a response with shas array
      if (mode === 'date') {
        if (response.data?.success && Array.isArray(response.data.shas)) {
          // Store the SHAs for later use
          localStorage.setItem('dateRangeCommits', JSON.stringify({
            repository,
            shas: response.data.shas
          }));
          
          // Generate a changelog from the found commits
          const data = {
            repository,
            commit_shas: response.data.shas
          };

          // Make a second API call to generate the changelog
          const changelogResponse = await axios.post('/generate', data);
          
          // Handle the changelog response
          if (changelogResponse.data?.success && changelogResponse.data?.changelog) {
            const changelog = changelogResponse.data.changelog;
            if (changelog.type && changelog.description) {
              // Format the changelog to match ViewChangelogs format
              setChangelog({
                type: changelog.type,
                date: changelog.date,
                description: changelog.description,
                impact: changelog.impact,
                commit_count: changelog.commit_count,
                commits: changelog.commits,
                changes: {
                  type: changelog.type,
                  description: changelog.description,
                  impact: changelog.impact,
                  commits: changelog.commits
                },
                repository: changelog.repository
              });
              
              // Navigate to the repository changelogs page
              // Split repository into owner and repo parts and encode separately
              const [owner, repo] = changelog.repository.split('/');
              const encodedOwner = encodeURIComponent(owner);
              const encodedRepo = encodeURIComponent(repo);
              
              setTimeout(() => {
                navigate(`/repository/${encodedOwner}/${encodedRepo}`);
              }, 1000);
            } else {
              throw new Error('Invalid changelog format');
            }
          } else {
            throw new Error('Invalid response format');
          }
        } else {
          throw new Error('Invalid response format for date range mode');
        }
      } else {
        // For SHA mode, we expect a JSON object with changelog data
        if (response.data && typeof response.data === 'object') {
          // If we get an error response, throw it
          if (response.data.error) {
            throw new Error(response.data.error);
          }
          
          // Handle different response formats
          if (response.data.changelog) {
            const changelog = response.data.changelog;
            if (changelog.type && changelog.description) {
              // Format the changelog to match ChangelogDetails format
              setChangelog({
                type: changelog.type,
                date: changelog.date,
                description: changelog.description,
                impact: changelog.impact,
                commit_count: changelog.commit_count,
                commits: changelog.commits,
                changes: {
                  type: changelog.type,
                  description: changelog.description,
                  impact: changelog.impact,
                  commits: changelog.commits
                },
                repository: changelog.repository
              });
            } else {
              throw new Error('Invalid changelog format');
            }
          } else if (response.data.success && response.data.changelog) {
            const changelog = response.data.changelog;
            if (changelog.changes && typeof changelog.changes === 'object') {
              setChangelog({
                type: 'Generated',
                description: 'Changelog generated successfully',
                impact: 'N/A',
                formatted_output: JSON.stringify(changelog.changes, null, 2)
              });
            } else {
              throw new Error('Invalid changelog format');
            }
          } else {
            throw new Error('Invalid response format for SHA mode');
          }
        } else {
          throw new Error('Invalid response format');
        }
      }
    } catch (error) {
      // Get error data from the error object
      const errorData = error.response?.data || {};
      
      // Extract error message from various possible locations
      const errorMessage = errorData.error || 
        errorData.message || 
        errorData.detail || 
        errorData.detail?.error || 
        error.message || 
        '❌ Failed to generate changelog';
      
      setError(errorMessage);
      setLoading(false);
      // Log more detailed error information
      if (errorData.details) {
        console.error('Detailed error:', errorData.details);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
        pt: 8, 
        pb: 6, 
        bgcolor: '#f8f9fa'
      }}>
      <Container maxWidth="lg" sx={{ bgcolor: 'white', borderRadius: 2, boxShadow: 2, p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{
          color: '#000000',
          fontWeight: 700,
          mb: 2,
          textAlign: 'center',
          fontSize: { xs: '2.5rem', md: '3rem' }
        }}>
          Generate Changelog
        </Typography>

        <Box sx={{ mb: 4, width: '100%', maxWidth: '600px', mx: 'auto' }}>
          <ButtonGroup variant="contained" size="large" sx={{
            borderRadius: 2,
            '& .MuiButton-root': {
              minWidth: '150px',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '1rem'
            },
            justifyContent: 'center'
          }}>
            <Button
              onClick={() => setMode('sha')}
              sx={{
                bgcolor: mode === 'sha' ? '#000000' : '#f0f0f0',
                color: mode === 'sha' ? 'white' : '#000000',
                '&:hover': {
                  bgcolor: '#000000'
                },
                '&:active': {
                  bgcolor: '#333333'
                }
              }}
            >
              generate based on commit SHAs
            </Button>
            <Button
              onClick={() => setMode('date')}
              sx={{
                bgcolor: mode === 'date' ? '#000000' : '#f0f0f0',
                color: mode === 'date' ? 'white' : '#000000',
                '&:hover': {
                  bgcolor: '#000000'
                },
                '&:active': {
                  bgcolor: '#333333'
                }
              }}
            >
              generate based on date range
            </Button>
          </ButtonGroup>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ 
            width: '100%', 
            maxWidth: '600px', 
            mx: 'auto'
          }}>
            <TextField
              fullWidth
              margin="normal"
              label="Repository (owner/repo)"
              placeholder="e.g., torvalds/linux"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: '#e0e0e0'
                  },
                  '&:hover fieldset': {
                    borderColor: '#000000'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#000000'
                  }
                },
                '& .MuiInputLabel-root': {
                  color: '#666666'
                }
              }}
            />

            {mode === 'sha' ? (
              <TextField
                fullWidth
                margin="normal"
                label="Commit SHAs (one per line)"
                placeholder="Enter SHAs, one per line"
                multiline
                rows={4}
                value={rawInput}
                onChange={(e) => {
                  const input = e.target.value;
                  setRawInput(input);

                  // Process SHAs immediately when input changes
                  const processedShas = input.split('\n')
                    .map(s => s.trim())
                    .filter(s => s.length > 0);
                  
                  // Validate SHAs as they're entered
                  const invalidShas = processedShas.filter(sha => !/^[0-9a-f]{40}$/.test(sha));
                  if (invalidShas.length > 0) {
                    setError(`❌ Invalid SHA format: ${invalidShas[0]}. Expected a 40-character hexadecimal string like: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0`);
                    setShas([]);  // Clear valid SHAs when invalid ones are found
                  } else {
                    // Remove duplicates while preserving order
                    const uniqueShas = [...new Set(processedShas)];
                    setShas(uniqueShas);
                    setError('');
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: '#e0e0e0'
                    },
                    '&:hover fieldset': {
                      borderColor: '#000000'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#000000'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#666666'
                  }
                }}
              />
            ) : (
              <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                <Stack direction="column" spacing={1} alignItems="flex-start">
                  <Typography variant="subtitle2" color="#666666" sx={{ mb: 1 }}>
                    Start Date
                  </Typography>
                  <TextField
                    fullWidth
                    margin="normal"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: '#e0e0e0'
                        },
                        '&:hover fieldset': {
                          borderColor: '#000000'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#000000'
                        }
                      },
                      '& .MuiInputLabel-root': {
                        color: '#666666'
                      }
                    }}
                  />
                </Stack>
                <Stack direction="column" spacing={1} alignItems="flex-start">
                  <Typography variant="subtitle2" color="#666666" sx={{ mb: 1 }}>
                    End Date
                  </Typography>
                  <TextField
                    fullWidth
                    margin="normal"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: '#e0e0e0'
                        },
                        '&:hover fieldset': {
                          borderColor: '#000000'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#000000'
                        }
                      },
                      '& .MuiInputLabel-root': {
                        color: '#666666'
                      }
                    }}
                  />
                </Stack>
              </Stack>
            )}

            <Button
              variant="contained"
              onClick={generateChangelog}
              disabled={loading || !repository}
              sx={{
                mt: 4,
                mb: 2,
                py: 1.5,
                px: 4,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                bgcolor: '#000000',
                color: 'white',
                '&:hover': {
                  bgcolor: '#333333'
                },
                '&:active': {
                  bgcolor: '#333333'
                }
              }}
            >
              {loading ? <CircularProgress size={20} /> : 'Generate Changelog'}
            </Button>

            {changelog && (
              <Box sx={{ 
                mt: 4,
                p: 4,
                bgcolor: '#ffffff',
                borderRadius: 2,
                boxShadow: 2,
                border: '1px solid #e0e0e0'
              }}>
                <Typography variant="h4" component="h2" gutterBottom sx={{
                  color: '#000000',
                  fontWeight: 600,
                  mb: 2
                }}>
                  Generated Changelog
                </Typography>
                
                <Stack spacing={3}>
                  <Typography variant="body1" color="#666666" sx={{ mb: 2 }}>
                    <span style={{ fontWeight: 600 }}>Type:</span> {changelog.type}<br />
                    <span style={{ fontWeight: 600 }}>Description:</span> {changelog.description}<br />
                    <span style={{ fontWeight: 600 }}>Impact:</span> {changelog.impact}
                  </Typography>
                  
                  <Typography variant="body1" color="#000000" sx={{
                    mb: 2,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6
                  }}>
                    {changelog.formatted_output}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default GenerateChangelog;
