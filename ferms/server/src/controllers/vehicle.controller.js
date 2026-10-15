// controllers/vehicle.controller.js — Handles CRUD operations and availability updates for vehicles
'use strict';

const resourceService = require('../services/resource.service');

const listStationVehicles = async (req, res) => {
  const vehicles = await resourceService.getStationVehicles(req.params.id);
  return res.json({
    data: vehicles,
    meta: {
      count: vehicles.length,
    },
  });
};

const createVehicle = async (req, res) => {
  const vehicle = await resourceService.createVehicle(req.body, req.user);
  return res.status(201).json({
    data: vehicle,
  });
};

const updateVehicle = async (req, res) => {
  const vehicle = await resourceService.updateVehicle(req.params.id, req.body, req.user);
  return res.json({
    data: vehicle,
  });
};

const deleteVehicle = async (req, res) => {
  await resourceService.deleteVehicle(req.params.id, req.user);
  return res.json({
    data: {
      message: 'Vehicle deleted successfully.',
    },
  });
};

module.exports = {
  listStationVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};
