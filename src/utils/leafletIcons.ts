import L from 'leaflet';

/**
 * Custom SVG Leaflet Icons with high-retina sharpness and zero 404 asset bugs.
 */

export function createCafeMarkerIcon(label = 'Meats & Plants') {
  return L.divIcon({
    className: 'custom-cafe-marker',
    html: `
      <div style="position: relative; width: 38px; height: 46px; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 10px rgba(47,125,79,0.35));">
        <svg width="38" height="46" viewBox="0 0 38 46" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 0C8.50659 0 0 8.50659 0 19C0 30.875 16.625 44.5 17.5 45.25C18.375 46 19.625 46 20.5 45.25C21.375 44.5 38 30.875 38 19C38 8.50659 29.4934 0 19 0Z" fill="#2F7D4F"/>
          <circle cx="19" cy="18" r="13" fill="#FFFFFF"/>
          <!-- Plant Leaf Logo Icon -->
          <path d="M19 10C15 13 14 17 14 21C18 21 22 20 24 16C24 12 21 10 19 10Z" fill="#2F7D4F"/>
          <path d="M14 21C16 19 18 17 21 14" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
    `,
    iconSize: [38, 46],
    iconAnchor: [19, 46],
    popupAnchor: [0, -42]
  });
}

export function createStaffMarkerIcon() {
  return L.divIcon({
    className: 'custom-staff-marker',
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; items-center; justify-content: center;">
        <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background-color: rgba(62, 111, 168, 0.25); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 18px; height: 18px; border-radius: 50%; background-color: #3E6FA8; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

export function createPunchMarkerIcon(isEdge = false) {
  const color = isEdge ? '#E8B44A' : '#C0573E';
  return L.divIcon({
    className: 'custom-punch-marker',
    html: `
      <div style="position: relative; width: 28px; height: 36px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25));">
        <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.26801 0 0 6.26801 0 14C0 23.5 12.25 35.25 13.125 35.75C13.625 36 14.375 36 14.875 35.75C15.75 35.25 28 23.5 28 14C28 6.26801 21.732 0 14 0Z" fill="${color}"/>
          <circle cx="14" cy="13" r="8" fill="#FFFFFF"/>
          <circle cx="14" cy="13" r="4" fill="${color}"/>
        </svg>
      </div>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32]
  });
}
