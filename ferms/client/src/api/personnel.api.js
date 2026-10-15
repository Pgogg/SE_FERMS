// api/personnel.api.js — Functions for personnel management (§5.3)
import axiosInstance from './axiosInstance.js';

export const getStationPersonnel = async (stationId) => {
  const response = await axiosInstance.get(`/stations/${stationId}/personnel`);
  return response.data;
};

export const assignPersonnelStation = async (userId, data) => {
  const response = await axiosInstance.patch(`/personnel/${userId}/station`, data);
  return response.data;
};

export const updatePersonnelDuty = async (userId, data) => {
  const response = await axiosInstance.patch(`/personnel/${userId}/duty`, data);
  return response.data;
};
