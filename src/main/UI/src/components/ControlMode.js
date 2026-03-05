import React, { useState } from "react";
import "../css/ControlMode.css";
import {
  // API_TASK_EMERGENCY_STOP,
  API_GATEWAY_SEND_TASK,
  API_GATEWAY_PAUSE_TASK,
  API_GATEWAY_RESUME_TASK,
  API_GATEWAY_CANCEL_TASK,
} from "../api";

export default function ControlMode({
  selectedRobotId,
  selectedRobotData,
  destinations = [],
  onRemoveDestination,
  onClearAll,
  siteId = "SITE_DEFAULT",
  isManualMode,
  setIsManualMode,
  onMapPointClick, // Cần prop này để giả lập hành động click map
  onPathCalculated,
}) {
  const [isSending, setIsSending] = useState(false);
  // LOGIC TÍNH TOÁN TRẠNG THÁI XE
  // Lấy trạng thái Task hiện tại
const taskStatus = selectedRobotData?.taskStatus || 0;
  
  // 🔥 ĐÃ SỬA: Xe rảnh (Idle) khi status là 0 (Chưa có lệnh), 60 (Đã tới đích), 101 (Lỗi), 102 (Đã hủy)
  const isIdle = taskStatus === 0 || taskStatus === 60 || taskStatus === 101 || taskStatus === 102; 
  
  const isExecuting = taskStatus === 40; // Xe đang chạy
  const isPaused = taskStatus === 50; // Xe đang tạm dừng
  const generatePointId = (index) => `PID_${Date.now()}_${index}`;

  const handleStartMission = async () => {
    if (!selectedRobotId) return alert("⚠️ Please select a Robot first!");
    if (!isIdle) return alert(`⚠️ Robot is busy (Status: ${taskStatus}). Cannot Start new mission!`);
    if (destinations.length === 0) return alert("Destination list is empty!");

    const targetId = selectedRobotId;
    setIsSending(true);

    try {
      const richWayPoints = destinations.map((p, index) => ({
        Order: index,
        PointId: p.parkPointId || p.id || generatePointId(index),
        Pointname: p.name || `Point-${index + 1}`,
        Pose: {
          Position: { x: p.x, y: p.y },
          Angle: p.z || 0,
        },
      }));

      //Code test : Sau nhớ check và xóa
      const currentX = selectedRobotData?.statusDetail?.longitude || selectedRobotData?.longitude || selectedRobotData?.x || 0;

      const currentY = selectedRobotData?.statusDetail?.latitude || selectedRobotData?.latitude || selectedRobotData?.y || 0;

      const payload = {
        vehicleId: targetId,
        taskId: `RB_TASK_${Date.now()}`,
        bizTaskId: `${Date.now()}`,
        wayPoints: richWayPoints,
        robotX: currentX,
        robotY: currentY,
      };

      console.log("📤 Sending Start Payload:", payload);

      const response = await fetch(API_GATEWAY_SEND_TASK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      // BẮT LỖI THIẾU BẢN ĐỒ TỪ BACKEND
      if (responseData.status === "MAP_MISSING") {
        alert("⛔ " + responseData.message);
        setIsSending(false);
        return; 
      }
      // BẮT CÁC LỖI KHÁC (Socket error, logic error...)
      if (responseData.status === "ERROR") {
        throw new Error(responseData.message || "Unknown Error");
      }

      // =========================================================
      // 🔥 3. NẾU THÀNH CÔNG: VẼ ĐƯỜNG VÀ DỌN DẸP UI
      // =========================================================
      if (responseData.calculatedPath && onPathCalculated) {
        onPathCalculated(responseData.calculatedPath);
      }

      alert("✅ Gửi lệnh thành công!");
      if (onClearAll) {
        // onClearAll(); // Xóa sạch danh sách điểm ở cột bên phải
      }
    } catch (error) {
      alert(`❌ Start Failed: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handlePauseTask = async () => {
    if (!selectedRobotId) return alert("⚠️ Select robot first!");
    if (!isExecuting) return alert("⚠️ Robot is not EXECUTING. Cannot Pause!");

    try {
      const response = await fetch(API_GATEWAY_PAUSE_TASK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: selectedRobotId, stopType: 0 }),
      });
      const data = await response.json();
      if (data.status === "ERROR") throw new Error(data.message);
    } catch (error) {
      alert(`❌ Pause Failed: ${error.message}`);
    }
  };

  const handleResumeTask = async () => {
    if (!selectedRobotId) return alert("⚠️ Select robot first!");
    if (!isPaused) return alert("⚠️ Robot is not PAUSED. Cannot Resume!");

    try {
      const response = await fetch(API_GATEWAY_RESUME_TASK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: selectedRobotId }),
      });
      const data = await response.json();
      if (data.status === "ERROR") throw new Error(data.message);
    } catch (error) {
      alert(`❌ Resume Failed: ${error.message}`);
    }
  };

  const handleCancelTask = async () => {
    if (!selectedRobotId) return alert("⚠️ Select robot first!");
    if (isIdle) return alert("⚠️ Robot is IDLE. Nothing to Cancel!");

    if (!window.confirm("⚠️ Confirm CANCEL current task?")) return;

    try {
      const response = await fetch(API_GATEWAY_CANCEL_TASK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: selectedRobotId,
          stopType: 0,
          reason: "User UI Cancel",
        }),
      });
      const data = await response.json();
      if (data.status === "ERROR") throw new Error(data.message);
    } catch (error) {
      alert(`❌ Cancel Failed: ${error.message}`);
    }
  };

  return (
    <div className="control-mode-overlay" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* --- KHỐI 1: THÔNG TIN XE --- */}
      <div className="control-section">
        <h3>Vehicle Info</h3>
        <div className="info-box">
          {selectedRobotId ? (
            <>
              <div style={{ marginBottom: "5px" }}>
                <strong>ID:</strong> <span style={{ color: "#00d2ff", fontWeight: "bold" }}>{selectedRobotId}</span>
              </div>

              <div style={{ marginBottom: "5px" }}>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    fontWeight: "bold",
                    color: isExecuting ? "#f39c12" : isPaused ? "#e74c3c" : isIdle ? "#00e676" : "white",
                  }}
                >
                  {isExecuting ? "RUNNING (40)" : isPaused ? "PAUSED (50)" : isIdle ? "IDLE (0)" : `STATUS ${taskStatus}`}
                </span>
              </div>

              <div>
                <strong>Battery:</strong>{" "}
                <span style={{ color: (selectedRobotData?.battery || 0) < 20 ? "red" : "white" }}>{selectedRobotData?.battery || 0}%</span>
              </div>
            </>
          ) : (
            <div className="text-warning" style={{ padding: "10px", border: "1px dashed #ffc107" }}>
              ⚠ Select a Robot
            </div>
          )}
        </div>
      </div>

      {/* --- KHỐI 2 (MỚI): 4 NÚT TRÊN 1 HÀNG + NÚT STOP --- */}
      <div className="control-section action-buttons" style={{ marginBottom: "15px", marginTop: "10px" }}>
        {/* GRID 4 NÚT NHỎ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr", // Chia đều 4 cột
            gap: "4px",
            marginBottom: "8px",
          }}
        >
          {/* 1. START */}
          <button
            onClick={handleStartMission}
            disabled={!selectedRobotId || !isIdle || destinations.length === 0 || isSending}
            style={{
              backgroundColor: !selectedRobotId || !isIdle ? "#444" : isSending ? "#666" : "#2ecc71",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: !selectedRobotId || !isIdle ? "not-allowed" : "pointer",
              opacity: !selectedRobotId || !isIdle ? 0.5 : 1,
              fontSize: "10px", // Chữ nhỏ
              fontWeight: "bold",
              padding: "8px 2px", // Nút gọn
              width: "100%",
            }}
            title="Start Mission"
          >
            {isSending ? "..." : "▶ START"}
          </button>

          {/* 2. PAUSE */}
          <button
            onClick={handlePauseTask}
            disabled={!selectedRobotId || !isExecuting}
            style={{
              backgroundColor: isExecuting ? "#f39c12" : "#444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              opacity: isExecuting ? 1 : 0.3,
              cursor: isExecuting ? "pointer" : "not-allowed",
              fontSize: "10px",
              fontWeight: "bold",
              padding: "8px 2px",
              width: "100%",
            }}
          >
            ⏸ PAUSE
          </button>

          {/* 3. RESUME */}
          <button
            onClick={handleResumeTask}
            disabled={!selectedRobotId || !isPaused}
            style={{
              backgroundColor: isPaused ? "#27ae60" : "#444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              opacity: isPaused ? 1 : 0.3,
              cursor: isPaused ? "pointer" : "not-allowed",
              fontSize: "10px",
              fontWeight: "bold",
              padding: "8px 2px",
              width: "100%",
            }}
          >
            ⏯ RESUME
          </button>

          {/* 4. CANCEL */}
          <button
            onClick={handleCancelTask}
            disabled={!selectedRobotId || isIdle}
            style={{
              backgroundColor: !isIdle ? "#c0392b" : "#444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              opacity: !isIdle ? 1 : 0.3,
              cursor: !isIdle ? "pointer" : "not-allowed",
              fontSize: "10px",
              fontWeight: "bold",
              padding: "8px 2px",
              width: "100%",
            }}
          >
            ⏹ CANCEL
          </button>
        </div>

        {/* Nút Emergency Stop To bên dưới */}
        {/* <button 
          className="action-btn stop-btn" 
          onClick={handleEmergencyStop} 
          disabled={!selectedRobotId}
          style={{ 
            opacity: !selectedRobotId ? 0.5 : 1,
            width: "100%",
            fontSize: "12px",
            padding: "8px",
            backgroundColor: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontWeight: "bold",
            cursor: !selectedRobotId ? "not-allowed" : "pointer"
          }}
        >
          🚨 EMERGENCY STOP
        </button> */}
      </div>

      {/* --- KHỐI 3: DANH SÁCH ĐIỂM (CÓ THANH TRƯỢT CHẮC CHẮN) --- */}
      <div
        className="control-section"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0 /* Quan trọng cho flex scroll */,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
          <h3 style={{ fontSize: "13px", margin: 0 }}>Destinations ({destinations.length})</h3>
          <div style={{ display: "flex", gap: "5px", background: "#eef", padding: "2px 5px", borderRadius: "4px", alignItems: "center" }}>
            <input type="checkbox" checked={isManualMode} onChange={(e) => setIsManualMode(e.target.checked)} />
            <label style={{ fontSize: "10px", fontWeight: "bold", color: "#555" }}>Manual</label>
          </div>
          {destinations.length > 0 && (
            <button onClick={onClearAll} className="clear-btn" style={{ fontSize: "10px", padding: "2px 6px" }}>
              CLEAR
            </button>
          )}
        </div>
        <div
          className="destination-list"
          style={{
            flex: 1,
            overflowY: "auto", // Bắt buộc hiện thanh trượt khi tràn
            maxHeight: "300px", // Giới hạn chiều cao
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "5px",
            backgroundColor: "#fff",
          }}
        >
          {destinations.length === 0 ? (
            <div className="empty-state" style={{ padding: "20px", textAlign: "center", color: "#999", fontSize: "12px" }}>
              Click map to add points
            </div>
          ) : (
            destinations.map((p, i) => (
              <div
                key={i}
                className="dest-item"
                style={{
                  marginBottom: "5px",
                  padding: "6px",
                  border: "1px solid #eee",
                  borderRadius: "4px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#f9f9f9",
                }}
              >
                <div className="dest-info">
                  <span
                    style={{
                      background: "#007bff",
                      color: "white",
                      borderRadius: "3px",
                      padding: "1px 4px",
                      fontSize: "10px",
                      marginRight: "5px",
                    }}
                  >
                    #{i + 1}
                  </span>
                  <span style={{ fontSize: "12px", color: "#333" }}>{p.name}</span>
                </div>
                <button
                  onClick={() => onRemoveDestination(i)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "red",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
