// pages/firefighter/IncidentDetail/IncidentDetail.jsx — Incident response view for firefighters (UC-10, UC-11, §7.3)
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Truck, ArrowLeft, FileText } from 'lucide-react';
import AppLayout from '../../../components/common/AppLayout/AppLayout';
import Card from '../../../components/ui/Card/Card';
import Badge from '../../../components/ui/Badge/Badge';
import Button from '../../../components/ui/Button/Button';
import Skeleton from '../../../components/ui/Skeleton/Skeleton';
import Stepper from '../../../components/ui/Stepper/Stepper';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui/Toast/Toast';
import { getIncident, updateStatus, addNote } from '../../../api/incidents.api.js';
import styles from './IncidentDetail.module.css';

// Stepper steps per §14.7: Assigned → In Progress → Resolved → Closed
const STEPS = [
  { key: 'assigned',    label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved',   label: 'Resolved' },
  { key: 'closed',     label: 'Closed' },
];

/**
 * Formats ISO timestamp to concise relative age string (e.g. 5m ago, 2h ago)
 */
function formatAge(dateStr) {
  if (!dateStr) return '—';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function vehicleTypeLabel(type) {
  if (!type) return 'Vehicle';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const NOTE_MAX = 2000;

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const isStationOfficer = user?.role === 'station_officer';

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status transition state
  const [statusLoading, setStatusLoading] = useState(false);
  const [transitionError, setTransitionError] = useState(null);

  // Note form state
  const [noteText, setNoteText] = useState('');
  const [noteError, setNoteError] = useState(null);
  const [noteLoading, setNoteLoading] = useState(false);

  const fetchIncident = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const envelope = await getIncident(id);
      setIncident(envelope?.data ?? null);
    } catch (err) {
      setError(err?.message || 'Failed to load incident details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  // ── Status transition handler ──────────────────────────────
  const handleStatusTransition = useCallback(
    async (toStatus) => {
      if (!incident) return;
      setStatusLoading(true);
      setTransitionError(null);
      try {
        const envelope = await updateStatus(id, { status: toStatus });
        // Optimistically update status then re-fetch for fresh history
        setIncident((prev) => ({ ...prev, status: envelope?.data?.status ?? toStatus }));
        await fetchIncident();
        toast.show({ type: 'success', message: `Status updated to ${toStatus.replace('_', ' ')} ✓` });
      } catch (err) {
        // Requirement 4: show server message and refresh
        const msg = err?.response?.data?.error?.message || err?.message || 'Transition failed.';
        setTransitionError(msg);
        await fetchIncident(); // refresh so UI is consistent with server state
        toast.show({ type: 'error', message: msg });
      } finally {
        setStatusLoading(false);
      }
    },
    [id, incident, fetchIncident, toast]
  );

  // ── Note submission handler ──────────────────────────────
  const handleNoteSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const trimmed = noteText.trim();
      if (!trimmed) {
        setNoteError('Note is required.');
        return;
      }
      if (trimmed.length > NOTE_MAX) {
        setNoteError(`Note must be at most ${NOTE_MAX} characters.`);
        return;
      }
      setNoteLoading(true);
      setNoteError(null);
      try {
        const envelope = await addNote(id, { note: trimmed });
        const newNote = envelope?.data;
        // Append immediately (optimistic)
        if (newNote) {
          setIncident((prev) => ({
            ...prev,
            notes: [...(prev.notes || []), newNote],
          }));
        }
        setNoteText('');
        toast.show({ type: 'success', message: 'Note added.' });
      } catch (err) {
        const msg = err?.response?.data?.error?.message || err?.message || 'Failed to add note.';
        setNoteError(msg);
        toast.show({ type: 'error', message: msg });
      } finally {
        setNoteLoading(false);
      }
    },
    [id, noteText, toast]
  );

  // ── Render next-status action button ──────────────────────
  function NextStatusButton({ status }) {
    if (status === 'assigned') {
      return (
        <Button
          variant="primary"
          size="lg"
          className={styles.actionBtn}
          loading={statusLoading}
          onClick={() => handleStatusTransition('in_progress')}
          id="btn-start-response"
        >
          Start Response
        </Button>
      );
    }
    if (status === 'in_progress') {
      return (
        <>
          <Button
            variant="primary"
            size="lg"
            className={styles.actionBtn}
            disabled
            id="btn-resolve"
            aria-describedby="resolve-hint"
          >
            Resolve Incident
          </Button>
          <p className={styles.actionHint} id="resolve-hint">
            Resolve flow coming in Week 5.
          </p>
        </>
      );
    }
    if (status === 'resolved' && isStationOfficer) {
      return (
        <>
          <Button
            variant="dark"
            size="lg"
            className={styles.actionBtn}
            disabled
            id="btn-close"
            aria-describedby="close-hint"
          >
            Close Incident
          </Button>
          <p className={styles.actionHint} id="close-hint">
            Close flow coming in Week 5.
          </p>
        </>
      );
    }
    return null;
  }

  // ── Loading skeleton ──────────────────────────────────────
  if (loading) {
    return (
      <AppLayout>
        <div className={styles.container}>
          <div className={styles.loadingContainer} aria-busy="true" aria-label="Loading incident">
            <Skeleton lines={1} height={36} />
            <Skeleton lines={5} />
            <Skeleton lines={3} />
            <Skeleton lines={4} />
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (error || !incident) {
    return (
      <AppLayout>
        <div className={styles.container}>
          <button className={styles.backLink} onClick={() => navigate('/assignments')} aria-label="Back to My Assignments">
            <ArrowLeft size={16} aria-hidden="true" />
            My Assignments
          </button>
          <Card variant="warm" className={styles.errorCard}>
            <p className={styles.errorMsg}>{error || 'Incident not found.'}</p>
            <Button variant="ghost" size="md" onClick={fetchIncident}>
              Retry
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const { status, statusHistory = [], notes = [], vehicles = [] } = incident;

  // Map stepper key: 'reported' and 'unassigned' both map to 'assigned' step
  const stepperStatus = status === 'reported' || status === 'unassigned' ? 'assigned' : status;

  return (
    <AppLayout>
      <div className={styles.container}>
        {/* Back link */}
        <button
          className={styles.backLink}
          onClick={() => navigate('/assignments')}
          aria-label="Back to My Assignments"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          My Assignments
        </button>

        {/* ── Hero card ── */}
        <Card variant="light" className={styles.heroCard}>
          <div className={styles.heroTop}>
            <h1 className={styles.heroId}>Incident #{incident.id}</h1>
            <div className={styles.badgeRow}>
              <Badge variant="severity" value={incident.severity} />
              <Badge variant="status" value={incident.status} />
            </div>
          </div>

          <p className={styles.heroDesc}>{incident.description}</p>

          <div className={styles.heroMeta}>
            {incident.address && (
              <div className={styles.heroMetaRow}>
                <MapPin size={14} className={styles.heroMetaIcon} aria-hidden="true" />
                <span className={styles.heroMetaLabel}>Address</span>
                <span className={styles.heroMetaVal}>{incident.address}</span>
              </div>
            )}
            <div className={styles.heroMetaRow}>
              <span className={styles.heroMetaIcon} aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="10" width="18" height="11" rx="2" />
                  <path d="M7 21V10l5-7 5 7v11" />
                  <path d="M10 21v-6h4v6" />
                </svg>
              </span>
              <span className={styles.heroMetaLabel}>Station</span>
              <span className={styles.heroMetaVal}>{incident.station?.name ?? 'Unassigned'}</span>
            </div>
            <div className={styles.heroMetaRow}>
              <FileText size={14} className={styles.heroMetaIcon} aria-hidden="true" />
              <span className={styles.heroMetaLabel}>Reported</span>
              <span className={styles.heroMetaVal}>{formatDateTime(incident.createdAt)} ({formatAge(incident.createdAt)})</span>
            </div>
            {incident.closingSummary && (
              <div className={styles.heroMetaRow}>
                <FileText size={14} className={styles.heroMetaIcon} aria-hidden="true" />
                <span className={styles.heroMetaLabel}>Summary</span>
                <span className={styles.heroMetaVal}>{incident.closingSummary}</span>
              </div>
            )}
          </div>
        </Card>

        {/* ── Progress Stepper ── */}
        <Card variant="light" className={styles.stepperCard}>
          <p className={styles.stepperLabel}>Response Progress</p>
          <Stepper steps={STEPS} currentKey={stepperStatus} />
        </Card>

        {/* ── Next status action ── */}
        {status !== 'resolved' && status !== 'closed' && (
          <div className={styles.actionSection}>
            {transitionError && (
              <p className={styles.transitionError} role="alert">{transitionError}</p>
            )}
            <NextStatusButton status={status} />
          </div>
        )}

        {/* ── Assigned Vehicles ── */}
        <Card variant="light" className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Assigned Vehicles</h2>
          {vehicles.length === 0 ? (
            <p className={styles.errorMsg} style={{ color: 'var(--color-muted)' }}>No vehicles assigned to this incident.</p>
          ) : (
            <div className={styles.vehicleList}>
              {vehicles.map((v, i) => (
                <div key={v.vehicleId ?? i} className={styles.vehicleRow}>
                  <Truck size={18} className={styles.vehicleIcon} aria-hidden="true" />
                  <div className={styles.vehicleInfo}>
                    <span className={styles.vehicleType}>{vehicleTypeLabel(v.type)}</span>
                    <span className={styles.vehicleReg}>{v.registrationNo}</span>
                  </div>
                  {v.releasedAt ? (
                    <Badge variant="vehicle" value="available" />
                  ) : (
                    <Badge variant="vehicle" value="dispatched" />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Status History Timeline ── */}
        <Card variant="light" className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Status History</h2>
          {statusHistory.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>No history recorded yet.</p>
          ) : (
            <div className={styles.timeline} aria-label="Status history timeline">
              {statusHistory.map((entry, idx) => (
                <div key={entry.id ?? idx} className={styles.timelineItem}>
                  <div className={styles.timelineDot}>
                    <div className={styles.dot} />
                    {idx < statusHistory.length - 1 && <div className={styles.timelineLine} aria-hidden="true" />}
                  </div>
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineStatus}>
                      <Badge variant="status" value={entry.status} />
                    </span>
                    <div className={styles.timelineMeta}>
                      {formatDateTime(entry.changedAt)}
                      {entry.changedByName
                        ? ` · by ${entry.changedByName}`
                        : entry.changedBy
                        ? ` · by User #${entry.changedBy}`
                        : ' · System'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Notes (oldest first) ── */}
        <Card variant="light" className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Field Notes</h2>

          {notes.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>No notes yet. Add the first note below.</p>
          ) : (
            <div className={styles.notesList}>
              {/* oldest first — notes from API are already ordered ascending */}
              {notes.map((note, idx) => (
                <article key={note.id ?? idx} className={styles.noteItem}>
                  <p className={styles.noteText}>{note.note}</p>
                  <span className={styles.noteMeta}>
                    {formatDateTime(note.createdAt)}
                    {note.authorName ? ` · ${note.authorName}` : note.authorId ? ` · User #${note.authorId}` : ''}
                  </span>
                </article>
              ))}
            </div>
          )}

          {/* Note form — only for station staff */}
          {(user?.role === 'firefighter' || isStationOfficer) && status !== 'closed' && (
            <form className={styles.noteForm} onSubmit={handleNoteSubmit} noValidate aria-label="Add a field note">
              <h3 className={styles.noteFormTitle}>Add Note</h3>
              <div>
                <textarea
                  id="incident-note-input"
                  className={`${styles.noteTextarea} ${noteError ? styles.hasError : ''}`}
                  value={noteText}
                  onChange={(e) => {
                    setNoteText(e.target.value);
                    if (noteError) setNoteError(null);
                  }}
                  placeholder="Describe field conditions, actions taken, or any observations…"
                  maxLength={NOTE_MAX + 10}
                  aria-label="Field note text"
                  aria-describedby={noteError ? 'note-error' : 'note-char-count'}
                  aria-invalid={noteError ? 'true' : undefined}
                  rows={4}
                />
                <div className={`${styles.noteCharCount} ${noteText.length > NOTE_MAX ? styles.overLimit : ''}`} id="note-char-count" aria-live="polite">
                  {noteText.length} / {NOTE_MAX}
                </div>
                {noteError && (
                  <p id="note-error" className={styles.noteError} role="alert">{noteError}</p>
                )}
              </div>
              <div className={styles.noteSubmitRow}>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={noteLoading}
                  disabled={!noteText.trim() || noteText.length > NOTE_MAX}
                  id="btn-add-note"
                >
                  Add Note
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
