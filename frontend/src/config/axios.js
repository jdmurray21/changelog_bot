import axios from 'axios';

// Configure axios with the backend URL
axios.defaults.baseURL = 'http://localhost:8000/api/v1';
axios.defaults.withCredentials = true;

// Add a request interceptor to log requests
axios.interceptors.request.use(
  (config) => {
    console.log('API Request:', config);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to log responses and handle errors
axios.interceptors.response.use(
  (response) => {
    console.log('API Response:', response);
    return response;
  },
  (error) => {
    console.error('Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default axios;
