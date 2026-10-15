// api/stations.api.js — Functions for stations API calls (§5.3)
import axiosInstance from './axiosInstance.js';

export const listStations = async () => {
  const response = await axiosInstance.get('/stations');
  return response.data;
};

export const createStation = async (data) => {
  const response = await axiosInstance.post('/stations', data);
  return response.data;
};

export const updateStation = async (id, data) => {
  const response = await axiosInstance.patch(`/stations/${id}`, data);
  return response.data;
};
