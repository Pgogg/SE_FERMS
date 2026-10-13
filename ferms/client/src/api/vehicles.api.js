// api/vehicles.api.js — Functions for vehicle management (§5.3)
import axiosInstance from './axiosInstance.js';

export const getStationVehicles = async (stationId) => {
  const response = await axiosInstance.get(`/stations/${stationId}/vehicles`);
  return response.data;
};

export const createVehicle = async (data) => {
  const response = await axiosInstance.post('/vehicles', data);
  return response.data;
};

export const updateVehicle = async (id, data) => {
  const response = await axiosInstance.patch(`/vehicles/${id}`, data);
  return response.data;
};

export const deleteVehicle = async (id) => {
  const response = await axiosInstance.delete(`/vehicles/${id}`);
  return response.data;
};
