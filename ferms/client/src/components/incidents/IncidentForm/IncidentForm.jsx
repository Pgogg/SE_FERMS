// components/incidents/IncidentForm/IncidentForm.jsx — Multi-step form for citizens to report a new incident
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Navigation,
  CheckCircle,
  AlertCircle,
  MapPin,
  FileText,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import Stepper from '../../ui/Stepper/Stepper';
import FormField from '../../ui/FormField/FormField';
import SeverityPicker from '../../ui/SeverityPicker/SeverityPicker';
import Button from '../../ui/Button/Button';
import Badge from '../../ui/Badge/Badge';
import LocationPicker from './LocationPicker';
import { createIncident } from '../../../api/incidents.api';
import styles from './IncidentForm.module.css';

const STEPS = [
  { key: 'location', label: 'Location' },
  { key: 'details', label: 'Details' },
  { key: 'confirm', label: 'Confirm' },
];

export default function IncidentForm({ onSubmitted }) {
  // Step navigation
  const [currentStep, setCurrentStep] = useState('location');

  // Form data state
  const [formData, setFormData] = useState({
    latitude: null,
    longitude: null,
    address: '',
    description: '',
    severity: '',
  });

  // Geolocation handling
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [showManualLocation, setShowManualLocation] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  // ----------------------------------------------------
  // Geolocation trigger
  // ----------------------------------------------------
  const handleUseMyLocation = () => {
    setGeoLoading(true);
    setGeoError(null);
    setErrors((prev) => ({ ...prev, location: null }));

    if (!navigator.geolocation) {
      setGeoLoading(false);
      setGeoError(
        'Geolocation is not supported by your browser. Please enter your address and drop a pin on the map below.'
      );
      setShowManualLocation(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false);
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setGeoError(null);
        setErrors((prev) => ({ ...prev, location: null }));
      },
      (err) => {
        setGeoLoading(false);
        let message = 'Unable to determine location. Please enter an address and drop a pin on the map.';
        if (err.code === 1) {
          message = 'Location permission was denied. Please enter an address and drop a pin on the map below.';
        } else if (err.code === 3) {
          message = 'Location request timed out. Please enter an address and drop a pin on the map below.';
        } else if (err.code === 2) {
          message = 'Location information is unavailable. Please enter an address and drop a pin on the map below.';
        }
        setGeoError(message);
        setShowManualLocation(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleManualMapChange = (coords) => {
    setFormData((prev) => ({
      ...prev,
      latitude: coords.latitude,
      longitude: coords.longitude,
    }));
    setErrors((prev) => ({ ...prev, location: null }));
  };

  // ----------------------------------------------------
  // Step 1 Validation & Proceed
  // ----------------------------------------------------
  const handleNextFromLocation = () => {
    const newErrors = {};

    if (
      formData.latitude === null ||
      formData.latitude === undefined ||
      formData.longitude === null ||
      formData.longitude === undefined
    ) {
      newErrors.location =
        'Coordinates are required. Please click "Use my location" or place a pin on the map.';
    }

    if (showManualLocation && (!formData.address || !formData.address.trim())) {
      newErrors.address = 'Please provide an address or landmark for manual location.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTimeout(() => {
        if (newErrors.address) {
          document.getElementById('field-address-manual')?.focus();
        } else if (newErrors.location) {
          if (showManualLocation) {
            document.getElementById('field-address-manual')?.focus() ||
            document.getElementById('btn-use-location')?.focus();
          } else {
            document.getElementById('btn-use-location')?.focus();
          }
        }
      }, 50);
      return;
    }

    setErrors({});
    setCurrentStep('details');
  };

  // ----------------------------------------------------
  // Step 2 Validation & Proceed
  // ----------------------------------------------------
  const handleNextFromDetails = () => {
    const newErrors = {};

    if (!formData.description || !formData.description.trim()) {
      newErrors.description = 'Incident description is required.';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters.';
    }

    if (!formData.severity) {
      newErrors.severity = 'Please select an incident severity level.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTimeout(() => {
        if (newErrors.description) {
          document.getElementById('field-description')?.focus();
        } else if (newErrors.severity) {
          const firstRadio =
            document.querySelector('[role="radiogroup"] [role="radio"]') ||
            document.querySelector('[role="radiogroup"] button');
          firstRadio?.focus();
        }
      }, 50);
      return;
    }

    setErrors({});
    setCurrentStep('confirm');
  };

  // ----------------------------------------------------
  // Step 3 Submission
  // ----------------------------------------------------
  const handleSubmitReport = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        latitude: formData.latitude,
        longitude: formData.longitude,
        description: formData.description.trim(),
        severity: formData.severity,
      };

      if (formData.address && formData.address.trim()) {
        payload.address = formData.address.trim();
      }

      const response = await createIncident(payload);

      // Handle response envelope: { data: { incident, station } } or direct { data: incident }
      const incidentData = response?.data?.incident || response?.data || {};
      const stationData = response?.data?.station || incidentData?.station || null;

      const incidentId = incidentData.id || response?.data?.id;
      const stationName = stationData?.name || (stationData ? String(stationData) : null);

      const result = {
        id: incidentId,
        stationName: stationName || 'Assigned shortly',
      };

      setSubmissionResult(result);
      setCurrentStep('success');
      setTimeout(() => {
        document.getElementById('success-heading')?.focus();
      }, 50);

      if (onSubmitted) {
        onSubmitted(result);
      }
    } catch (err) {
      setSubmitError(
        err.message || 'Failed to submit incident report. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Reset Form
  // ----------------------------------------------------
  const handleReset = () => {
    setFormData({
      latitude: null,
      longitude: null,
      address: '',
      description: '',
      severity: '',
    });
    setGeoLoading(false);
    setGeoError(null);
    setShowManualLocation(false);
    setErrors({});
    setSubmitError(null);
    setSubmissionResult(null);
    setCurrentStep('location');
  };

  // Allow clicking completed steps in Stepper
  const handleStepClick = (targetKey) => {
    if (currentStep === 'success') return;
    if (targetKey === 'location') {
      setCurrentStep('location');
    } else if (targetKey === 'details' && currentStep === 'confirm') {
      setCurrentStep('details');
    }
  };

  // ====================================================
  // Render: Confirmation Screen (Success)
  // ====================================================
  if (currentStep === 'success' && submissionResult) {
    return (
      <div className={styles.successRoot} role="region" aria-label="Report Confirmation">
        <div className={styles.successIconWrap}>
          <CheckCircle size={48} className={styles.successIcon} aria-hidden="true" />
        </div>

        <h2 id="success-heading" tabIndex={-1} className={styles.successHeading} style={{ outline: 'none' }}>
          Report Submitted Successfully
        </h2>
        <p className={styles.successSubheading}>
          Emergency response has been initiated. Nearby stations have been notified.
        </p>

        <div className={styles.confirmationCard}>
          <div className={styles.confirmRow}>
            <span className={styles.confirmLabel}>Incident Reference:</span>
            <span className={styles.confirmValueId}>#{submissionResult.id}</span>
          </div>
          <div className={styles.confirmRow}>
            <span className={styles.confirmLabel}>Assigned Fire Station:</span>
            <span className={styles.confirmValue}>
              {submissionResult.stationName === 'Assigned shortly' ? (
                <span className={styles.pendingStation}>Assigned shortly</span>
              ) : (
                <strong>{submissionResult.stationName}</strong>
              )}
            </span>
          </div>
          <div className={styles.confirmRow}>
            <span className={styles.confirmLabel}>Severity:</span>
            <Badge variant="severity" value={formData.severity} />
          </div>
        </div>

        <div className={styles.noticeBox} role="note">
          <AlertCircle size={18} className={styles.noticeIcon} aria-hidden="true" />
          <span>Call 101 or 112 if anyone is in danger. FERMS does not replace emergency calls.</span>
        </div>

        <div className={styles.successActions}>
          <Button
            as={Link}
            to="/my-reports"
            variant="primary"
            size="lg"
            className={styles.actionBtn}
          >
            My Reports
          </Button>

          <Button
            type="button"
            onClick={handleReset}
            variant="ghost"
            size="lg"
            className={styles.actionBtn}
          >
            <RotateCcw size={16} aria-hidden="true" />
            <span>Report another</span>
          </Button>
        </div>
      </div>
    );
  }

  // ====================================================
  // Render: Multi-Step Form
  // ====================================================
  const hasCoords = formData.latitude != null && formData.longitude != null;

  return (
    <div className={styles.formRoot}>
      {/* Stepper Navigation */}
      <Stepper
        steps={STEPS}
        currentKey={currentStep}
        onStepClick={handleStepClick}
        className={styles.stepper}
      />

      {/* Global submit error */}
      {submitError && (
        <div className={styles.alertError} role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ---------------------------------------------- */}
      {/* STEP 1: Location                               */}
      {/* ---------------------------------------------- */}
      {currentStep === 'location' && (
        <section aria-labelledby="step1-heading" className={styles.stepSection}>
          <div className={styles.stepHeader}>
            <h2 id="step1-heading" className={styles.stepTitle}>
              01 &middot; Incident Location
            </h2>
            <p className={styles.stepDesc}>
              Provide the exact coordinates so nearest fire stations can be dispatched.
            </p>
          </div>

          {/* Use my location button */}
          <div className={styles.geoButtonRow}>
            <Button
              type="button"
              variant={hasCoords && !showManualLocation ? 'dark' : 'primary'}
              size="lg"
              loading={geoLoading}
              onClick={handleUseMyLocation}
              className={styles.geoBtn}
              id="btn-use-location"
              aria-describedby={errors.location && !showManualLocation ? 'geo-location-error' : undefined}
              aria-invalid={errors.location && !showManualLocation ? 'true' : undefined}
            >
              <Navigation size={18} aria-hidden="true" />
              <span>{hasCoords ? 'Update my GPS location' : 'Use my location'}</span>
            </Button>

            {!showManualLocation && (
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setShowManualLocation(true)}
                className={styles.manualToggleBtn}
              >
                Or enter address & pin map manually
              </Button>
            )}
          </div>

          {/* Geolocation status / error */}
          {geoError && (
            <div className={styles.geoErrorBox} role="alert">
              <AlertTriangle size={18} className={styles.warnIcon} aria-hidden="true" />
              <div>
                <strong>Location not detected:</strong> {geoError}
              </div>
            </div>
          )}

          {/* Location detected successfully indicator */}
          {hasCoords && !showManualLocation && (
            <div className={styles.detectedBox}>
              <div className={styles.detectedHeader}>
                <CheckCircle size={18} className={styles.successCheck} aria-hidden="true" />
                <span className={styles.detectedTitle}>GPS Coordinates Detected</span>
              </div>
              <p className={styles.detectedCoords}>
                Latitude: <strong>{formData.latitude.toFixed(6)}</strong> &middot; Longitude:{' '}
                <strong>{formData.longitude.toFixed(6)}</strong>
              </p>

              {/* Optional landmark note */}
              <div className={styles.optionalAddress}>
                <FormField
                  label="Apartment, building or landmark (optional)"
                  name="address"
                  id="field-address-gps"
                  placeholder="e.g. 3rd floor, Tower B, near City Hospital"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                />
              </div>

              <button
                type="button"
                className={styles.textLink}
                onClick={() => setShowManualLocation(true)}
              >
                Adjust coordinates on map
              </button>
            </div>
          )}

          {/* Manual Location: Address Field + Map Picker */}
          {showManualLocation && (
            <div className={styles.manualSection}>
              <FormField
                label="Street address or landmark"
                name="address"
                id="field-address-manual"
                required={true}
                placeholder="e.g. 42 MG Road, Bandra West, Mumbai"
                value={formData.address}
                error={errors.address}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, address: e.target.value }));
                  if (errors.address) {
                    setErrors((prev) => ({ ...prev, address: null }));
                  }
                }}
              />

              <div className={styles.mapField}>
                <label className={styles.fieldLabel}>
                  Pin Location on Map <span className={styles.requiredMark}>*</span>
                </label>
                <LocationPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onChange={handleManualMapChange}
                  error={errors.location}
                />
              </div>
            </div>
          )}

          {/* Error if user didn't pick coordinates */}
          {errors.location && !showManualLocation && (
            <p id="geo-location-error" className={styles.fieldError} role="alert">
              {errors.location}
            </p>
          )}

          {/* Navigation Controls */}
          <div className={styles.navRow}>
            <div />
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleNextFromLocation}
              className={styles.navBtn}
              id="btn-next-location"
            >
              <span>Next: Details</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </div>
        </section>
      )}

      {/* ---------------------------------------------- */}
      {/* STEP 2: Details                                */}
      {/* ---------------------------------------------- */}
      {currentStep === 'details' && (
        <section aria-labelledby="step2-heading" className={styles.stepSection}>
          <div className={styles.stepHeader}>
            <h2 id="step2-heading" className={styles.stepTitle}>
              02 &middot; Incident Details
            </h2>
            <p className={styles.stepDesc}>
              Describe the emergency and select the severity to assist response teams.
            </p>
          </div>

          {/* Description field with live character counter */}
          <div className={styles.descFieldWrapper}>
            <FormField
              label="Incident Description"
              name="description"
              id="field-description"
              required={true}
              error={errors.description}
            >
              <textarea
                id="field-description"
                name="description"
                rows={5}
                maxLength={2000}
                placeholder="Describe what is on fire, smoke conditions, trapped persons, or nearby hazards..."
                value={formData.description}
                className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, description: e.target.value }));
                  if (errors.description) {
                    setErrors((prev) => ({ ...prev, description: null }));
                  }
                }}
              />
            </FormField>
            <div className={styles.charCounter} aria-live="polite">
              {formData.description.length} / 2000 characters
            </div>
          </div>

          {/* Severity Picker */}
          <div className={styles.severitySection}>
            <label className={styles.fieldLabel}>
              Incident Severity <span className={styles.requiredMark}>*</span>
            </label>
            <SeverityPicker
              value={formData.severity}
              onChange={(key) => {
                setFormData((prev) => ({ ...prev, severity: key }));
                if (errors.severity) {
                  setErrors((prev) => ({ ...prev, severity: null }));
                }
              }}
              error={errors.severity}
            />
          </div>

          {/* Navigation Controls */}
          <div className={styles.navRow}>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setCurrentStep('location')}
              className={styles.backBtn}
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span>Back</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleNextFromDetails}
              className={styles.navBtn}
              id="btn-next-details"
            >
              <span>Next: Review & Confirm</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </div>
        </section>
      )}

      {/* ---------------------------------------------- */}
      {/* STEP 3: Confirm & Review                       */}
      {/* ---------------------------------------------- */}
      {currentStep === 'confirm' && (
        <section aria-labelledby="step3-heading" className={styles.stepSection}>
          <div className={styles.stepHeader}>
            <h2 id="step3-heading" className={styles.stepTitle}>
              03 &middot; Review and Confirm
            </h2>
            <p className={styles.stepDesc}>
              Please verify all details before submitting the emergency report.
            </p>
          </div>

          {/* Summary Box */}
          <div className={styles.summaryContainer}>
            {/* Location Summary */}
            <div className={styles.summarySection}>
              <div className={styles.summarySectionHeader}>
                <MapPin size={18} className={styles.summaryIcon} aria-hidden="true" />
                <h3 className={styles.summaryHeading}>Location</h3>
              </div>
              <div className={styles.summaryDetails}>
                <p>
                  <strong>Coordinates:</strong> Lat {formData.latitude?.toFixed(6)}, Lon{' '}
                  {formData.longitude?.toFixed(6)}
                </p>
                {formData.address ? (
                  <p>
                    <strong>Address:</strong> {formData.address}
                  </p>
                ) : (
                  <p className={styles.summaryMuted}>Address: Not specified (GPS pinned)</p>
                )}
              </div>
            </div>

            {/* Severity Summary */}
            <div className={styles.summarySection}>
              <div className={styles.summarySectionHeader}>
                <AlertTriangle size={18} className={styles.summaryIcon} aria-hidden="true" />
                <h3 className={styles.summaryHeading}>Severity</h3>
              </div>
              <div className={styles.summaryDetails}>
                <Badge variant="severity" value={formData.severity} />
              </div>
            </div>

            {/* Description Summary */}
            <div className={styles.summarySection}>
              <div className={styles.summarySectionHeader}>
                <FileText size={18} className={styles.summaryIcon} aria-hidden="true" />
                <h3 className={styles.summaryHeading}>Description</h3>
              </div>
              <div className={styles.summaryDetails}>
                <p className={styles.descriptionText}>{formData.description}</p>
              </div>
            </div>
          </div>

          {/* Safety Notice Reminder */}
          <div className={styles.noticeBox} role="note">
            <AlertCircle size={18} className={styles.noticeIcon} aria-hidden="true" />
            <span>
              Call 101 or 112 if anyone is in danger. FERMS does not replace emergency calls.
            </span>
          </div>

          {/* Navigation Controls */}
          <div className={styles.navRow}>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={isSubmitting}
              onClick={() => setCurrentStep('details')}
              className={styles.backBtn}
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span>Back</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              onClick={handleSubmitReport}
              className={styles.submitBtn}
              id="btn-send-report"
            >
              <span>Send report</span>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
