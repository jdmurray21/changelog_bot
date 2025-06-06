import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import Navbar from './components/Navbar';
import GenerateChangelog from './pages/GenerateChangelog';
import Home from './pages/Home';
import ViewChangelogs from './pages/ViewChangelogs';
import RepositoryChangelogs from './pages/RepositoryChangelogs';
import ChangelogDetails from './pages/ChangelogDetails';
import RouteHandler from './components/RouteHandler';

function App() {
  return (
    <Router>
      <Box sx={{ minHeight: '100vh', bgcolor: '#ffffff' }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/view-changelogs" element={<ViewChangelogs />} />
          <Route path="/generate-changelog" element={<GenerateChangelog />} />
          <Route 
            path="/repository/*" 
            element={
              <RouteHandler>
                <RepositoryChangelogs />
              </RouteHandler>
            }
          />
          <Route path="/changelog/:id" element={<ChangelogDetails />} />
        </Routes>
      </Box>
    </Router>
  );
}

export default App;
