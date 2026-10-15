// api/notifications.api.js — Functions for notification API calls (§5.4)
import axiosInstance from './axiosInstance.js';

export const listNotifications = async (params) => {
  const response = await axiosInstance.get('/notifications', { params });
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await axiosInstance.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await axiosInstance.patch('/notifications/read-all');
  return response.data;
};
