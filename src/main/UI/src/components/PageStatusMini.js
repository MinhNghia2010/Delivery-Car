import React, { useState, useMemo } from "react";
import "../css/PageStatusMini.css";

// --- COMPONENT HÀNG (ĐÃ SỬA LỖI CRASH) ---
const DeviceRow = ({ device }) => {
  // Hàm phụ trợ để format số an toàn (tránh lỗi .toFixed of undefined)
  const safeFixed = (val, digits = 2) => {
    if (val === null || val === undefined || isNaN(val)) return "0.00";
    return Number(val).toFixed(digits);
  };

  return (
    <tr>
      {/* 1. Tên xe */}
      <td>{device.name || device.vehicleId || "N/A"}</td>

      {/* 2. Trạng thái */}
      <td>
        <span className={`status-pill status-${device.status?.toLowerCase()}`}>
          {device.status || "UNKNOWN"}
        </span>
      </td>

      {/* 3. Vị trí (X, Y, Z) - Đã bọc lỗi cho Z */}
      <td>
        {device.x != null && device.y != null ? (
          <div className="position-cell">
            <span>{`x: ${safeFixed(device.x)}`}</span>
            <span>{`y: ${safeFixed(device.y)}`}</span>
            {/* 🔥 QUAN TRỌNG: Nếu thiếu Z thì mặc định là 0.00 để không sập web */}
            <span>{`z: ${safeFixed(device.z || 0)}`}</span>
          </div>
        ) : (
          "N/A"
        )}
      </td>

      {/* 4. Tốc độ */}
      <td>
        {device.speed != null ? `${safeFixed(device.speed)} m/s` : "N/A"}
      </td>

      {/* 5. Pin */}
      <td>
        <div className="battery-cell">
          {device.battery != null ? (
            <span style={{ 
                color: device.battery < 20 ? 'red' : 'inherit', 
                fontWeight: device.battery < 20 ? 'bold' : 'normal'
            }}>
                {safeFixed(device.battery, 0)}%
                {device.isCharging === 1 && " ⚡"}
            </span>
          ) : (
            "N/A"
          )}
        </div>
      </td>
    </tr>
  );
};

// --- COMPONENT CHÍNH (GIỮ NGUYÊN LOGIC, CHỈ FORMAT LẠI CHO ĐẸP) ---
const DevicePage = React.memo(({ devices }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const stats = useMemo(() => {
    const deviceList = Object.values(devices);
    return {
      total: deviceList.length,
      idle: deviceList.filter((d) => d.status === "IDLE").length,
      inTask: deviceList.filter((d) => d.status === "MOVING").length,
      charging: deviceList.filter((d) => d.isCharging === 1).length,
      failed: deviceList.filter((d) => d.status === "ERROR").length,
      offline: deviceList.filter((d) => d.status === "OFFLINE").length,
    };
  }, [devices]);

  const sortedDevices = useMemo(() => {
    return Object.values(devices).sort((a, b) =>
      (a.vehicleId || "").localeCompare(b.vehicleId || "")
    );
  }, [devices]);

  const filteredDevices = useMemo(() => {
    if (!searchTerm) {
      return sortedDevices;
    }
    return sortedDevices.filter((device) =>
      device.vehicleId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedDevices, searchTerm]);

  const paginatedDevices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDevices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDevices, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);

  return (
    <div id="device-content" className="sidebar-content active-content">
      <div className="dashboard-header">
        <div className="dashboard-tags-grid">
          <span className="dashboard-tag tag-total">
            Total Devices: <span>{stats.total}</span>
          </span>
          <span className="dashboard-tag tag-idle">
            Idle: <span>{stats.idle}</span>
          </span>
          <span className="dashboard-tag tag-intask">
            In Task: <span>{stats.inTask}</span>
          </span>
          <span className="dashboard-tag tag-charging">
            Charging: <span>{stats.charging}</span>
          </span>
          <span className="dashboard-tag tag-failed">
            Failed: <span>{stats.failed}</span>
          </span>
          <span className="dashboard-tag tag-offline">
            Offline: <span>{stats.offline}</span>
          </span>
        </div>
        <input
          type="text"
          className="dashboard-search-input"
          placeholder="Search devices by ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="dashboard-table-wrapper">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Vehicle ID</th>
              <th>Status</th>
              <th>Position</th>
              <th>Speed</th>
              <th>Battery</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDevices.length > 0 ? (
              paginatedDevices.map((device) => (
                <DeviceRow key={device.vehicleId} device={device} />
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-data-cell">
                  No devices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="dashboard-pagination">
          <button
            className="pagination-button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
});

export default DevicePage;