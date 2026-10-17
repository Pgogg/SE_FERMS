// tests/incident.transitions.test.js — Unit tests for incident status state machine: valid and invalid transitions (§8)
'use strict';

const { INCIDENT_STATUS } = require('../src/domain/constants');
const { ALLOWED_TRANSITIONS, allowedNext } = require('../src/domain/incident.transitions');
const { AppError } = require('../src/middleware/error.middleware');

// Mock sockets and models for isolated unit testing
jest.mock('../src/sockets', () => ({
  emitIncident: jest.fn(),
}));

jest.mock('../src/models', () => {
  const mockTransaction = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    afterCommit: jest.fn((cb) => cb()),
  };

  return {
    IncidentStatusHistory: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    },
    sequelize: {
      transaction: jest.fn(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockTransaction);
        }
        return mockTransaction;
      }),
    },
  };
});

const { IncidentStatusHistory, sequelize } = require('../src/models');
const { emitIncident } = require('../src/sockets');
const { transition } = require('../src/services/incident-state.service');

describe('incident.transitions domain logic (§8)', () => {
  describe('ALLOWED_TRANSITIONS structure', () => {
    it('is frozen to prevent runtime mutation', () => {
      expect(Object.isFrozen(ALLOWED_TRANSITIONS)).toBe(true);
      for (const nextList of Object.values(ALLOWED_TRANSITIONS)) {
        expect(Object.isFrozen(nextList)).toBe(true);
      }
    });

    it('contains all 6 statuses from INCIDENT_STATUS', () => {
      const keys = Object.keys(ALLOWED_TRANSITIONS);
      const allStatuses = Object.values(INCIDENT_STATUS);
      expect(keys.sort()).toEqual([...allStatuses].sort());
    });
  });

  describe('allowedNext()', () => {
    it('returns valid destination arrays for all defined statuses', () => {
      expect(allowedNext(INCIDENT_STATUS.REPORTED)).toEqual([
        INCIDENT_STATUS.ASSIGNED,
        INCIDENT_STATUS.UNASSIGNED,
      ]);
      expect(allowedNext(INCIDENT_STATUS.UNASSIGNED)).toEqual([
        INCIDENT_STATUS.ASSIGNED,
      ]);
      expect(allowedNext(INCIDENT_STATUS.ASSIGNED)).toEqual([
        INCIDENT_STATUS.IN_PROGRESS,
        INCIDENT_STATUS.ASSIGNED,
      ]);
      expect(allowedNext(INCIDENT_STATUS.IN_PROGRESS)).toEqual([
        INCIDENT_STATUS.RESOLVED,
      ]);
      expect(allowedNext(INCIDENT_STATUS.RESOLVED)).toEqual([
        INCIDENT_STATUS.CLOSED,
      ]);
      expect(allowedNext(INCIDENT_STATUS.CLOSED)).toEqual([]);
    });

    it('returns empty array for invalid, unknown, or nullish statuses', () => {
      expect(allowedNext('non_existent')).toEqual([]);
      expect(allowedNext(null)).toEqual([]);
      expect(allowedNext(undefined)).toEqual([]);
      expect(allowedNext(123)).toEqual([]);
    });
  });
});

describe('incident-state.service.transition table-driven tests', () => {
  const allStatuses = Object.values(INCIDENT_STATUS);
  const matrix = [];

  for (const from of allStatuses) {
    for (const to of allStatuses) {
      const isValid = (ALLOWED_TRANSITIONS[from] || []).includes(to);
      matrix.push({ from, to, isValid });
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each(matrix)(
    'Transition from "$from" to "$to" (valid: $isValid)',
    async ({ from, to, isValid }) => {
      const mockIncident = {
        id: 101,
        status: from,
        stationId: 1,
        reporterId: 2,
        updatedAt: new Date('2026-10-01T00:00:00Z'),
        save: jest.fn().mockImplementation(async function () {
          return this;
        }),
      };

      if (isValid) {
        const result = await transition(mockIncident, to, { actorId: 42 });

        expect(result.status).toBe(to);
        expect(mockIncident.save).toHaveBeenCalled();
        expect(IncidentStatusHistory.create).toHaveBeenCalledWith(
          expect.objectContaining({
            incidentId: 101,
            status: to,
            changedBy: 42,
          }),
          expect.any(Object)
        );
        expect(emitIncident).toHaveBeenCalledWith('incident:updated', mockIncident);
      } else {
        await expect(transition(mockIncident, to, { actorId: 42 })).rejects.toThrow(
          AppError
        );

        try {
          await transition(mockIncident, to, { actorId: 42 });
        } catch (err) {
          expect(err.status).toBe(400);
          expect(err.code).toBe('INVALID_TRANSITION');
          expect(err.message).toBe(`Cannot move from ${from} to ${to}.`);
          expect(err.extra).toEqual({
            allowedNext: allowedNext(from),
          });
        }

        // Incident status should not have changed
        expect(mockIncident.status).toBe(from);
      }
    }
  );

  it('uses passed transaction and registers transaction.afterCommit', async () => {
    const customTx = {
      afterCommit: jest.fn((cb) => cb()),
    };

    const mockIncident = {
      id: 202,
      status: INCIDENT_STATUS.REPORTED,
      save: jest.fn().mockResolvedValue(true),
    };

    await transition(mockIncident, INCIDENT_STATUS.ASSIGNED, {
      actorId: 99,
      transaction: customTx,
    });

    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(mockIncident.save).toHaveBeenCalledWith({ transaction: customTx });
    expect(IncidentStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentId: 202,
        status: INCIDENT_STATUS.ASSIGNED,
        changedBy: 99,
      }),
      { transaction: customTx }
    );
    expect(customTx.afterCommit).toHaveBeenCalled();
    expect(emitIncident).toHaveBeenCalledWith('incident:updated', mockIncident);
  });

  it('creates its own transaction when none is provided', async () => {
    const mockIncident = {
      id: 303,
      status: INCIDENT_STATUS.UNASSIGNED,
      save: jest.fn().mockResolvedValue(true),
    };

    await transition(mockIncident, INCIDENT_STATUS.ASSIGNED, { actorId: 77 });

    expect(sequelize.transaction).toHaveBeenCalled();
    expect(mockIncident.status).toBe(INCIDENT_STATUS.ASSIGNED);
  });
});
