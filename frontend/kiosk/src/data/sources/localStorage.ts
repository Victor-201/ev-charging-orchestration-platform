import { StationRepositoryImpl } from "../repositories/StationRepositoryImpl";

export let STATION_ID = new URLSearchParams(window.location.search).get('stationId') ||
  localStorage.getItem('kiosk-station-id') ||
  import.meta.env.VITE_STATION_ID ||
  '55555555-0000-4000-8000-000000000168';

export let POINT_ID = new URLSearchParams(window.location.search).get('pointId') ||
  localStorage.getItem('kiosk-point-id') ||
  import.meta.env.VITE_POINT_ID ||
  '';

export let CHARGER_ID = new URLSearchParams(window.location.search).get('chargerId') ||
  localStorage.getItem('kiosk-charger-id') ||
  import.meta.env.VITE_CHARGER_ID ||
  '';

export function setStationId(id: string) {
  STATION_ID = id;
  localStorage.setItem('kiosk-station-id', id);
}

export function setChargerId(id: string, pointId?: string) {
  CHARGER_ID = id;
  localStorage.setItem('kiosk-charger-id', id);
  if (pointId) {
    POINT_ID = pointId;
    localStorage.setItem('kiosk-point-id', pointId);
  }
}

export function resetKioskIdentifiers() {
  localStorage.removeItem('kiosk-station-id');
  localStorage.removeItem('kiosk-point-id');
  localStorage.removeItem('kiosk-charger-id');
}

export async function resolveKioskIdentifiers(): Promise<{ stationId: string; pointId: string; chargerId: string }> {
  if (!CHARGER_ID && POINT_ID) {
    try {
      const stationRepo = new StationRepositoryImpl();
      const chargers = await stationRepo.getStationChargers(STATION_ID);
      const matched = chargers.find(c => c.id === POINT_ID);
      if (matched?.connectors?.length) {
        setChargerId(matched.connectors[0].id);
      }
    } catch {
      console.warn('[Kiosk] Could not resolve POINT_ID to connector');
    }
  }
  return { stationId: STATION_ID, pointId: POINT_ID, chargerId: CHARGER_ID };
}
