// controllers/personnel.controller.js — Handles listing and managing personnel within a station
'use strict';

const resourceService = require('../services/resource.service');
const { serializeUser } = require('../utils/serializers');

const listStationPersonnel = async (req, res) => {
  const personnel = await resourceService.getStationPersonnel(req.params.id);
  return res.json({
    data: personnel.map(serializeUser),
    meta: {
      count: personnel.length,
    },
  });
};

const updatePersonnelStation = async (req, res) => {
  const user = await resourceService.updatePersonnelStation(
    req.params.userId,
    req.body.stationId !== undefined ? req.body.stationId : null,
    req.user
  );
  return res.json({
    data: serializeUser(user),
  });
};

const updatePersonnelDuty = async (req, res) => {
  const user = await resourceService.updatePersonnelDuty(
    req.params.userId,
    req.body.onDuty,
    req.user
  );
  return res.json({
    data: serializeUser(user),
  });
};

module.exports = {
  listStationPersonnel,
  updatePersonnelStation,
  updatePersonnelDuty,
};
