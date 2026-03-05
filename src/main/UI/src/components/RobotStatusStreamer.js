// import React, { useEffect, useState, useRef } from "react";
// import { Client } from "@stomp/stompjs";
// import SockJS from "sockjs-client";
// import "../css/RobotStatusStreamer.css"; // Sẽ tạo file này ở bước sau

// const getStatusClass = (status) => {
//   switch (status?.toLowerCase()) {
//     case "online":
//     case "moving":
//       return "status-active";
//     case "idle":
//       return "status-standby";
//     case "error":
//     case "offline":
//       return "status-offline";
//     default:
//       return "status-standby";
//   }
// };

// const getBatteryWidth = (battery) => `${parseInt(battery, 10) || 0}%`;

// const RobotStatusStreamer = () => {
//   const [robotData, setRobotData] = useState(null);
//   const [isWsConnected, setIsWsConnected] = useState(false);
//   const stompClientRef = useRef(null);

//   // Logic kết nối WebSocket hoàn toàn độc lập
//   useEffect(() => {
//     const fallbackData = {
//       vehicleId: "AGV-OFFLINE",
//       latitude: 20.998395,
//       longitude: 105.721135,
//       azimuth: 90,
//       speed: 0,
//       battery: 0,
//       isCharging: false,
//       status: "OFFLINE",
//       name: "DeliCar",
//       model: "DeliCar",
//       driveMode: "N/A",
//     };

//     if (!stompClientRef.current) {
//       const client = new Client({
//         webSocketFactory: () => new SockJS("/ws"),
//         reconnectDelay: 5000,
//         debug: (str) =>
//           console.log(
//             `[WS-VehicleStatus] ${new Date().toLocaleTimeString()}: ${str}`
//           ),
//         onConnect: () => {
//           console.log("[WS-VehicleStatus] connected successfully");
//           setIsWsConnected(true);

//           client.subscribe("/topic/vehicle-status", (message) => {
//             const receivedData = JSON.parse(message.body);
//             setRobotData(receivedData); // Cập nhật state
//           });
//         },
//         onDisconnect: () => {
//           console.log("[WS-VehicleStatus] disconnected");
//           setIsWsConnected(false);
//           setRobotData(fallbackData);
//         },
//         onStompError: (error) => {
//           console.error("[WS-VehicleStatus] error:", error);
//           setIsWsConnected(false);
//           setRobotData(fallbackData);
//         },
//       });
//       stompClientRef.current = client;
//       stompClientRef.current.activate();
//     }

//     // Set dữ liệu fallback ban đầu
//     if (!robotData) {
//       setRobotData(fallbackData);
//     }

//     return () => {
//       if (stompClientRef.current && stompClientRef.current.active) {
//         stompClientRef.current.deactivate();
//         stompClientRef.current = null;
//       }
//     };
//   }, []);

//   return (
//     <div className="status-card">
//       <div className="status-header-container">
//         <div>
//           <div className="status-subtitle">
//             {robotData?.name || robotData?.vehicleId}
//           </div>
//         </div>
//         <div
//           className={`ws-indicator ${
//             isWsConnected ? "connected" : "disconnected"
//           }`}
//         />
//       </div>
//       <div className="vehicle-info-grid">
//         <div className="status-info-item">
//           <div className="status-info-label">Model:</div>
//           <div className="status-info-value">{robotData?.model || "N/A"}</div>
//         </div>
//         <div className="status-info-item">
//           <div className="status-info-label">Pin:</div>
//           <div className="status-info-value">
//             {robotData?.isCharging && "⚡️ "}
//             <div className="status-battery-indicator">
//               <div className="status-battery-bar">
//                 <div
//                   className="battery-fill"
//                   style={{ width: getBatteryWidth(robotData?.battery) }}
//                 />
//               </div>
//               {robotData?.battery?.toFixed(0)}%
//             </div>
//           </div>
//         </div>
//         <div className="status-info-item">
//           <div className="status-info-label">Tốc độ:</div>
//           <div className="status-info-value">
//             {robotData?.speed?.toFixed(2)} km/h
//           </div>
//         </div>
//         <div className="status-info-item">
//           <div className="status-info-label">Góc quay:</div>
//           <div className="status-info-value">
//             🧭 {robotData?.azimuth?.toFixed(1)}°
//           </div>
//         </div>
//         <div className="status-info-item">
//           <div className="status-info-label">Chế độ lái:</div>
//           <div className="status-info-value">
//             ⚙️ {robotData?.driveMode || "N/A"}
//           </div>
//         </div>
//         <div className="status-info-item">
//           <div className="status-info-label">Trạng thái:</div>
//           <div
//             className={`status-info-value ${getStatusClass(robotData?.status)}`}
//           >
//             ● {robotData?.status}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default RobotStatusStreamer;
