import React from "react";
import "../css/AlertPopup.css";

const ALERT_DISPLAY_CONFIG = {
  3: { title: "Battery Information", icon: "🔋", className: "info" },
  8: { title: "System Fault", icon: "⚠️", className: "error" },
  10: { title: "Obstacle Detected", icon: "⛔", className: "error" },
  11: { title: "Assistance Requested", icon: "🙋", className: "warning" },
  501: { title: "Departure Failed", icon: "❌", className: "error" },
  102: { title: "Arrive at stop", icon: "⚠️", className: "warning" },
  default: { title: "Unknown Notification", icon: "❓", className: "info" },
};

const getAlertDetails = (translatedBody, msgType) => {
  if (!translatedBody) return null;
  const detailKeys = ["Error Content", "Error Info", "Content", "Assistance Request", "Cabinet Info"];
  for (const key of detailKeys) {
    if (translatedBody[key]) return translatedBody[key];
  }
  if (msgType === 3) {
    return `Battery: ${translatedBody["Dung Lượng Pin"] || "N/A"}`;
  }
  return null;
};

const AlertPopup = ({ isOpen, onClose, alerts, children, title = "Alerts" }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close-button" onClick={onClose}>
          ×
        </button>
        <h2 className="alert-popup-title">{title}</h2>
        <div className={`alert-list-container ${children ? "details-view" : "list-view"}`}>
          {children ? (
            <div className="popup-details-content">{children}</div>
          ) : alerts && alerts.length > 0 ? (
            alerts.map((alert, index) => {
              const msgType = parseInt(alert.originalMessage.msgType, 10);
              const details = getAlertDetails(alert.translatedBody, msgType);
              const displayInfo = ALERT_DISPLAY_CONFIG[msgType] || ALERT_DISPLAY_CONFIG.default;
              const time = new Date(alert.originalMessage.time || Date.now()).toLocaleString("en-US");
              let robotId = "N/A";
              try {
                const msgBodyData = JSON.parse(alert.originalMessage.msgBody);
                robotId = msgBodyData.capacityResourceId || "N/A";
              } catch (e) {
                console.error("Could not parse msgBody in alert:", e);
              }

              return (
                <div key={`${alert.originalMessage.msgId}-${index}`} className={`alert-item alert-type-${displayInfo.className}`}>
                  <div className="alert-icon-wrapper">
                    <span className="alert-icon">{displayInfo.icon}</span>
                  </div>
                  <div className="alert-content">
                    <p className="alert-title">{displayInfo.title}</p>
                    {details && <p className="alert-message">{details}</p>}
                    <div className="alert-details">
                      {}
                      <p className="detail-item">
                        <span className="detail-label">Robot ID:</span>
                        <span className="detail-value">{robotId}</span>
                      </p>
                      {/* ------------------------------------ */}
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
            <p className="no-alerts">✅ No new alerts.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertPopup;
