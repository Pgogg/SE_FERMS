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

/**
 * listAllFirefighters
 * Lists all firefighters/station officers in the system for the "Assign Firefighter" modal.
 *
 * NOTE (W3-V-FE-1 PR): GET /api/users is not yet implemented on the server (user.routes.js is
 * an empty stub). This call will 404 when VITE_REAL_API_PREFIXES includes /api/stations.
 * Until the server endpoint exists, the Assign Firefighter modal will degrade gracefully
 * to an empty list with an explanatory message.
 */
export const listAllFirefighters = async () => {
  const response = await axiosInstance.get('/users');
  return response.data;
};
