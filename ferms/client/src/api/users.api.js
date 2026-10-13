// api/users.api.js — Functions for user management API calls (§5.5)
import axiosInstance from './axiosInstance.js';

export const listUsers = async () => {
  const response = await axiosInstance.get('/users');
  return response.data;
};

export const createUser = async (data) => {
  const response = await axiosInstance.post('/users', data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await axiosInstance.patch(`/users/${id}`, data);
  return response.data;
};

export const updateUserRole = async (id, data) => {
  const response = await axiosInstance.patch(`/users/${id}/role`, data);
  return response.data;
};

export const deactivateUser = async (id) => {
  const response = await axiosInstance.patch(`/users/${id}/deactivate`);
  return response.data;
};
