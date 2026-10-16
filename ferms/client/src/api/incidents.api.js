// api/incidents.api.js — Functions for fetching, creating, updating, and transitioning incidents (§5.2)
import axiosInstance from './axiosInstance.js';

// ===== Parth =====
export const createIncident = async (data) => {
  const response = await axiosInstance.post('/incidents', data);
  return response.data;
};

export const getMyIncidents = async () => {
  const response = await axiosInstance.get('/incidents/mine');
  return response.data;
};

export const assignIncident = async (id, data) => {
  const response = await axiosInstance.patch(`/incidents/${id}/assign`, data);
  return response.data;
};
// ===== /Parth =====

// ===== Vedant =====
export const listIncidents = async (params) => {
  const response = await axiosInstance.get('/incidents', { params });
  return response.data;
};

export const getIncidentStats = async (params) => {
  const response = await axiosInstance.get('/incidents/stats', { params });
  return response.data;
};

export const listAssigned = async () => {
  const response = await axiosInstance.get('/incidents/assigned');
  return response.data;
};

export const getAssignedIncidents = listAssigned;

export const getIncident = async (id) => {
  const response = await axiosInstance.get(`/incidents/${id}`);
  return response.data;
};

export const updateIncidentStatus = async (id, data) => {
  const response = await axiosInstance.patch(`/incidents/${id}/status`, data);
  return response.data;
};

export const addIncidentNote = async (id, data) => {
  const response = await axiosInstance.post(`/incidents/${id}/notes`, data);
  return response.data;
};

export const resolveIncident = async (id, data) => {
  const response = await axiosInstance.patch(`/incidents/${id}/resolve`, data);
  return response.data;
};

export const closeIncident = async (id) => {
  const response = await axiosInstance.patch(`/incidents/${id}/close`);
  return response.data;
};
// ===== /Vedant =====
