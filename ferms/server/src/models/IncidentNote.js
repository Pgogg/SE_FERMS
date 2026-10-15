// models/IncidentNote.js — Stores free-text notes attached to an incident (§4.6)
'use strict';

module.exports = (sequelize, DataTypes) => {
  const IncidentNote = sequelize.define(
    'IncidentNote',
    {
      id: {
        type:          DataTypes.INTEGER,
        primaryKey:    true,
        autoIncrement: true,
      },
      incidentId: {
        type:      DataTypes.INTEGER,
        allowNull: false,
        field:     'incident_id',
      },
      authorId: {
        type:      DataTypes.INTEGER,
        allowNull: false,
        field:     'author_id',
      },
      note: {
        type:      DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Note must not be empty.' },
        },
      },
      createdAt: {
        type:      DataTypes.DATE,
        allowNull: false,
        field:     'created_at',
      },
    },
    {
      tableName:   'incident_notes',
      underscored: true,
      timestamps:  true,
      updatedAt:   false,
      createdAt:   'created_at',
    }
  );

  IncidentNote.associate = (models) => {
    // IncidentNote belongs to an Incident
    if (models.Incident) {
      IncidentNote.belongsTo(models.Incident, {
        foreignKey: 'incidentId',
        as:         'incident',
      });
    }

    // IncidentNote belongs to the author User
    if (models.User) {
      IncidentNote.belongsTo(models.User, {
        foreignKey: 'authorId',
        as:         'author',
      });
    }
  };

  return IncidentNote;
};
