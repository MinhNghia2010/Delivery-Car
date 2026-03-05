// Tổng hợp API
// const BASE_URL = "http://192.168.1.100:8081"; // Ví dụ khi deploy
const BASE_URL = "http://localhost:8081";

// --- CÁC ĐƯỜNG DẪN API ---
export const API_BASE_URL = BASE_URL;

// API cho Robot
export const API_ROBOT = `${BASE_URL}/api/robot`;

// API cho Site (Khu vực)
export const API_SITE = `${BASE_URL}/api/site`;

// API cho Quan hệ Site - Robot (Link/Unlink)
export const API_RELATION = `${BASE_URL}/api/sites`;

// API cho Điểm đỗ (ParkPoint)
export const API_POINT_BASE = `${BASE_URL}/api/point`;

// API cho Xe (Fleet Controller - Dùng cho connection response)
export const API_CARS = `${BASE_URL}/api/cars`;

// Đường dẫn WebSocket
export const WS_URL = `${BASE_URL}/ws`;

// Đường dẫn kết nối khi xe bắt đầu bật : 
export const API_CONNECT_CAR = `${BASE_URL}/api/cars/connection-response`;


// Auth
export const API_AUTH = `${BASE_URL}/api/auth`;
export const API_LOGIN = `${API_AUTH}/login`;

// Order
export const API_ORDERS = `${BASE_URL}/api/orders`;

export const API_ORDERS_ACTIVE = `${API_ORDERS}/active`;
export const API_ORDERS_HISTORY = `${API_ORDERS}/history`;
export const API_ORDER_COMPLETE = (orderId) => `${API_ORDERS}/${orderId}/complete`;

// API GATEWAY (Điều khiển Robot trực tiếp qua Gateway)
export const API_TASKS_CONTROLLER = `${BASE_URL}/api/tasks`;
export const API_GATEWAY_SEND_TASK = `${API_TASKS_CONTROLLER}/send`;
export const API_GATEWAY_PAUSE_TASK = `${API_TASKS_CONTROLLER}/pause`;
export const API_GATEWAY_RESUME_TASK = `${API_TASKS_CONTROLLER}/resume`;
export const API_GATEWAY_CANCEL_TASK = `${API_TASKS_CONTROLLER}/cancel`;

// API để lấy node + control point của map
export const API_DATA_MAP = `${BASE_URL}/api/datamap/upload`;

// Map Library
export const API_MAP_UPLOAD = `${BASE_URL}/api/map-upload/upload`;
export const API_MAP_LIBRARY = `${BASE_URL}/api/map-upload/library`;
export const API_MAP_ASSIGN = `${BASE_URL}/api/map-upload/assign`;
export const API_MAP_ROBOT = (vehicleId) => `${BASE_URL}/api/map-upload/robot/${vehicleId}/map`;
export const API_MAP_DELETE = (id) => `${BASE_URL}/api/map-upload/library/${id}`;