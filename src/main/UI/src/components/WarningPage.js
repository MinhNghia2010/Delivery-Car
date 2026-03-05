import React from "react";
import "../css/WarningPage.css";

// 1. Cấu hình hiển thị cho CẢ CŨ VÀ MỚI
const ALERT_DISPLAY_CONFIG = {
  // --- CODE CŨ (SỐ) ---
  2: { title: "Disconnect", icon: "🔴", className: "error" },
  3: { title: "Battery Alarm", icon: "🔋", className: "warning" },
  8: { title: "System Error", icon: "🔧", className: "error" },
  10: { title: "Car Error", icon: "⚠️", className: "error" },
  11: { title: "Support Request", icon: "🙋", className: "warning" },
  501: { title: "Started Fail", icon: "❌", className: "error" },
  102: { title: "Arrive at stop", icon: "✅", className: "info" },

  // --- 🔥 CODE MỚI (CHUỖI - TỪ HEARTBEAT SERVICE) ---
  "HEARTBEAT_TIMEOUT": { title: "Mạng Chập Chờn", icon: "📶", className: "warning" },
  "ROBOT_DISCONNECTED": { title: "Mất Kết Nối", icon: "🔌", className: "error" },

  default: { title: "Thông Báo", icon: "🔔", className: "info" },
};

// Hàm lấy nội dung chi tiết (Xử lý đa năng)
const getAlertDetails = (alert, msgType) => {
  // Case 1: Alert kiểu mới (Simple JSON từ Heartbeat)
  if (!alert.originalMessage) {
      return alert.message || "Không có nội dung chi tiết";
  }

  // Case 2: Alert kiểu cũ (Complex JSON từ Robot)
  if (alert.alertDetails) return alert.alertDetails;

  const translatedBody = alert.translatedBody;
  if (!translatedBody) return null;

  const detailKeys = ["Error Content", "Error Info", "Content", "Assistance Request", "Cabinet Info"];
  for (const key of detailKeys) {
    if (translatedBody[key]) return translatedBody[key];
  }
  if (msgType === 3) {
    return `Pin: ${translatedBody["Dung Lượng Pin"] || "N/A"}`;
  }
  return null;
};

const WarningPage = ({ alerts }) => {
  return (
    <div className="warning-page-container">
      {alerts && alerts.length > 0 ? (
        alerts.map((alert, index) => {
          
          let displayInfo, details, time, robotId;

          // 🔥 LOGIC PHÂN LOẠI DỮ LIỆU CŨ/MỚI
          if (alert.originalMessage) {
            // === LOGIC CŨ ===
            const msgType = parseInt(alert.originalMessage.msgType, 10);
            displayInfo = ALERT_DISPLAY_CONFIG[msgType] || ALERT_DISPLAY_CONFIG.default;
            details = getAlertDetails(alert, msgType);
            time = new Date(alert.originalMessage.time || Date.now()).toLocaleString("vi-VN");
            
            try {
                const msgBodyData = JSON.parse(alert.originalMessage.msgBody);
                robotId = msgBodyData.capacityResourceId || msgBodyData.capacityResourceObjectId || "N/A";
            } catch (e) {
                robotId = "N/A";
            }
          } else {
            // === LOGIC MỚI (HEARTBEAT) ===
            const type = alert.type || "default";
            displayInfo = ALERT_DISPLAY_CONFIG[type] || ALERT_DISPLAY_CONFIG.default;
            details = alert.message;
            robotId = alert.device || "N/A";
            time = new Date().toLocaleString("vi-VN"); // Lấy giờ hiện tại
          }

          return (
            <div key={index} className={`alert-item alert-type-${displayInfo.className}`}>
              <div className="alert-icon-wrapper">
                <span className="alert-icon">{displayInfo.icon}</span>
              </div>
              <div className="alert-content">
                <p className="alert-title">{displayInfo.title}</p>
                {details && <p className="alert-message">{details}</p>}
                <div className="alert-details">
                  <p className="detail-item">
                    <span className="detail-label">Robot ID:</span>
                    <span className="detail-value" style={{fontWeight: 'bold'}}>{robotId}</span>
                  </p>
                  <p className="detail-item">
                    <span className="detail-label">Time:</span>
                    <span className="detail-value">{time}</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="no-alerts">
          <p>Hệ thống hoạt động bình thường.</p>
        </div>
      )}
    </div>
  );
};

export default WarningPage;