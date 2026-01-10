// axios.js
import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_baseUrl,
});

instance.interceptors.request.use(
  (config) => {
    // Add common request headers here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;

