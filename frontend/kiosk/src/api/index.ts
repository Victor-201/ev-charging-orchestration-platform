/**
 * EVOLTTOUCH Kiosk — API Client
 *
 * Integrates with Kong Gateway at VITE_API_BASE_URL.
 * Endpoints mapped from: 02_api_endpoints.md
 */

import axios from 'axios';
import type {
  ChargingSession,
  StopSessionResponse,
  PricingInfo,
  PaymentCreateResponse,
  ChargerState,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export let STATION_ID = new URLSearchParams(window.location.search).get('stationId') ||
  import.meta.env.VITE_STATION_ID ||
  '55555555-0000-4000-8000-000000000168';

export let POINT_ID = new URLSearchParams(window.location.search).get('pointId') ||
  import.meta.env.VITE_POINT_ID ||
  'cccccccc-0000-4000-8000-000000001011';

export let CHARGER_ID = new URLSearchParams(window.location.search).get('chargerId') ||
  import.meta.env.VITE_CHARGER_ID ||
  'c0c0c0c0-0000-4000-8000-000000001607';

// Axios instance — kiosk runs as a "system" client (no user JWT for walk-in)
const http = axios.create({
  baseURL: API_BASE,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set dynamic header on every request
http.interceptors.request.use((config) => {
  if (config.headers) {
    config.headers['X-Kiosk-Device'] = CHARGER_ID;
  }
  return config;
});

// Function to dynamically initialize and resolve IDs if POINT_ID is used instead of CHARGER_ID
export async function resolveKioskIdentifiers(): Promise<{ stationId: string; pointId: string; chargerId: string }> {
  // If POINT_ID is a point and CHARGER_ID is not set or is identical to POINT_ID or is empty/default
  if (POINT_ID && POINT_ID.startsWith('cccccccc') && (CHARGER_ID === POINT_ID || CHARGER_ID.startsWith('cccccccc') || !CHARGER_ID || CHARGER_ID === 'CHG-001-A')) {
    try {
      // Fetch chargers for this station to resolve the connector
      const { data } = await http.get<any[]>(`/stations/${STATION_ID}/chargers`);
      const matchedPoint = data.find((p: any) => p.id === POINT_ID);
      if (matchedPoint && matchedPoint.connectors && matchedPoint.connectors.length > 0) {
        CHARGER_ID = matchedPoint.connectors[0].id;
        console.log(`[Kiosk] Resolved POINT_ID ${POINT_ID} to connector ${CHARGER_ID}`);
      }
    } catch (err) {
      console.warn(`[Kiosk] Could not resolve POINT_ID to connector via backend, using fallback:`, err);
      // Fallback mapping for HCM station 1
      if (POINT_ID === 'cccccccc-0000-4000-8000-000000001011') {
        CHARGER_ID = 'c0c0c0c0-0000-4000-8000-000000001607';
      }
    }
  }
  return { stationId: STATION_ID, pointId: POINT_ID, chargerId: CHARGER_ID };
}

// ---- Session Service ----

/**
 * [API #67] GET /charging/charger/:chargerId/active
 * Check if this charger has an active session (to resume display).
 * Auth: Bearer Admin/Staff — kiosk uses system token or public fallback.
 */
export async function getActiveSession(): Promise<ChargingSession | null> {
  try {
    const { data } = await http.get<ChargingSession>(
      `/charging/charger/${CHARGER_ID}/active`
    );
    return data;
  } catch {
    return null;
  }
}

/**
 * [API #62] POST /charging/start
 * Start a walk-in charging session (no booking required).
 * Body: { chargerId }
 */
export async function startChargingSession(
  bookingId?: string,
  qrToken?: string
): Promise<ChargingSession> {
  const { data } = await http.post<ChargingSession>('/charging/start', {
    chargerId: CHARGER_ID,
    ...(bookingId && { bookingId }),
    ...(qrToken && { qrToken }),
    startMeterWh: 0,
  });
  return data;
}

/**
 * [API #63] POST /charging/stop/:id
 * Stop the active session (user self-service from kiosk).
 */
export async function stopChargingSession(
  sessionId: string,
  endMeterWh?: number
): Promise<StopSessionResponse> {
  const { data } = await http.post<StopSessionResponse>(
    `/charging/stop/${sessionId}`,
    {
      ...(endMeterWh !== undefined && { endMeterWh }),
      reason: 'kiosk_user_stop',
    }
  );
  return data;
}

/**
 * [API #66] GET /charging/session/:id
 * Get full session details.
 */
export async function getSession(sessionId: string): Promise<ChargingSession> {
  const { data } = await http.get<ChargingSession>(`/charging/session/${sessionId}`);
  return data;
}

// ---- Infrastructure Service ----

/**
 * [API #43] GET /stations/:stationId/chargers/:chargerId/pricing
 * Fetch current pricing for the kiosk's connector.
 */
export async function getPricing(connectorType = 'CCS'): Promise<PricingInfo> {
  const now = new Date().toISOString();
  const { data } = await http.get<PricingInfo>(
    `/stations/${STATION_ID}/chargers/${CHARGER_ID}/pricing`,
    {
      params: {
        connectorType,
        startTime: now,
        endTime: now,
      },
    }
  );
  return data;
}

// ---- Billing Service ----

/**
 * [API #69] POST /payments/create
 * Generate a VNPay QR payment URL for walk-in guest payment.
 */
export async function createVnpayPayment(
  amount: number,
  sessionId?: string
): Promise<PaymentCreateResponse> {
  const { data } = await http.post<PaymentCreateResponse>('/payments/create', {
    bookingId: sessionId,
    amount,
    ipAddr: '127.0.0.1',
  });
  return data;
}

// ---- Charger State (CQRS read model) ----

/**
 * Mock read of charger state — in real env, this comes from a
 * dedicated internal endpoint or is pushed via WebSocket.
 */
export async function getChargerState(): Promise<ChargerState | null> {
  try {
    const { data } = await http.get<ChargerState>(
      `/stations/${STATION_ID}/chargers/${CHARGER_ID}/state`
    );
    return data;
  } catch {
    return null;
  }
}
