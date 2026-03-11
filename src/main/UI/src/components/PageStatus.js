import React, { useState, useMemo } from "react";
import "../css/PageStatus.css";

// --- 1. COMPONENT HÀNG (ROW) HIỂN THỊ ĐẦY ĐỦ THÔNG TIN ---
const StatusRow = ({ device, index }) => {
  // Hàm format số an toàn (tránh lỗi crash)
  const safeFixed = (val, digits = 2) => {
    if (val === null || val === undefined || isNaN(val)) return "0.00";
    return Number(val).toFixed(digits);
  };

  return (
    <tr>
      {/* 1. STT */}
      <td>{index}</td>
      
      {/* 2. ID */}
      <td style={{ fontWeight: "bold", color: "#007bff" }}>
        {device.vehicleId || "N/A"}
      </td>

      {/* 3. Mode */}
      <td>
        <span className={`badge ${device.driveMode === 'Manual' ? 'bg-warning text-dark' : 'bg-info'}`}>
            {device.driveMode || "--"}
        </span>
      </td>

      {/* 4. Speed */}
      <td>{safeFixed(device.speed)} m/s</td>

      {/* 5. Battery (kèm trạng thái sạc) */}
      <td>
        <span
          style={{
            color: device.battery < 20 ? "red" : "green",
            fontWeight: "bold",
          }}
        >
          {safeFixed(device.battery, 0)}%
        </span>
        {device.isCharging === 1 && <span style={{ color: "#ffc107", fontWeight: "bold" }}> ⚡</span>}
      </td>

      {/* 6. Range (Endurance) */}
      <td>{safeFixed(device.endurance, 1)} km</td>

      {/* 7. Position (X, Y, Z) */}
      <td style={{ fontSize: "12px", fontFamily: "monospace" }}>
        <div>X: {safeFixed(device.x, 0)}</div>
        <div>Y: {safeFixed(device.y, 0)}</div>
        <div>Z: {safeFixed(device.z, 0)}</div>
      </td>

      {/* 8. Yaw */}
      <td>{safeFixed(device.yaw || device.yaw_degrees, 1)}°</td>

      {/* 9. Map & Point */}
      <td>
        <div>🗺 {device.mapName || "--"}</div>
        <div>📍 {device.currentPoint || "--"}</div>
      </td>

      {/* 10. Task Info */}
      <td style={{ fontSize: "12px" }}>
        <div>🆔 {device.taskId || "--"}</div>
        <div>🤖 {device.robotTaskId || "--"}</div>
        <div>🏳 Sts: {device.taskStatus ?? "--"}</div>
      </td>

      {/* 11. Odometer */}
      <td>{safeFixed(device.odometer, 1)} km</td>

      {/* 12. Engine & Status */}
      <td>
        <div style={{ marginBottom: "4px" }}>
            {device.isOpen === 1 ? (
                <span className="badge bg-success">ENG: ON</span>
            ) : (
                <span className="badge bg-secondary">ENG: OFF</span>
            )}
        </div>
      </td>
    </tr>
  );
};

// --- 2. COMPONENT QUẢN LÝ (FILTER & TABLE) ---
const StatusManagementView = ({ devices = {} }) => {
  // State cho các ô input tìm kiếm
  const [searchSerial, setSearchSerial] = useState("");
  const [searchMap, setSearchMap] = useState("");
  const [searchMode, setSearchMode] = useState("");

  // Logic lọc dữ liệu
  const filteredDeviceList = useMemo(() => {
    let list = Object.values(devices);

    // Lọc theo Vehicle ID
    if (searchSerial) {
      const term = searchSerial.toLowerCase().trim();
      list = list.filter((d) => d.vehicleId?.toLowerCase().includes(term));
    }

    // Lọc theo Map Name
    if (searchMap) {
      const term = searchMap.toLowerCase().trim();
      list = list.filter((d) => (d.mapName || "").toLowerCase().includes(term));
    }

    // Lọc theo Mode
    if (searchMode) {
      const term = searchMode.toLowerCase().trim();
      list = list.filter((d) => (d.driveMode || "").toLowerCase().includes(term));
    }

    // Sắp xếp theo ID
    return list.sort((a, b) => (a.vehicleId || "").localeCompare(b.vehicleId || ""));
  }, [devices, searchSerial, searchMap, searchMode]);

  const handleClear = () => {
    setSearchSerial("");
    setSearchMap("");
    setSearchMode("");
  };

  return (
    <>
      <div className="devicePage-filter-container">
        <input
          type="text"
          placeholder="Search ID..."
          value={searchSerial}
          onChange={(e) => setSearchSerial(e.target.value)}
        />
        <input
          type="text"
          placeholder="Search Map..."
          value={searchMap}
          onChange={(e) => setSearchMap(e.target.value)}
        />
        <input
          type="text"
          placeholder="Search Mode..."
          value={searchMode}
          onChange={(e) => setSearchMode(e.target.value)}
        />
        <button
          className="devicePage-btn-reset"
          onClick={handleClear}
          style={{ marginLeft: "10px", backgroundColor: "#6c757d", color: "white" }}
        >
          Clear
        </button>
      </div>

      <div className="devicePage-table-container">
        <table className="devicePage-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>#</th>
              <th>Vehicle ID</th>
              <th>Mode</th>
              <th>Speed</th>
              <th>Battery</th>
              <th>Range</th>
              <th>Position (mm)</th>
              <th>Yaw</th>
              <th>Location</th>
              <th>Task Info</th>
              <th>Odometer</th>
              <th>Engine</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeviceList.length > 0 ? (
              filteredDeviceList.map((device, index) => (
                <StatusRow key={device.vehicleId} device={device} index={index + 1} />
              ))
            ) : (
              <tr>
                <td colSpan="12" style={{ textAlign: "center", padding: "20px" }}>
                  No device matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

// --- 3. COMPONENT TRẠM SẠC (GIỮ NGUYÊN HOẶC CHỜ PHÁT TRIỂN) ---
const ChargingStationView = () => {
  return (
    <>
      <div className="devicePage-filter-container">
        <input type="text" placeholder="Charging Serial No" />
        <button className="devicePage-btn-search">Search</button>
      </div>
      <div className="devicePage-table-container">
        <table className="devicePage-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Station ID</th>
              <th>State</th>
              <th>Mode</th>
              <th>Power Output</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                Feature under development.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

// --- 4. COMPONENT CHÍNH (EXPORT) ---
export default function DevicePage({ devices }) {
  const [activeView, setActiveView] = useState("Status");

  return (
    <div className="devicePage-device-container">
      <div className="devicePage-sidebar">
        <div
          className={`devicePage-sidebar-item ${activeView === "Status" ? "active" : ""}`}
          onClick={() => setActiveView("Status")}
        >
          Status Management
        </div>
        <div
          className={`devicePage-sidebar-item ${activeView === "Charging" ? "active" : ""}`}
          onClick={() => setActiveView("Charging")}
        >
          Charging Station
        </div>
      </div>
      <div className="devicePage-content">
        {activeView === "Status" && <StatusManagementView devices={devices} />}
        {activeView === "Charging" && <ChargingStationView />}
      </div>
    </div>
  );
}