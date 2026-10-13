// api/auth.api.js — Functions for register, login, logout, and current user profile
import axiosInstance from './axiosInstance.js';

export const register = async (data) => {
  const response = await axiosInstance.post('/auth/register', data);
  return response.data;
};

export const login = async (data) => {
  const response = await axiosInstance.post('/auth/login', data);
  return response.data;
};

export const logout = async () => {
  const response = await axiosInstance.post('/auth/logout');
  return response.data;
};

export const getMe = async () => {
  const response = await axiosInstance.get('/auth/me');
  return response.data;
};
