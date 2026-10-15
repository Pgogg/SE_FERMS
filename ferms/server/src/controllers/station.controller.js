// controllers/station.controller.js — Handles CRUD operations for fire stations
'use strict';

const resourceService = require('../services/resource.service');

const listStations = async (req, res) => {
  const stations = await resourceService.listStationsWithCounts();
  return res.json({
    data: stations,
    meta: {
      count: stations.length,
    },
  });
};

const createStation = async (req, res) => {
  const station = await resourceService.createStation(req.body);
  return res.status(201).json({
    data: station,
  });
};

const updateStation = async (req, res) => {
  const station = await resourceService.updateStation(req.params.id, req.body);
  return res.json({
    data: station,
  });
};

module.exports = {
  listStations,
  createStation,
  updateStation,
};
