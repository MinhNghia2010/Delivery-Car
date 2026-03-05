import React, { useState, useEffect, useRef, useCallback } from "react";
import RobotMap from "./components/PageMap";
import ControlMode from "./components/ControlMode";
import TaskPage from "./components/TaskPage";
import CarManager from "./components/RobotManager";
import SiteManager from "./components/SiteManager";
import ParkPointManager from "./components/ParkPointManager";
import SiteRelationRobot from "./components/SiteRelationRobot";
import StreamVideoCar from "./components/StreamVideoCar";
import "./App.css";
import axios from "axios";
import MapLibraryManager from "./components/MapLibraryManager";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import WarningPage from "./components/WarningPage";
import DevicePageMonitor from "./components/PageStatusMini";
import StatisticsPageMonitor from "./components/StatisticsPageMonitor";
import StatisticsPage from "./components/StatisticsPage";
import DevicePage from "./components/PageStatus";
import { Modal, Button } from "react-bootstrap";
import OrderPage from "./components/PageMission";
import { API_CONNECT_CAR, WS_URL } from "./api";

export default function App() {
  const userRole = localStorage.getItem("userRole");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [tab, setTab] = useState("map");
  const [isManualMode, setIsManualMode] = useState(false);
  const [monitorTab, setMonitorTab] = useState("control");
  const [managerTab, setManagerTab] = useState(null);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const adminRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [alerts, setAlerts] = useState([]);
  const [deviceStatuses, setDeviceStatuses] = useState({});
  const [isConnected, setIsConnected] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [robots, setRobots] = useState({});
  const [selectedRobotId, setSelectedRobotId] = useState(null);
  const [selectedRobotData, setSelectedRobotData] = useState(null);
  const [totalWarnings, setTotalWarnings] = useState(0);
  const [destinations, setDestinations] = useState([]);
  const [plannedPath, setPlannedPath] = useState(null);
  const stompClientRef = useRef(null);
  // State để lưu thông tin xe đang xin kết nối
  const [pendingRequests, setPendingRequests] = useState([]);

  const handleMapPointClick = (point) => {
    const newPoint = {
      ...point,
      tempId: point.parkPointId || `TEMP_${Date.now()}_${Math.random()}`,
    };
    setDestinations((prev) => [...prev, newPoint]);
  };

  //  Hàm xóa 1 điểm khỏi danh sách
  const handleRemoveDestination = (indexToRemove) => {
    setDestinations((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  //  Hàm xóa toàn bộ
  const handleClearAllDestinations = () => {
    setDestinations([]);
  };

  const handleRobotSelect = (robotDataObject) => {
    if (!robotDataObject) {
      // Xử lý trường hợp bỏ chọn xe
      setSelectedRobotId(null);
      setSelectedRobotData(null);
      return;
    }

    // 🔥 SỬA LỖI TẠI ĐÂY:
    // Backend hiện tại chỉ gửi 'vehicleId', chưa gửi 'capacityResourceId'.
    // Nên ta phải ưu tiên lấy 'vehicleId' làm ID chính nếu cái kia thiếu.
    const resourceId = robotDataObject.capacityResourceId || robotDataObject.vehicleId;
    const objectId = robotDataObject.vehicleId;

    setSelectedRobotId(resourceId); // Cập nhật state ID chuẩn (CB20608...)

    const completeRobotData = {
      ...robotDataObject,
      capacityResourceId: resourceId,
      capacityResourceObjectId: objectId,
    };

    setSelectedRobotData(completeRobotData);

    console.log(
      "Đã chọn xe. Dữ liệu đầy đủ được truyền đi:",
      completeRobotData,
    );

    if (tab !== "map") {
      setTab("map");
    }
    setMonitorTab("control");
  };

  const handleAdminMenuToggle = useCallback(() => {
    setShowAdminMenu((prev) => !prev);
  }, []);

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const performLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userRole");
    window.location.href = "/";
  };

  const renderMonitorSidebarContent = () => {
    switch (monitorTab) {
      case "control":
        const liveRobotData = selectedRobotId
          ? { ...selectedRobotData, ...(deviceStatuses[selectedRobotId] || {}) }
          : null;
        return (
          <ControlMode
            selectedRobotId={selectedRobotId}
            // selectedRobotData={selectedRobotData}
            selectedRobotData={liveRobotData}
            onNavigate={setTab}
            destinations={destinations}
            onRemoveDestination={handleRemoveDestination}
            onClearAll={() => {
              handleClearAllDestinations();
              setPlannedPath(null);
            }}
            siteId="SITE_DEFAULT"
            isManualMode={isManualMode}
            setIsManualMode={setIsManualMode}
            onMapPointClick={handleMapPointClick}
            onPathCalculated={setPlannedPath}
          />
        );
      case "statistics":
        return <StatisticsPageMonitor />;
      case "device":
        // return <DevicePageMonitor devices={deviceStatuses} />;
        return <DevicePageMonitor devices={robots} />;
      case "warning":
        return <WarningPage alerts={alerts} />;
      default:
        return null;
    }
  };

  const renderOverlayContent = () => {
    if (managerTab) {
      if (userRole !== "ADMIN") return null;
      return (
        <div className="manager-overlay">
          {managerTab === "site" && (
            <SiteManager setManagerTab={setManagerTab} />
          )}

          {managerTab === "car" && <CarManager setManagerTab={setManagerTab} />}

          {managerTab === "parkpoint" && (
            <ParkPointManager setManagerTab={setManagerTab} />
          )}

          {managerTab === "site_relation_robot" && (
            <SiteRelationRobot setManagerTab={setManagerTab} />
          )}

          {managerTab === "mapLibrary" && (
            <MapLibraryManager setManagerTab={setManagerTab} />
          )}
        </div>
      );
    }

    if (tab === "map") {
      return null;
    }

    const pageComponents = {
      task: userRole === "ADMIN" ? <TaskPage /> : null,
      statistics: <StatisticsPage />,
      stream:
        userRole === "ADMIN" || userRole === "SUPERVISOR" ? (
          <StreamVideoCar
            vehicleId={selectedRobotId}
            onClose={handleCloseStream}
          />
        ) : null,
      // device: <DevicePage devices={deviceStatuses} />,
      device: <DevicePage devices={robots} />,
      order: <OrderPage />,
    };

    const CurrentPageComponent = pageComponents[tab];

    if (CurrentPageComponent) {
      return <div className="page-overlay">{CurrentPageComponent}</div>;
    }

    return null;
  };
  const handleCloseStream = useCallback(() => {
    setTab("map");
  }, []);

  const handleNetworkError = (errorSource, error) => {
    console.error(`Connect error: ${errorSource}:`, error);
    setIsConnected(false);
    setErrorMessage("Data is off or unable to connect to the server");
  };

  const handleConnectionResponse = async (vehicleId, approved) => {
    try {
      // 1. Gọi API báo về Server
      await axios.post(API_CONNECT_CAR, {
        vehicleId: vehicleId,
        action: approved ? "ACCEPTED" : "REJECTED",
      });

      // 2. Xóa xe này khỏi danh sách chờ (Frontend)
      setPendingRequests((prev) =>
        prev.filter((req) => req.vehicleId !== vehicleId),
      );
    } catch (e) {
      console.error("Lỗi gửi phản hồi duyệt xe:", e);
      alert("Lỗi kết nối tới server khi duyệt xe " + vehicleId);
    }
  };

  useEffect(() => {
    const RENDER_INTERVAL_MS = 500;

    const setupStompClient = () => {
      const client = new Client({
        // webSocketFactory: () => new SockJS("/ws"),
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 5000,
        debug: () => { }, // Không ghi log debug để tránh console bị quá tải
      });

      client.onConnect = (frame) => {
        console.log("WebSocket connected ");
        setIsConnected(true); // Cập nhật trạng thái: ĐÃ KẾT NỐI
        setErrorMessage(""); // Xóa thông báo lỗi cũ

        client.subscribe("/topic/vehicle-status", (message) => {
          try {
            const statusUpdate = JSON.parse(message.body);
            if (statusUpdate && statusUpdate.vehicleId) {
              setDeviceStatuses((prevStatuses) => {
                const existingDevice =
                  prevStatuses[statusUpdate.vehicleId] || {};
                const updatedDevice = { ...existingDevice, ...statusUpdate };
                return {
                  ...prevStatuses,
                  [statusUpdate.vehicleId]: updatedDevice,
                };
              });
            }
          } catch (e) {
            handleNetworkError("ws-status-parse", e);
          }
        });

        client.subscribe("/topic/route-plan", (message) => {
          try {
            const data = JSON.parse(message.body);

            // Nếu có mảng đường đi, lập tức set vào state để PageMap.js tự động vẽ
            if (data.calculatedPath && data.calculatedPath.length > 0) {
              console.log("🛣️ Nhận lộ trình mới từ Server (API/WMS):", data.calculatedPath.length, "điểm");
              setPlannedPath(data.calculatedPath);
            }
          } catch (error) {
            console.error("Lỗi parse lộ trình từ WebSocket:", error);
          }
        });

        client.subscribe("/topic/alerts", (message) => {
          try {
            const newAlert = JSON.parse(message.body);
            if (newAlert.type === "CONNECTION_REQUEST") {
              console.log("🔔 Có xe xin kết nối:", newAlert);

              setPendingRequests((prev) => {
                // Kiểm tra xem xe này đã có trong danh sách chờ chưa để tránh trùng lặp
                const exists = prev.find(
                  (req) => req.vehicleId === newAlert.vehicleId,
                );
                if (exists) return prev;

                // Thêm vào danh sách
                return [...prev, newAlert];
              });
              return;
            }
            if (newAlert.type === "REQUEST_MAP_UPLOAD") {
              alert(newAlert.message);
              console.warn("Nạp map xuống server!");
            }
            const successTypes = ["TASK_ACK", "TASK_PAUSED", "TASK_RESUMED", "TASK_CANCELED", "TASK_FINISHED"];
            const errorTypes = ["TASK_FAILED", "TASK_TIMEOUT"];

            if (successTypes.includes(newAlert.type)) {
              alert(`✅ THÀNH CÔNG: ${newAlert.message}`);

              // 🔥 NẾU XE BÁO ĐÃ TỚI ĐÍCH HOẶC BỊ HỦY -> XÓA SẠCH ĐƯỜNG VÀNG TRÊN UI
              if (newAlert.type === "TASK_FINISHED" || newAlert.type === "TASK_CANCELED") {
                setPlannedPath(null);
              }
            }

            if (errorTypes.includes(newAlert.type)) {
              // alert(`❌ THẤT BẠI: ${newAlert.message}`);
            }
            console.log("New Alert Received :", newAlert);
            setAlerts((prevAlerts) => [newAlert, ...prevAlerts]);
            setTotalWarnings((prev) => prev + 1);
          } catch (e) {
            handleNetworkError("ws-alert-parse", e);
          }
        });
      };

      client.onStompError = (frame) => {
        console.error(
          "WebSocket STOMP error in App.js:",
          frame.headers["message"],
        );
        setIsConnected(false); // Cập nhật trạng thái: MẤT KẾT NỐI
        setErrorMessage("Data is turned off.");
      };

      client.onDisconnect = () => {
        setIsConnected(false);
        setErrorMessage("DisConnect to Server");
      };

      client.activate();
      stompClientRef.current = client;
    };

    setupStompClient();

    return () => {
      if (stompClientRef.current && stompClientRef.current.active) {
        console.log("Deactivating Stomp client on cleanup in App.js...");
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (adminRef.current && !adminRef.current.contains(e.target)) {
        setShowAdminMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="app-container">
      {!isConnected && (
        <div className="connection-overlay">
          <div className="connection-message">
            <div className="connection-icon">🔌</div>
            <h1>Connection interrupted</h1>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="taskbar">
        <div className="taskbar-left">
          <img src="/img/viettelpost-logo.png" alt="Logo" className="logo" />
          <span className="system-title">DeliCar Control System</span>
        </div>
        <div className="taskbar-center">
          <button
            className={`task-item ${tab === "map" ? "active" : ""}`}
            onClick={() => {
              setTab("map");
              setManagerTab(null);
            }}
          >
            Map
          </button>
          <button
            className={`task-item ${tab === "order" ? "active" : ""}`}
            onClick={() => {
              setTab("order");
              setManagerTab(null);
            }}
          >
            Task Mission
          </button>
          <button
            className={`task-item ${tab === "device" ? "active" : ""}`}
            onClick={() => {
              setTab("device");
              setManagerTab(null);
            }}
          >
            Device
          </button>
          {userRole === "ADMIN" && (
            <button
              className={`task-item ${tab === "task" ? "active" : ""}`}
              onClick={() => {
                setTab("task");
                setManagerTab(null);
              }}
            >
              Task
            </button>
          )}

          <button
            className={`task-item ${tab === "statistics" ? "active" : ""}`}
            onClick={() => {
              setTab("statistics");
              setManagerTab(null);
            }}
          >
            Statistics
          </button>
        </div>
        <div className="taskbar-right">
          {userRole === "ADMIN" && (
            <div className="admin-menu-container" ref={adminRef}>
              <span
                className="task-icon"
                onClick={handleAdminMenuToggle}
                style={{ cursor: "pointer" }}
              >
                👤 Admin ▾
              </span>
              {showAdminMenu && (
                <div className="manager-dropdown">
                  <button
                    className="dropdown-btn"
                    onClick={() => {
                      setManagerTab("site"); // Mở SiteManager
                      setShowAdminMenu(false); // Đóng menu
                      setTab("map"); // Reset tab chính về map (tuỳ chọn)
                    }}
                    style={{ textAlign: "left", paddingLeft: "15px" }}
                  >
                    Site Manager
                  </button>

                  <div
                    style={{ borderTop: "1px solid #444", margin: "5px 0" }}
                  ></div>
                  <button
                    className="dropdown-btn"
                    onClick={() => {
                      setManagerTab("mapLibrary");
                      setShowAdminMenu(false);
                      setTab("map");
                    }}
                    style={{ textAlign: "left", paddingLeft: "15px" }}
                  >
                    Map Library
                  </button>
                  <button className="dropdown-btn" onClick={handleLogout}>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {userRole !== "ADMIN" && (
          <div className="admin-menu-container">
            <span
              className="task-icon"
              onClick={handleLogout}
              style={{ cursor: "pointer" }}
            >
              Log Out
            </span>
          </div>
        )}
      </div>

      <div className="content-area">
        <div className="content-area">
          <div className="map-background-layer">
            <div className="left-panel">
              <div className="sidebar monitor-sidebar">
                <div className="sidebar-taskbar">
                  <a
                    href="#"
                    className={`sidebar-task-item ${monitorTab === "control" ? "active" : ""
                      }`}
                    onClick={(e) => {
                      e.preventDefault();
                      setMonitorTab("control");
                    }}
                  >
                    Control
                  </a>
                  <a
                    href="#"
                    className={`sidebar-task-item ${monitorTab === "statistics" ? "active" : ""
                      }`}
                    onClick={(e) => {
                      e.preventDefault();
                      setMonitorTab("statistics");
                    }}
                  >
                    Statistic
                  </a>
                  <a
                    href="#"
                    className={`sidebar-task-item ${monitorTab === "device" ? "active" : ""
                      }`}
                    onClick={(e) => {
                      e.preventDefault();
                      setMonitorTab("device");
                    }}
                  >
                    Device
                  </a>
                  <a
                    href="#"
                    id="warning-window"
                    className={`sidebar-task-item ${monitorTab === "warning" ? "active" : ""
                      }`}
                    onClick={(e) => {
                      e.preventDefault();
                      setMonitorTab("warning");
                      setTotalWarnings(0);
                    }}
                  >
                    Warning
                    <div className="sidebar-warning-badge">
                      <span className="sidebar-totalWarning">
                        {totalWarnings}
                      </span>
                    </div>
                  </a>
                </div>
                <div className="sidebar-content-container">
                  {renderMonitorSidebarContent()}
                </div>
              </div>
            </div>
            <div className="right-panel">
              <RobotMap
                onAllRobotsUpdate={setRobots}
                onRobotSelect={handleRobotSelect}
                mapInstanceRef={mapInstanceRef}
                isControlMode={monitorTab === "control"}
                activeTab={tab}
                managerTab={managerTab}
                onMapPointClick={handleMapPointClick}
                destinations={destinations}
                isManualMode={isManualMode}
                plannedPath={plannedPath}
              />
            </div>
          </div>
        </div>

        {renderOverlayContent()}
      </div>
      <Modal
        show={pendingRequests.length > 0} // Chỉ hiện khi danh sách có ít nhất 1 xe
        onHide={() => { }} // Không cho tắt bằng cách click ra ngoài (bắt buộc phải xử lý)
        centered
        backdrop="static"
        keyboard={false}
        size="lg" // Modal to hơn chút để chứa danh sách
      >
        <Modal.Header>
          <Modal.Title>
            🤖 Yêu Cầu Kết Nối ({pendingRequests.length})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "400px", overflowY: "auto" }}>
          {pendingRequests.length === 0 ? (
            <p className="text-center">Đang chờ yêu cầu...</p>
          ) : (
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th>Vehicle ID</th>
                  <th>IP Address</th>
                  <th className="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((req, index) => (
                  <tr key={req.vehicleId}>
                    <td style={{ fontWeight: "bold", color: "#0d6efd" }}>
                      {req.vehicleId}
                    </td>
                    <td style={{ fontFamily: "monospace" }}>{req.ip}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() =>
                            handleConnectionResponse(req.vehicleId, true)
                          }
                        >
                          ✅ Chấp nhận
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            handleConnectionResponse(req.vehicleId, false)
                          }
                        >
                          ❌ Từ chối
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal.Body>
        <Modal.Footer>
          {/* Nút từ chối tất cả nếu muốn (Option) */}
          <div className="text-muted small">
            Vui lòng xử lý từng yêu cầu để đảm bảo an toàn.
          </div>
        </Modal.Footer>
      </Modal>
      <Modal
        show={showLogoutConfirm}
        onHide={() => setShowLogoutConfirm(false)}
        centered // Đặt modal ở giữa
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>Confirm Logout ?</Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowLogoutConfirm(false)}
          >
            Hủy
          </Button>
          <Button variant="danger" onClick={performLogout}>
            Logout
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
