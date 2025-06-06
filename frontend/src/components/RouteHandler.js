import React from 'react';
import { useLocation } from 'react-router-dom';

const RouteHandler = ({ children }) => {
  const location = useLocation();
  // Get the full repository path from the URL
  // Extract repository path from URL (no need to decode since we're not encoding)
  const repository = location.pathname.replace('/repository/', '');
  console.log('RouteHandler repository:', repository);
  
  return React.cloneElement(children, { repository });
};

export default RouteHandler;
