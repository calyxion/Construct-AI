import axios from 'axios';

const API_BASE = '/api';
const DIRECT_BACKEND = 'http://localhost:8000/api';

// Helper to attempt proxy first, then direct localhost backend
const request = async (endpoint, options = {}) => {
  try {
    const res = await axios({ url: `${API_BASE}${endpoint}`, ...options });
    return res.data;
  } catch (err) {
    try {
      const res2 = await axios({ url: `${DIRECT_BACKEND}${endpoint}`, ...options });
      return res2.data;
    } catch (err2) {
      console.warn(`[API] Failed to fetch ${endpoint}:`, err2.message);
      return null;
    }
  }
};

export const fetchMetrics = async () => {
  const data = await request('/metrics');
  return data;
};

export const fetchEvents = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const data = await request(`/events${q ? `?${q}` : ''}`);
  return data || [];
};

export const updateEventStatus = async (eventId, status) => {
  try {
    const res = await axios.patch(`${API_BASE}/events/${eventId}/status`, { status });
    return res.data;
  } catch (err) {
    try {
      const res2 = await axios.patch(`${DIRECT_BACKEND}/events/${eventId}/status`, { status });
      return res2.data;
    } catch (err2) {
      console.warn(`[API] Failed to update event ${eventId}:`, err2.message);
      return null;
    }
  }
};

export const bulkUpdateEventStatus = async (eventIds, status) => {
  return await request('/events/bulk/status', {
    method: 'PATCH',
    data: { event_ids: eventIds, status },
  });
};

export const fetchHealth = async () => {
  const data = await request('/health');
  return data;
};

export const fetchWorkers = async () => {
  const data = await request('/workforce');
  return data || [];
};

export const registerWorker = async (workerData) => {
  return await request('/workforce/register', {
    method: 'POST',
    data: workerData,
  });
};

export const exportEventsCSV = () => {
  window.open('http://localhost:8000/api/events/export/csv', '_blank');
};
export const fetchZones = async () => {
  const data = await request('/zones');
  return data || [];
};

export const fetchWorkforceSummary = async () => {
  const data = await request('/workforce/summary');
  return data;
};

export const fetchWorkforceWorkers = async (filters = {}) => {
  const q = new URLSearchParams(filters).toString();
  const data = await request(`/workforce/workers${q ? `?${q}` : ''}`);
  return data || [];
};

export const fetchWorkforceZonesOccupancy = async () => {
  const data = await request('/workforce/zones-occupancy');
  return data || [];
};

export const uploadAndAnalyzeImage = async (file, cameraId = 'UPLOAD-CAM', zoneId = 'ZONE-A') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('camera_id', cameraId);
  formData.append('zone_id', zoneId);
  formData.append('record_events', 'true');

  try {
    const res = await axios.post(`${API_BASE}/analyze-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err) {
    try {
      const res2 = await axios.post(`${DIRECT_BACKEND}/analyze-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res2.data;
    } catch (err2) {
      console.warn('[API] Upload analyze failed:', err2.message);
      throw err2;
    }
  }
};

export const uploadVideoFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await axios.post(`${API_BASE}/upload-video`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err) {
    try {
      const res2 = await axios.post(`${DIRECT_BACKEND}/upload-video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res2.data;
    } catch (err2) {
      console.warn('[API] Video upload failed:', err2.message);
      throw err2;
    }
  }
};

// WebSocket auto-reconnecting client
export function createWebSocket(onMessage, onStatusChange) {
  let ws = null;
  let reconnectTimer = null;
  let alive = true;

  const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/events`;
  const directWsUrl = 'ws://localhost:8000/ws/events';

  function connect(useDirect = false) {
    const url = useDirect ? directWsUrl : wsUrl;
    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        onStatusChange?.('connected');
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onMessage?.(data);
        } catch (err) {
          console.warn('[WS] parse error', err);
        }
      };

      ws.onerror = () => {
        onStatusChange?.('error');
        if (!useDirect) {
          // Retry direct ws
          setTimeout(() => connect(true), 1000);
        }
      };

      ws.onclose = () => {
        onStatusChange?.('disconnected');
        if (alive) {
          reconnectTimer = setTimeout(() => connect(useDirect), 3000);
        }
      };
    } catch (err) {
      onStatusChange?.('disconnected');
      if (alive) {
        reconnectTimer = setTimeout(() => connect(true), 3000);
      }
    }
  }

  connect(false);

  return {
    send: (data) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(data)),
    close: () => {
      alive = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}

// Pre-packaged Scenario Data for demonstration / hackathon offline presentation
export const SCENARIO_DATA = {
  scenario_1: {
    name: 'SAFE (Full Compliance)',
    description: 'All 4 workers equipped with required PPE. No zone intrusions.',
    metrics: {
      workers: 4,
      active_workers: 4,
      ppe_compliance: 100.0,
      active_alerts: 0,
      high_risk_zones: 0,
      safety_score: 98.5,
      total_events_today: 1
    },
    workers: [
      { worker_id: 'W-101', name: 'Marcus Vance', helmet_present: true, vest_present: true, current_zone: 'Zone A - Assembly', status: 'ACTIVE', risk_level: 'SAFE' },
      { worker_id: 'W-102', name: 'Elena Rostova', helmet_present: true, vest_present: true, current_zone: 'Zone B - Fabrication', status: 'ACTIVE', risk_level: 'SAFE' },
      { worker_id: 'W-103', name: 'David Chen', helmet_present: true, vest_present: true, current_zone: 'Zone A - Assembly', status: 'ACTIVE', risk_level: 'SAFE' },
      { worker_id: 'W-104', name: 'Sarah Jenkins', helmet_present: true, vest_present: true, current_zone: 'Zone C - Scaffolding', status: 'ACTIVE', risk_level: 'SAFE' }
    ],
    alerts: [],
    riskStatus: {
      overall_score: 98,
      risk_level: 'SAFE',
      recommendations: ["Site safety parameters optimal. All active personnel adhering to PPE protocols."],
      breakdown: { missing_helmet_penalties: 0, missing_vest_penalties: 0, restricted_zone_penalties: 0, fall_penalties: 0 }
    }
  },
  scenario_2: {
    name: 'NO HELMET Violation',
    description: 'Worker W-102 detected entering fabrication area without hardhat.',
    metrics: {
      workers: 4,
      active_workers: 4,
      ppe_compliance: 75.0,
      active_alerts: 1,
      high_risk_zones: 1,
      safety_score: 82.0,
      total_events_today: 4
    },
    workers: [
      { worker_id: 'W-101', name: 'Marcus Vance', helmet_present: true, vest_present: true, current_zone: 'Zone A - Assembly', status: 'ACTIVE', risk_level: 'SAFE' },
      { worker_id: 'W-102', name: 'Elena Rostova', helmet_present: false, vest_present: true, current_zone: 'Zone B - Fabrication', status: 'ACTIVE', risk_level: 'HIGH' },
      { worker_id: 'W-103', name: 'David Chen', helmet_present: true, vest_present: true, current_zone: 'Zone A - Assembly', status: 'ACTIVE', risk_level: 'SAFE' },
      { worker_id: 'W-104', name: 'Sarah Jenkins', helmet_present: true, vest_present: true, current_zone: 'Zone C - Scaffolding', status: 'ACTIVE', risk_level: 'SAFE' }
    ],
    alerts: [
      {
        id: 'EVT-001',
        event_type: 'NO_HELMET',
        severity: 'HIGH',
        worker_id: 'W-102 (Elena Rostova)',
        zone: 'Zone B - Fabrication',
        timestamp: new Date().toISOString(),
        confidence: 0.94,
        status: 'OPEN',
        recommendation: 'Issue instant audio warning and dispatch safety supervisor to Zone B.'
      }
    ],
    riskStatus: {
      overall_score: 82,
      risk_level: 'MODERATE',
      recommendations: ["Require immediate PPE compliance in Zone B Fabrication before resuming machinery operations."],
      breakdown: { missing_helmet_penalties: 15, missing_vest_penalties: 0, restricted_zone_penalties: 0, fall_penalties: 0 }
    }
  },
  scenario_3: {
    name: 'RESTRICTED ZONE Breach',
    description: 'Worker W-103 entered Crane Swing Radius geofence perimeter.',
    metrics: {
      workers: 4,
      active_workers: 4,
      ppe_compliance: 80.0,
      active_alerts: 2,
      high_risk_zones: 2,
      safety_score: 68.0,
      total_events_today: 7
    },
    workers: [
      { worker_id: 'W-101', name: 'Marcus Vance', helmet_present: true, vest_present: true, current_zone: 'Zone A - Assembly', status: 'ACTIVE', risk_level: 'SAFE' },
      { worker_id: 'W-102', name: 'Elena Rostova', helmet_present: true, vest_present: true, current_zone: 'Zone B - Fabrication', status: 'ACTIVE', risk_level: 'SAFE' },
      { worker_id: 'W-103', name: 'David Chen', helmet_present: true, vest_present: true, current_zone: 'DANGER ZONE: Crane Radius', status: 'ACTIVE', risk_level: 'CRITICAL' },
      { worker_id: 'W-104', name: 'Sarah Jenkins', helmet_present: true, vest_present: false, current_zone: 'Zone C - Scaffolding', status: 'ACTIVE', risk_level: 'HIGH' }
    ],
    alerts: [
      {
        id: 'EVT-002',
        event_type: 'RESTRICTED_ENTRY',
        severity: 'CRITICAL',
        worker_id: 'W-103 (David Chen)',
        zone: 'DANGER ZONE: Crane Radius',
        timestamp: new Date().toISOString(),
        confidence: 0.98,
        status: 'OPEN',
        recommendation: 'Sound acoustic siren. Crane operator interlock trigger activated.'
      },
      {
        id: 'EVT-003',
        event_type: 'NO_VEST',
        severity: 'MEDIUM',
        worker_id: 'W-104 (Sarah Jenkins)',
        zone: 'Zone C - Scaffolding',
        timestamp: new Date().toISOString(),
        confidence: 0.89,
        status: 'OPEN',
        recommendation: 'Provide high-visibility reflective vest prior to scaffolding work.'
      }
    ],
    riskStatus: {
      overall_score: 68,
      risk_level: 'HIGH',
      recommendations: ["CRITICAL: Immediate evacuation required from Crane Swing Radius perimeter."],
      breakdown: { missing_helmet_penalties: 0, missing_vest_penalties: 10, restricted_zone_penalties: 22, fall_penalties: 0 }
    }
  },
  scenario_4: {
    name: 'CRITICAL WORKER FALL',
    description: 'Worker W-104 fall vector detected near Scaffolding platform edge.',
    metrics: {
      workers: 4,
      active_workers: 4,
      ppe_compliance: 65.0,
      active_alerts: 3,
      high_risk_zones: 2,
      safety_score: 42.0,
      total_events_today: 11
    },
    workers: [
      { worker_id: 'W-101', name: 'Marcus Vance', helmet_present: true, vest_present: true, current_zone: 'Zone A - Assembly', status: 'ACTIVE', risk_level: 'SAFE' },
      { worker_id: 'W-102', name: 'Elena Rostova', helmet_present: true, vest_present: true, current_zone: 'Zone B - Fabrication', status: 'ACTIVE', risk_level: 'SAFE' },
      { worker_id: 'W-103', name: 'David Chen', helmet_present: true, vest_present: true, current_zone: 'Zone A - Assembly', status: 'ACTIVE', risk_level: 'SAFE' },
      { worker_id: 'W-104', name: 'Sarah Jenkins', helmet_present: false, vest_present: false, current_zone: 'Zone C - Scaffolding Edge', status: 'ALERT', risk_level: 'CRITICAL' }
    ],
    alerts: [
      {
        id: 'EVT-004',
        event_type: 'POSSIBLE_FALL',
        severity: 'CRITICAL',
        worker_id: 'W-104 (Sarah Jenkins)',
        zone: 'Zone C - Scaffolding Edge',
        timestamp: new Date().toISOString(),
        confidence: 0.96,
        status: 'OPEN',
        recommendation: 'EMERGENCY MEDICAL DISPATCH! Fall vector displacement confirmed on Camera #01.'
      },
      {
        id: 'EVT-005',
        event_type: 'NO_HELMET',
        severity: 'HIGH',
        worker_id: 'W-104 (Sarah Jenkins)',
        zone: 'Zone C - Scaffolding Edge',
        timestamp: new Date().toISOString(),
        confidence: 0.91,
        status: 'OPEN',
        recommendation: 'Hardhat dislodged upon impact.'
      }
    ],
    riskStatus: {
      overall_score: 42,
      risk_level: 'CRITICAL',
      recommendations: ["EMERGENCY RESPONSE PROTOCOL ACTIVE. Notify on-site paramedic team immediately."],
      breakdown: { missing_helmet_penalties: 15, missing_vest_penalties: 10, restricted_zone_penalties: 0, fall_penalties: 33 }
    }
  }
};


