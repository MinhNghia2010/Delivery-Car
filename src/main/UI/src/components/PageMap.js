import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { Map as OLMap, View } from "ol";
import ImageLayer from "ol/layer/Image";
import { ImageStatic } from "ol/source";
import { getCenter } from "ol/extent";
import axios from "axios";
import Projection from "ol/proj/Projection";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import Feature from "ol/Feature";
import { Point, LineString, Polygon } from "ol/geom";
import { Icon, Circle as CircleStyle, Style, Text, Fill, Stroke, RegularShape } from "ol/style";
import Overlay from "ol/Overlay";
import "ol/ol.css";
import "../css/PageMap.css";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { fromLonLat } from "ol/proj";
import { WS_URL } from "../api";
import {
  // API_TASK_EMERGENCY_STOP,
  API_DATA_MAP,
  API_MAP_LIBRARY,
  API_MAP_ASSIGN,
  API_MAP_ROBOT
} from "../api";

const carIcon = "/img/car_icon.png";
const RobotMap = ({
  setTab,
  isControlMode,
  onRobotSelect,
  onAllRobotsUpdate,
  mapInstanceRef,
  activeTab,
  managerTab,
  onMapPointClick,
  destinations = [],
  isManualMode,
  onTopoLoaded,
  plannedPath
}) => {
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const baseLayer = useRef(null);
  const robotsRef = useRef({});
  const mapInitialized = useRef(false);
  const stompClientRef = useRef(null);
  const isFirstMessage = useRef(true);
  const waypointLayerRef = useRef(null);
  const [tempResolution, setTempResolution] = useState(null);
  const [tempOrigin, setTempOrigin] = useState(null);
  const [mapType, setMapType] = useState("static");
  const [tempMapType, setTempMapType] = useState("static");
  const satelliteURL = "https://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}";

  const isControlModeRef = useRef(isControlMode);
  useEffect(() => {
    isControlModeRef.current = isControlMode;
  }, [isControlMode]);
  const animationTargetsRef = useRef({});
  const [robotPaths, setRobotPaths] = useState({});

  const layersRef = useRef({
    robotLayer: null,
    originLayer: null,
    waypointLayer: null,
    targetLayer: null,
    topoLayer: null,
    plannedPathLayer: null,
  });
  const getColorForRobot = (id) => {
    const colors = ["#FF0000", "#00FF00", "#0000FF", "#FFA500", "#800080", "#00FFFF"];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const [mapImageUrl, setMapImageUrl] = useState(null);
  const [mapImageSize, setMapImageSize] = useState(null);

  // State cho Form Set Map
  const [showMapConfig, setShowMapConfig] = useState(false);
  const [tempConfig, setTempConfig] = useState({
    width: 1000,
    height: 1000,
    previewUrl: null,
  });

  const getCubicBezierPoint = (t, p0, p1, p2, p3) => {
    const cX = 3 * (p1[0] - p0[0]);
    const bX = 3 * (p2[0] - p1[0]) - cX;
    const aX = p3[0] - p0[0] - cX - bX;

    const cY = 3 * (p1[1] - p0[1]);
    const bY = 3 * (p2[1] - p1[1]) - cY;
    const aY = p3[1] - p0[1] - cY - bY;

    const x = aX * Math.pow(t, 3) + bX * Math.pow(t, 2) + cX * t + p0[0];
    const y = aY * Math.pow(t, 3) + bY * Math.pow(t, 2) + cY * t + p0[1];

    return [x, y];
  };

  // Hàm sinh danh sách tọa độ cho LineString
  const generateBezierPath = (start, end, control1, control2, segments = 20) => {
    const path = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      path.push(getCubicBezierPoint(t, start, control1, control2, end));
    }
    return path;
  };



  const [isSetOriginMode, setIsSetOriginMode] = useState(false);
  const [mapOrigin, setMapOrigin] = useState([0, 0]); // Gốc tọa độ (0,0) mới trên bản đồ
  const [showSetupMenu, setShowSetupMenu] = useState(false);
  const [pixelsPerMm, setPixelsPerMm] = useState(0.02);
  const [isWsEnabled, setIsWsEnabled] = useState(true); // true = Bật, false = Tắt
  // Ref cho các layer mới
  const originLayerRef = useRef(null);
  const isSetOriginModeRef = useRef(isSetOriginMode);

  const [hasOriginBeenSet, setHasOriginBeenSet] = useState(false);

  const animationRef = useRef({ id: null });
  const [robots, setRobots] = useState({});

  useEffect(() => {
    isSetOriginModeRef.current = isSetOriginMode;
  }, [isSetOriginMode]);

  useEffect(() => {
    animationTargetsRef.current = {};
    console.log("🔄 Đã reset bộ đệm Animation do Origin thay đổi.");
  }, [mapOrigin]);

  useEffect(() => {
    robotsRef.current = robots;
  }, [robots]);

  const [selectedRobotId, setSelectedRobotId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const robotSpeedsRef = useRef({});
  const isManualModeRef = useRef(isManualMode);
  const mapOriginRef = useRef(mapOrigin);
  const [topoData, setTopoData] = useState(null);
  const selectedRobotData = selectedRobotId ? robots[selectedRobotId] : null;

  // === MAP ASSIGNMENT POPUP STATE ===
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [mapPopupRobotId, setMapPopupRobotId] = useState(null);
  const [mapLibraryList, setMapLibraryList] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState("");
  const [currentAssignedMap, setCurrentAssignedMap] = useState(null);
  const [mapAssignMsg, setMapAssignMsg] = useState("");
  const [mapAssigning, setMapAssigning] = useState(false);

  const openMapPopup = async (vehicleId) => {
    setMapPopupRobotId(vehicleId);
    setSelectedMapId("");
    setMapAssignMsg("");
    setCurrentAssignedMap(null);
    try {
      const [libRes, assignedRes] = await Promise.all([
        axios.get(API_MAP_LIBRARY),
        axios.get(API_MAP_ROBOT(vehicleId)),
      ]);
      setMapLibraryList(libRes.data);
      if (assignedRes.data.found) {
        setCurrentAssignedMap(assignedRes.data);
        setSelectedMapId(assignedRes.data.mapId);
      }
    } catch (err) {
      console.error("Error loading map data:", err);
    }
    setShowMapPopup(true);
  };

  const handleAssignMap = async () => {
    if (!selectedMapId || !mapPopupRobotId) return;
    setMapAssigning(true);
    setMapAssignMsg("");
    try {
      const res = await axios.post(API_MAP_ASSIGN, {
        vehicleId: mapPopupRobotId,
        mapId: selectedMapId,
      });
      if (res.data.success) {
        setMapAssignMsg("✅ " + res.data.message);
        // Refresh assigned map info
        const assignedRes = await axios.get(API_MAP_ROBOT(mapPopupRobotId));
        if (assignedRes.data.found) setCurrentAssignedMap(assignedRes.data);
      } else {
        setMapAssignMsg("❌ " + res.data.error);
      }
    } catch (err) {
      setMapAssignMsg("❌ Failed: " + err.message);
    }
    setMapAssigning(false);
  };
  const customOriginStyle = [
    // Lớp 1: Dấu cộng (Thay cho 2 cái Rect ngang dọc)
    new Style({
      image: new RegularShape({
        points: 4, // 4 cánh
        radius: 20, // Độ dài cánh (tương đương width 40px)
        radius2: 0, // Độ dày ở tâm = 0 để tạo nét mảnh
        angle: Math.PI / 4, // Xoay 45 độ để dấu 'x' thành dấu '+'
        stroke: new Stroke({ color: "magenta", width: 2 }), // Màu magenta, nét 2
        opacity: 0.7, // Độ mờ 0.7 như bạn muốn
      }),
    }),
    // Lớp 2: Vòng tròn ở tâm (Thay cho Circle)
    new Style({
      image: new CircleStyle({
        radius: 5, // Bán kính 5
        stroke: new Stroke({ color: "magenta", width: 1.5 }),
        fill: null, // Không tô màu nền (rỗng)
      }),
    }),
  ];

  // =====================================================================
  // 🔥 VẼ LỘ TRÌNH DI CHUYỂN (ĐƯỜNG VÀNG ĐẬM) TỪ BACKEND TRẢ VỀ
  // =====================================================================
  useEffect(() => {
    if (!mapInstanceRef.current || !layersRef.current.plannedPathLayer) return;
    const source = layersRef.current.topoLayer.getSource();

    // 1. NẾU KHÔNG CÓ ĐƯỜNG -> XÓA FEATURE TRÊN BẢN ĐỒ
    if (!plannedPath || plannedPath.length <= 1) {
      const oldPath = source.getFeatureById("planned-path-feature");
      if (oldPath) source.removeFeature(oldPath);
      return;
    }

    // 2. TẠO BẢN SAO ĐỘC LẬP (DEEP COPY) ĐỂ KHÔNG LÀM HỎNG DỮ LIỆU GỐC CỦA REACT
    let pathToDraw = JSON.parse(JSON.stringify(plannedPath));
    const currentSliceId = selectedRobotData?.sliceId || selectedRobotData?.SliceID;

    // 3. TÌM ĐIỂM HIỆN TẠI ĐỂ CẮT BỚT ĐƯỜNG PHÍA SAU
    if (currentSliceId) {
      const passedIndex = pathToDraw.findIndex((p) => String(p.id) === String(currentSliceId));
      if (passedIndex !== -1) {
        // Lùi lại 1 node để nét vẽ nối tiếp mượt mà
        const startIndex = Math.max(0, passedIndex - 1);
        pathToDraw = pathToDraw.slice(startIndex);
      }
    }

    // 4. ÉP ĐIỂM ĐẦU TIÊN BÁM DÍNH CHẶT VÀO TỌA ĐỘ THỰC TẾ CỦA XE (CHỐNG LỆCH)
    if (pathToDraw.length > 0 && selectedRobotData?.x !== undefined && selectedRobotData?.y !== undefined) {
      pathToDraw[0].x = selectedRobotData.x;
      pathToDraw[0].y = selectedRobotData.y;
    }

    // 5. TÍNH TOÁN RA PIXEL ĐỂ VẼ
    if (pathToDraw.length > 1) {
      const [originX, originY] = mapOrigin;

      // Lọc bỏ những điểm bị lỗi NaN hoặc undefined để chống sập OpenLayers
      const pixelCoords = pathToDraw
        .filter((p) => p.x != null && p.y != null)
        .map((p) => [
          originX + p.x * pixelsPerMm,
          originY + p.y * pixelsPerMm,
        ]);

      if (pixelCoords.length > 1) {
        let pathFeature = source.getFeatureById("planned-path-feature");

        // 🔥 LOGIC TỐI ƯU HÌNH ẢNH:
        // Nếu chưa có đường -> Tạo mới.
        // Nếu ĐÃ CÓ đường -> CHỈ CẬP NHẬT TỌA ĐỘ (Không Xóa/Vẽ lại) -> KHÔNG BAO GIỜ BỊ NHÁY!
        if (!pathFeature) {
          pathFeature = new Feature({ geometry: new LineString(pixelCoords) });
          pathFeature.setId("planned-path-feature");
          pathFeature.setStyle(
            new Style({
              stroke: new Stroke({
                color: "rgba(255, 215, 0, 0.8)", // Vàng đậm
                width: 8,
                lineCap: "round",
                lineJoin: "round",
              }),
              zIndex: 10,
            })
          );
          source.addFeature(pathFeature);
        } else {
          pathFeature.setGeometry(new LineString(pixelCoords));
        }
      }
    }
  }, [plannedPath, selectedRobotData, mapOrigin, pixelsPerMm]);

  const defaultPlaceholder = {
    vehicleId: "No",
    driveMode: "No",
    speed: 0,
    battery: 0,
    isCharging: 0,
    endurance: 0,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    mapName: "--",
    currentPoint: "--",
    taskId: "No",
    robotTaskId: "--",
    taskStatus: "No",
    odometer: 0,
    isOpen: 0,
  };

  // --- HÀM MỚI: GỬI MAP VỀ SERVER ---
  const uploadMapToBackend = async (data) => {
    if (!data) return;

    try {
      console.log("📤 Đang chuẩn bị gửi Map...");

      // 1. Lọc bỏ Stoppoint (Chỉ giữ lại node và các điểm không phải stoppoint như logic bạn muốn)
      // Lưu ý: data.points chứa tất cả, ta filter giữ lại type='node' hoặc type='waypoint'
      // Tùy logic của bạn, nếu muốn giữ 'node' thì: p.type === 'node'
      const filteredPoints = data.points ? data.points.filter(p => p.type !== 'stoppoint') : [];

      // 2. Chuẩn bị gói tin đúng cấu trúc Backend đang chờ (Map<String, Object>)
      const mapPayload = {
        nodes: data.nodes || [],
        points: filteredPoints,
        lanes: data.lanes || [],
        // Gửi thêm mapInfo nếu backend cần lưu kích thước map
        mapInfo: data.map_info || {}
      };

      console.log("📦 Payload gửi đi:", mapPayload);

      // 3. Gửi Request
      const response = await fetch(API_DATA_MAP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mapPayload),
      });

      const result = await response.json();

      if (result.status === "SUCCESS") {
        alert("✅ Upload Map thành công!");
        console.log("Server response:", result);
      } else {
        alert("❌ Server báo lỗi: " + result.message);
      }

    } catch (error) {
      console.error("Lỗi gửi Map:", error);
      alert("❌ Lỗi kết nối tới Backend!");
    }
  };

  const parseYamlContent = (content) => {
    const result = {};
    const lines = content.split("\n");
    lines.forEach((line) => {
      const [key, value] = line.split(":").map((str) => str.trim());
      if (key && value) {
        if (key === "resolution") {
          result.resolution = parseFloat(value);
        } else if (key === "origin") {
          // origin thường là dạng [-68.75, -68.75, 0.0]
          try {
            result.origin = JSON.parse(value);
          } catch {
            // Fallback nếu parse JSON thất bại (parse chuỗi thủ công)
            const cleanValue = value.replace(/[\[\]]/g, "");
            result.origin = cleanValue.split(",").map(Number);
          }
        } else if (key === "image") {
          result.image = value;
        }
      }
    });
    return result;
  };

  const robotList = Object.values(robots);
  const dataToShow = selectedRobotId ? robots[selectedRobotId] : robotList.length > 0 ? robotList[0] : defaultPlaceholder;

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // 1. Quản lý Layer
    const pathLayerId = "global-path-multi-layer";
    const layers = mapInstanceRef.current.getLayers().getArray();
    let pathLayer = layers.find((l) => l.get("id") === pathLayerId);

    if (pathLayer) {
      pathLayer.getSource().clear(); // Xóa cũ vẽ mới
    } else {
      pathLayer = new VectorLayer({
        source: new VectorSource(),
        properties: { id: pathLayerId },
        zIndex: 10,
      });
      mapInstanceRef.current.addLayer(pathLayer);
    }

    const [originX, originY] = mapOrigin;

    // 2. Duyệt qua từng xe trong robotPaths để vẽ
    Object.entries(robotPaths).forEach(([vehicleId, pathData]) => {
      if (!pathData || pathData.length <= 1) return;

      // Đổi tọa độ mét -> pixel
      const coordinates = pathData.map((p) => [originX + p.x * pixelsPerMm, originY + p.y * pixelsPerMm]);

      const routeFeature = new Feature({
        geometry: new LineString(coordinates),
      });

      // Sinh màu riêng cho xe
      const color = getColorForRobot(vehicleId);

      routeFeature.setStyle(
        new Style({
          stroke: new Stroke({ color: color, width: 4 }),
          // (Option) Hiện tên xe ở đầu đường
          text: new Text({
            text: vehicleId,
            font: "bold 14px Arial",
            fill: new Fill({ color: color }),
            stroke: new Stroke({ color: "#fff", width: 3 }),
            placement: "point",
            offsetY: -10,
          }),
        }),
      );

      pathLayer.getSource().addFeature(routeFeature);
    });
  }, [robotPaths, mapOrigin, pixelsPerMm]);

  useEffect(() => {
    mapOriginRef.current = mapOrigin;
  }, [mapOrigin]);

  useEffect(() => {
    // const SHOULD_CONNECT_WEBSOCKET = true;
    if (!isWsEnabled) {
      // <--- Sửa ở đây
      console.warn("WebSocket connection is DISABLED by user toggle.");
      setLoading(false);
      setIsWsConnected(false);
      return; // Dừng lại, không kết nối
    }

    if (!stompClientRef.current) {
      console.log("Creating new Stomp client...");
      const client = new Client({
        // webSocketFactory: () => new SockJS("/ws"),
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 5000,
        debug: (str) => console.log(`[WS] ${new Date().toLocaleTimeString()}: ${str}`),
        onConnect: () => {
          console.log("WebSocket connected successfully");
          setIsWsConnected(true);
          client.subscribe("/topic/vehicle-status", (message) => {
            const receivedData = JSON.parse(message.body);
            if (receivedData.status === "DISCONNECTED") {
              console.log(` Xe ${receivedData.vehicleId} mất kết nối -> Xóa khỏi bản đồ.`);

              setRobots((prevRobots) => {
                const newRobots = { ...prevRobots };
                delete newRobots[receivedData.vehicleId]; // Xóa key xe khỏi object state

                // Nếu xe bị xóa đang được chọn -> Bỏ chọn
                if (selectedRobotId === receivedData.vehicleId) {
                  // Lưu ý: Cần xử lý logic bỏ chọn ở cấp cha nếu cần thiết,
                  // nhưng ở đây xóa khỏi map là quan trọng nhất.
                }

                // Xóa Feature trên bản đồ OpenLayers ngay lập tức
                if (layersRef.current.robotLayer) {
                  const feature = layersRef.current.robotLayer.getSource().getFeatureById(receivedData.vehicleId);
                  if (feature) {
                    layersRef.current.robotLayer.getSource().removeFeature(feature);
                  }
                }

                return newRobots;
              });
              return; // Dừng xử lý, không update tọa độ nữa
            }
            setRobots((prevRobots) => {
              const robotId = receivedData.vehicleId;

              // Lấy data cũ của robot này (hoặc 1 object rỗng nếu chưa có)
              const existingRobot = prevRobots[robotId] || {};
              const updatedRobot = {
                ...existingRobot, // Giữ lại tất cả các trường cũ (như speed, x, y)
                ...receivedData, // Ghi đè/thêm các trường mới (như dist_left)
              };
              console.log(`[WS_UPDATE] Robot: ${robotId}`, updatedRobot);

              const updatedRobots = {
                ...prevRobots,
                [robotId]: updatedRobot, // Lưu object đã gộp
              };

              if (onAllRobotsUpdate) {
                onAllRobotsUpdate(updatedRobots);
              }
              return updatedRobots;
            });
          });

          client.subscribe("/topic/global-path", (message) => {
            try {
              const parsed = JSON.parse(message.body);
              console.log(">>> [DEBUG_PATH] Data từ Backend:", parsed);
              const vId = parsed.vehicleId || "UNKNOWN";
              let rawPoses = [];

              // CHỈ XỬ LÝ DẠNG POINTS (Do Backend mới gửi lên)
              if (Array.isArray(parsed.points)) {
                rawPoses = parsed.points;
              }

              if (rawPoses.length > 0) {
                console.log(`[PageMap] ✅ Nhận ${rawPoses.length} điểm quỹ đạo cho xe: ${vId}`);

                // Vì Backend đã gửi thẳng {x, y} nên không cần map phức tạp nữa
                // Nhưng giữ map để đảm bảo an toàn data
                const formattedPath = rawPoses.map((p) => ({
                  x: p.x,
                  y: p.y,
                }));

                setRobotPaths((prev) => ({
                  ...prev,
                  [vId]: formattedPath,
                }));
              }
            } catch (e) {
              console.error("❌ Lỗi xử lý Global Path:", e);
            }
          });

          client.subscribe("/topic/alerts", (message) => {
            try {
              const alertData = JSON.parse(message.body);
              console.log("🔔 [ALERT By ROBOT]:", alertData);

              // 1. Nếu Robot báo NHẬN LỆNH THÀNH CÔNG
              if (alertData.type === "TASK_ACK" || alertData.type === "TASK_SLICE_ACK" || alertData.type === "TASK_PAUSED" || alertData.type === "TASK_RESUMED" || alertData.type === "TASK_CANCELED") {
                alert(`ROBOT confirm: ${alertData.message}`);
              }
              // 2. Nếu Robot báo LỖI TỪ CHỐI LỆNH hoặc MẤT MẠNG (Timeout)
              else if (alertData.type === "TASK_FAILED" || alertData.type === "TASK_TIMEOUT") {
                alert(`❌ ROBOT Refuse / LỖI: ${alertData.message}`);
              }
              // 3. Các sự kiện xe tới đích
              else if (alertData.type === "TASK_FINISHED") {
                alert(`🏁 Finish: ${alertData.message}`);
              }

              // (Tùy chọn) Tăng biến đếm thông báo ở góc màn hình
              setUnreadAlertCount((prev) => prev + 1);

            } catch (e) {
              console.error("Lỗi parse alert:", e);
            }
          });
        },
        onDisconnect: () => {
          // ... (giữ nguyên)
        },
        onStompError: (error) => {
          // ... (giữ nguyên)
        },
      });
      stompClientRef.current = client;
    }

    if (!stompClientRef.current.active) {
      console.log("Activating Stomp client...");
      stompClientRef.current.activate();
    }

    setLoading(false);

    return () => {
      if (stompClientRef.current && stompClientRef.current.active) {
        console.log("Deactivating Stomp client (due to toggle or unmount)...");
        stompClientRef.current.deactivate();
      }
    };
  }, [isWsEnabled]);

  useEffect(() => {
    isManualModeRef.current = isManualMode;
    console.log("Mode changed to:", isManualMode ? "MANUAL" : "AUTO");
  }, [isManualMode]);

  // ✅ EFFECT: VẼ TOÀN BỘ TOPO MAP (Forbidden, Lanes, ControlPoints, Nodes, Stoppoints)
  useEffect(() => {
    if (!mapInstanceRef.current || !layersRef.current.topoLayer || !topoData) return;

    // Nếu chưa set Origin thì không vẽ, hoặc bạn có thể bỏ dòng này nếu muốn vẽ ngay
    // if (!hasOriginBeenSet) return; 

    const source = layersRef.current.topoLayer.getSource();
    source.clear(); // Xóa sạch để vẽ lại từ đầu

    const [originX, originY] = mapOrigin;

    // =========================================================
    // 1. VẼ VÙNG CẤM (Forbidden Area) - Lớp dưới cùng (Z: 1)
    // =========================================================
    if (topoData.map && topoData.map.forbiddenArea) {
      topoData.map.forbiddenArea.forEach((area) => {
        if (area.points && area.points.length > 0) {
          const pixelCoords = area.points.map((p) => {
            return [originX + p.x * pixelsPerMm, originY + p.y * pixelsPerMm];
          });
          pixelCoords.push(pixelCoords[0]); // Đóng vòng

          const polygonFeature = new Feature({ geometry: new Polygon([pixelCoords]) });
          polygonFeature.setStyle(
            new Style({
              fill: new Fill({ color: "rgba(255, 0, 0, 0.15)" }),
              stroke: new Stroke({ color: "red", width: 1, lineDash: [4, 4] }),
              zIndex: 1
            })
          );
          source.addFeature(polygonFeature);
        }
      });
    }

    // =========================================================
    // 2. VẼ ĐƯỜNG ĐI (Lanes) & CONTROL POINTS (Z: 5 & 6)
    // =========================================================
    if (topoData.lanes) {
      topoData.lanes.forEach((lane) => {
        if (lane.anchor_points && lane.anchor_points.length >= 2 && lane.control_points) {
          // --- A. VẼ ĐƯỜNG CONG (LANE) ---
          const start = lane.anchor_points[0];
          const end = lane.anchor_points[1];
          // Topo json: control_points là mảng lồng [[p1, p2]]
          const cp1 = lane.control_points[0][0];
          const cp2 = lane.control_points[0][1];

          // Đổi sang Pixel
          const pStart = [originX + start.x * pixelsPerMm, originY + start.y * pixelsPerMm];
          const pEnd = [originX + end.x * pixelsPerMm, originY + end.y * pixelsPerMm];
          const pCp1 = [originX + cp1.x * pixelsPerMm, originY + cp1.y * pixelsPerMm];
          const pCp2 = [originX + cp2.x * pixelsPerMm, originY + cp2.y * pixelsPerMm];

          // Tính toán Bezier
          const curveCoords = generateBezierPath(pStart, pEnd, pCp1, pCp2, 25);

          const laneFeature = new Feature({
            geometry: new LineString(curveCoords),
            type: "lane",
            id: lane.lane_id
          });

          laneFeature.setStyle(
            new Style({
              stroke: new Stroke({
                color: "#6c757d", // Màu xám đường
                width: 2,
                lineCap: "round"
              }),
              zIndex: 5
            })
          );
          source.addFeature(laneFeature);

          // --- B. VẼ CONTROL POINTS (XANH DƯƠNG) ---
          // Vẽ 2 điểm điều khiển để biết độ cong
          // --- B. VẼ CONTROL POINTS (ĐỎ) ---
          // Vẽ 2 điểm điều khiển để biết độ cong
          // [pCp1, pCp2].forEach((cpCoord, idx) => {
          //   const cpFeature = new Feature({
          //     geometry: new Point(cpCoord),
          //     type: "control-point"
          //   });
          //   cpFeature.setStyle(
          //     new Style({
          //       image: new CircleStyle({
          //         radius: 3, // Nhỏ hơn node
          //         fill: new Fill({ color: "#FF0000" }), // 🔴 ĐỔI THÀNH ĐỎ ĐỂ NHẬN DIỆN LÀ ĐIỂM ẢO
          //         stroke: null
          //       }),
          //       zIndex: 6 // Nằm trên đường nhưng dưới Node
          //     })
          //   );
          //   source.addFeature(cpFeature);
          // });
        }
      });
    }

    // =========================================================
    // 3. VẼ POINTS (Node: Đỏ, Stoppoint: Xanh lá) (Z: 15 & 20)
    // =========================================================
    if (topoData.points) {
      topoData.points.forEach((pt) => {
        const px = originX + pt.x * pixelsPerMm;
        const py = originY + pt.y * pixelsPerMm;

        const pointFeature = new Feature({
          geometry: new Point([px, py]),
          yaw: pt.yaw || 0,
        });

        // Lưu dữ liệu gốc để xử lý click
        pointFeature.setProperties({
          type: "topo-point",
          originalData: {
            id: pt.id,
            x: pt.x,
            y: pt.y,
            yaw: pt.yaw || 0,
            type: pt.type // Lưu type để debug nếu cần
          },
        });

        // --- STYLE LOGIC ---
        pointFeature.setStyle((feature) => {
          const geometry = feature.getGeometry();
          const coordinates = geometry.getCoordinates();
          const yaw = feature.get("yaw");

          let color = "#888888"; // Mặc định xám
          let radius = 5;
          let zIndex = 15;
          let strokeColor = "white";

          // 🔴 NODE: xanh dương
          if (pt.type === "node") {
            color = "#0055ff"; // 🔵 ĐỔI THÀNH XANH DƯƠNG
            radius = 5;
            zIndex = 15;
          }
          // 🟢 STOPPOINT: MÀU XANH LÁ
          else if (pt.type === "stoppoint" || pt.type === "waypoint") {
            color = "#00FF00";
            radius = 7; // Điểm dừng to hơn để dễ click
            zIndex = 20; // Nằm trên cùng
            strokeColor = "black";
          }

          // Hình tròn chính
          const circleStyle = new Style({
            image: new CircleStyle({
              radius: radius,
              fill: new Fill({ color: color }),
              stroke: new Stroke({ color: strokeColor, width: 1.5 }),
            }),
            zIndex: zIndex,
          });

          const styles = [circleStyle];

          // Nếu là Stoppoint thì vẽ thêm kim chỉ hướng Yaw
          if (pt.type === "stoppoint" || pt.type === "waypoint") {
            const lineLength = radius + 5;
            const endX = coordinates[0] + lineLength * Math.cos(yaw);
            const endY = coordinates[1] - lineLength * Math.sin(yaw); // Trục Y canvas thường ngược, cẩn thận chỗ này tùy map

            const lineStyle = new Style({
              geometry: new LineString([coordinates, [endX, endY]]),
              stroke: new Stroke({
                color: "#FF0000", // Kim màu đỏ
                width: 2,
                lineCap: "round",
              }),
              zIndex: zIndex + 1,
            });
            styles.push(lineStyle);
          }

          // (Tùy chọn) Hiển thị ID cạnh điểm
          // const textStyle = new Style({
          //     text: new Text({
          //         text: `${pt.id}`,
          //         font: '10px Arial',
          //         offsetY: -12,
          //         fill: new Fill({ color: '#fff' }),
          //         stroke: new Stroke({ color: '#000', width: 2 })
          //     }),
          //     zIndex: zIndex + 2
          // });
          // styles.push(textStyle);

          return styles;
        });

        source.addFeature(pointFeature);
      });
    }

    console.log("✅ Đã vẽ Full Topo: Forbidden, Lanes (Gray), ControlPoints (Blue), Nodes (Red), Stoppoints (Green).");
  }, [topoData, mapOrigin, hasOriginBeenSet, pixelsPerMm]);

  const handleWaypointFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const lines = content.split("\n");

      // Xóa các điểm cũ
      const vectorSource = layersRef.current.waypointLayer ? layersRef.current.waypointLayer.getSource() : null;
      if (vectorSource) vectorSource.clear();

      lines.forEach((line, index) => {
        if (index === 0) return; // Bỏ qua header
        const lineTrim = line.trim();
        if (!lineTrim) return;

        const parts = lineTrim.split(",");
        if (parts.length < 2) return;

        const p_x = parseFloat(parts[1]); // Cột 2 là X
        const p_y = parseFloat(parts[2]); // Cột 3 là Y
        const p_z = parseFloat(parts[3]) || 0; // Cột 4 là Z (nếu có)

        if (isNaN(p_x) || isNaN(p_y)) return;

        // Convert mét -> pixel
        const [originX, originY] = mapOrigin;
        const mapX = originX + p_x * pixelsPerMm;
        const mapY = originY + p_y * pixelsPerMm;
        const defaultName = `Point-${index}`;

        // Tạo Feature
        const pointFeature = new Feature({
          geometry: new Point([mapX, mapY]),
          name: defaultName, // Dùng tên giả
        });

        // Lưu dữ liệu gốc
        pointFeature.setProperties({
          type: "waypoint",
          originalData: {
            parkPointId: defaultName,
            name: defaultName,
            x: p_x,
            y: p_y,
            z: p_z,
          },
        });

        // Style chấm xanh
        pointFeature.setStyle(
          new Style({
            image: new CircleStyle({
              radius: 5,
              fill: new Fill({ color: "#007bff" }),
              stroke: new Stroke({ color: "white", width: 1 }),
            }),
            // Nếu không cần hiện tên lên map thì xóa phần text: new Text(...) đi cũng được
            text: new Text({
              text: defaultName,
              offsetY: -10,
              font: "10px sans-serif",
              fill: new Fill({ color: "#000" }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
          }),
        );

        if (vectorSource) vectorSource.addFeature(pointFeature);
      });
      setShowSetupMenu(false);
    };
    reader.readAsText(file);
  };

  const fwdArrow = new Style({
    text: new Text({
      text: "↑", // Đi tới
      font: "24px Arial",
      fill: new Fill({ color: "rgba(0, 255, 0, 0.8)" }), // Màu xanh
      offsetY: -30, // Đặt phía trước xe
    }),
  });

  const revArrow = new Style({
    text: new Text({
      text: "↓", // Đi lùi
      font: "24px Arial",
      fill: new Fill({ color: "rgba(255, 0, 0, 0.8)" }), // Màu đỏ
      offsetY: 30, // Đặt phía sau xe
    }),
  });

  const leftArrow = new Style({
    text: new Text({
      text: "↰", // Rẽ trái
      font: "24px Arial",
      fill: new Fill({ color: "rgba(0, 150, 255, 0.8)" }), // Màu xanh dương
      offsetX: -25, // Đặt bên trái xe
    }),
  });

  const rightArrow = new Style({
    text: new Text({
      text: "↱", // Rẽ phải
      font: "24px Arial",
      fill: new Fill({ color: "rgba(0, 150, 255, 0.8)" }), // Màu xanh dương
      offsetX: 25, // Đặt bên phải xe
    }),
  });

  const createIcon = (src, scale = 1, rotation = 0) =>
    new Style({
      image: new Icon({ src, scale, rotation, anchor: [0.5, 0.5] }),
    });

  const createFeature = (x, y, style, data = {}) => {
    const feature = new Feature({
      geometry: new Point([x, y]),
      ...data,
    });
    feature.setStyle(style);
    return feature;
  };

  // ✅ SỬA LẠI ĐOẠN VẼ DESTINATIONS (DÒNG 252 - 279)
  useEffect(() => {
    if (!mapInitialized.current || !layersRef.current.targetLayer) return;

    const source = layersRef.current.targetLayer.getSource();
    source.clear(); // Xóa cũ

    if (!destinations || destinations.length === 0) return;

    // Lấy gốc tọa độ để tính lại vị trí Pixel
    const [originX, originY] = mapOrigin;
    const pathCoordinates = []; // Chứa các điểm pixel để vẽ đường dây

    destinations.forEach((point, index) => {
      // --- KHẮC PHỤC LỖI Ở ĐÂY ---
      // Phải đổi từ Mét -> Pixel: (Gốc + Mét * Tỉ lệ)
      const pixelX = originX + point.x * pixelsPerMm;
      const pixelY = originY + point.y * pixelsPerMm;
      const pixelCoord = [pixelX, pixelY];

      pathCoordinates.push(pixelCoord); // Lưu lại để vẽ dây

      const feature = new Feature({
        geometry: new Point(pixelCoord), // Vẽ đúng vị trí pixel
      });

      // Style: Màu vàng theo ý bạn
      let color = "#ffc107"; // Vàng
      if (index === 0) color = "#00e676"; // Start: Xanh lá

      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: color }),
            stroke: new Stroke({ color: "white", width: 2 }),
          }),
          text: new Text({
            text: `${index + 1}`,
            font: "bold 14px Arial",
            fill: new Fill({ color: "white" }),
            stroke: new Stroke({ color: "black", width: 3 }),
            offsetY: -18,
          }),
        }),
      );
      source.addFeature(feature);
    });
  }, [destinations, mapOrigin, pixelsPerMm]); // Quan trọng: Thêm mapOrigin, pixelsPerMm vào dependency

  useEffect(() => {
    // Nếu map đã khởi tạo rồi thì return
    if (mapInitialized.current) return;
    if (!mapRef.current) return;

    // 🛑 LOGIC MỚI: KIỂM TRA LOẠI MAP
    let mainLayer;
    let viewConfig;

    if (mapType === "satellite") {
      // === CASE 1: MAP VỆ TINH ===
      mainLayer = new TileLayer({
        source: new XYZ({
          url: satelliteURL,
          attributions: "© Google Maps",
        }),
      });

      viewConfig = new View({
        // Tọa độ trung tâm mặc định (Ví dụ: Hà Nội)
        // Bạn có thể thay bằng tọa độ kho bãi của bạn [Kinh độ, Vĩ độ]
        center: fromLonLat([105.78, 21.02]),
        zoom: 18, // Zoom sát mặt đất
        maxZoom: 22,
      });

      // Lưu ý: Khi dùng vệ tinh, pixelsPerMm sẽ không còn cố định như ảnh tĩnh
      // Nó phụ thuộc vào mức Zoom. Logic vẽ robot có thể bị lệch nếu không convert tọa độ GPS.
    } else {
      // === CASE 2: MAP ẢNH TĨNH (CODE CŨ) ===
      if (!mapImageUrl) return; // Nếu chưa có ảnh thì không vẽ

      const imageExtent = [0, 0, mapImageSize[0], mapImageSize[1]];
      const imageProjection = new Projection({
        code: "pixel-map",
        units: "pixels",
        extent: imageExtent,
      });

      mainLayer = new ImageLayer({
        source: new ImageStatic({
          url: mapImageUrl,
          projection: imageProjection,
          imageExtent: imageExtent,
        }),
      });

      viewConfig = new View({
        projection: imageProjection,
        center: [mapImageSize[0] / 2, mapImageSize[1] / 2],
        zoom: 2,
        maxZoom: 8,
        minZoom: 0,
      });

      baseLayer.current = mainLayer; // Lưu ref để dùng sau nếu cần
    }

    layersRef.current.waypointLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 15, // Nằm trên bản đồ, dưới robot
      style: new Style({
        // Style mặc định (phòng hờ)
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: "blue" }),
        }),
      }),
    });

    // Khởi tạo các layer vector (giữ nguyên)
    layersRef.current.robotLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 15,
    });

    originLayerRef.current = new VectorLayer({
      source: new VectorSource(),
      zIndex: 5,
    });
    layersRef.current.targetLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 20, // Để zIndex cao để điểm vẽ đè lên trên cùng
    });
    layersRef.current.topoLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 12, // Nằm trên map nền, dưới robot
    });

    layersRef.current.plannedPathLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 14, // Nằm trên topo, dưới robot
    });

    // // Tạo View (khung nhìn) cho bản đồ
    // const mapView = new View({
    //   projection: imageProjection,
    //   center: [800, 500],
    //   zoom: 2,
    //   maxZoom: 8, // Giới hạn zoom
    //   minZoom: 0,
    // });

    const map = new OLMap({
      target: mapRef.current,
      layers: [
        mainLayer, // Layer nền (Vệ tinh hoặc Ảnh tĩnh)
        layersRef.current.topoLayer,
        layersRef.current.robotLayer,
        originLayerRef.current,
        layersRef.current.targetLayer,
        layersRef.current.waypointLayer,
        layersRef.current.plannedPathLayer,
      ],
      view: viewConfig, // View đã config ở trên
      controls: [],
    });
    mapInstanceRef.current = map;

    // Cập nhật gốc tọa độ ban đầu (vẽ marker)
    // setMapOrigin([0, 0]); // 🔥 ĐÃ XÓA: Không ép nó về 0,0 nữa
    setMapOrigin(prev => [...prev]);
    originLayerRef.current.getSource().clear();
    // 🔥 Lấy chính xác tọa độ (1375, 1375) đã tính toán trước đó để vẽ Marker hình chữ X
    const originFeature = createFeature(mapOrigin[0], mapOrigin[1], customOriginStyle);
    originLayerRef.current.getSource().addFeature(originFeature);

    const popup = new Overlay({
      element: popupRef.current,
      offset: [0, -20],
      positioning: "bottom-center",
    });
    map.addOverlay(popup);

    // Xử lý hover (giữ nguyên, nhưng giờ sẽ hiển thị tọa độ x, y)
    map.on("pointermove", (e) => {
      const feature = map.forEachFeatureAtPixel(e.pixel, (ft) => ft);
      const mapElement = map.getViewport();
      if (feature) {
        const props = feature.getProperties();
        if (["robot", "robot-manual"].includes(props.type)) {
          mapElement.style.cursor = "pointer";
          setHoverInfo({
            name: props.name,
            // ❗ Sửa lat/lng thành x/y
            x: props.x,
            y: props.y,
            parkPointId: props.parkPointId,
            coordinate: e.coordinate,
          });
          popup.setPosition(e.coordinate);
          return;
        }
      }
      mapElement.style.cursor = "auto";
      setHoverInfo(null);
      popup.setPosition(undefined);
    });

    // ✅ BƯỚC 6: SỬA HÀM CLICK ĐỂ CÓ CHẾ ĐỘ "CHỌN GỐC TỌA ĐỘ"
    const handleMapClick = (e) => {
      const clickedCoord = e.coordinate; // Đây là tọa độ [x, y] trên map

      // Kịch bản 1: Đang ở chế độ "Set Origin"
      if (isSetOriginModeRef.current) {
        setMapOrigin(clickedCoord);
        setHasOriginBeenSet(true);
        setIsSetOriginMode(false); // Tắt chế độ

        // Vẽ lại marker cho gốc tọa độ
        originLayerRef.current.getSource().clear();
        const originFeature = createFeature(clickedCoord[0], clickedCoord[1], customOriginStyle);
        originLayerRef.current.getSource().addFeature(originFeature);

        console.log("New origin set at map coordinates:", clickedCoord);
        return; // Dừng xử lý
      }

      // Kịch bản 2: Click bình thường
      const feature = map.forEachFeatureAtPixel(e.pixel, (ft) => ft, {
        hitTolerance: 10,
      });

      if (feature) {
        const props = feature.getProperties();
        const featureType = props.type;

        // Click trúng robot
        if (featureType === "robot") {
          // ... (logic này vẫn giữ nguyên)
          setSelectedRobotId(props.vehicleId);
          const clickedRobotData = Object.values(robots).find((r) => r.vehicleId === props.vehicleId);
          if (clickedRobotData && onRobotSelect) {
            onRobotSelect(clickedRobotData);
          }
          return;
        }
      }
    };

    map.on("singleclick", (e) => {
      // 1. Ưu tiên: Logic đặt gốc (Set Origin) - Giữ nguyên
      if (isSetOriginModeRef.current) {
        const clickedCoord = e.coordinate;
        setMapOrigin(clickedCoord);
        setHasOriginBeenSet(true);
        setIsSetOriginMode(false);

        originLayerRef.current.getSource().clear();
        const f = new Feature({ geometry: new Point(clickedCoord) });
        f.setStyle(customOriginStyle);
        originLayerRef.current.getSource().addFeature(f);

        // Xóa waypoint cũ vì gốc đã đổi
        if (layersRef.current.waypointLayer) {
          layersRef.current.waypointLayer.getSource().clear();
        }
        return;
      }

      // 2. Logic chọn điểm Waypoint
      // hitTolerance: 12 -> Tăng vùng click lên 20px
      const feature = map.forEachFeatureAtPixel(e.pixel, (ft) => ft, {
        hitTolerance: 12,
      });

      if (feature) {
        const props = feature.getProperties();

        // A. Nếu click trúng Robot -> Chọn xe + mở map popup nếu APPROVED
        if (props.type === "robot") {
          const currentRobotData = robotsRef.current[props.vehicleId];
          setSelectedRobotId(props.vehicleId);
          if (onRobotSelect && currentRobotData) {
            onRobotSelect(currentRobotData);
          }
          // Open map assignment popup for approved robots
          if (currentRobotData && currentRobotData.connectionStatus === "APPROVED") {
            openMapPopup(props.vehicleId);
          }
          return;
        }

        // B. NẾU CLICK TRÚNG Point
        if (props.type === "topo-point" && onMapPointClick) {
          const data = props.originalData;
          console.log("👆 Clicked Topo Point:", data);

          // Gửi dữ liệu điểm này ra ngoài (vào destinations)
          onMapPointClick({
            parkPointId: data.id, // ID điểm
            name: `Point ${data.id}`, // Tên hiển thị
            x: data.x,
            y: data.y,
            z: 0,
            yaw: data.yaw,
          });
          return; // Xử lý xong thì return, không chạy xuống manual click nữa
        }
      }
      if (isManualModeRef.current && onMapPointClick) {
        const [originX, originY] = mapOriginRef.current;
        const clickedPixel = e.coordinate;

        // Convert Pixel -> Mét
        const x_mm = (clickedPixel[0] - originX) / pixelsPerMm;
        // Lưu ý: Hệ trục y của ảnh thường hướng xuống, còn bản đồ thực địa có thể hướng lên
        // Nếu thấy Y bị ngược dấu thì đổi thành: -(clickedPixel[1] - originY)
        const y_mm = (clickedPixel[1] - originY) / pixelsPerMm;

        console.log(`Manual Click: ${x_mm.toFixed(2)}, ${y_mm.toFixed(2)}`);

        onMapPointClick({
          parkPointId: `Manual_${Date.now()}`,
          name: `M (${x_mm.toFixed(1)}, ${y_mm.toFixed(1)})`,
          x: x_mm,
          y: y_mm,
          z: 0,
        });
      }

      // C. ⛔ NẾU CLICK RA NGOÀI (Không trúng gì cả) kHÔNG làm gì hết. Tuyệt đối không gửi tọa độ linh tinh.
      console.log("Click ignored (Clicked empty space)");
    });

    mapInitialized.current = true;
    console.log("Map initialized successfully with 2D Image.");

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.un("singleclick", handleMapClick);
        mapInstanceRef.current.setTarget(null);
        mapInstanceRef.current = null;
        mapInitialized.current = false;
        console.log("Map instance destroyed on unmount.");
      }
    };
    // ❗ Chạy 1 lần duy nhất khi component mount
  }, [mapInstanceRef, mapImageUrl, mapImageSize, loading, mapType]);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapInitialized.current || Object.keys(robots).length === 0) return;

    const robotLayerSource = layersRef.current.robotLayer.getSource();

    if (!hasOriginBeenSet) {
      robotLayerSource.clear();
      return;
    }
    const [originX, originY] = mapOrigin;

    Object.values(robots).forEach((robot) => {
      // 1. Cập nhật tốc độ (giữ nguyên)
      robotSpeedsRef.current[robot.vehicleId] = robot.speed;

      // 2. Kiểm tra dữ liệu (giữ nguyên)
      if (typeof robot.x === "undefined" || typeof robot.y === "undefined") {
        return;
      }

      const robotId = robot.vehicleId;

      // 3. Tính toán dữ liệu THÔ (Raw)
      // Robot gửi tọa độ dạng Mét, nhưng pixelsPerMm cần Millimet → nhân 1000
      const x_mm = robot.x * 1000;
      const y_mm = robot.y * 1000;
      const x_pixels = x_mm * pixelsPerMm;
      const y_pixels = y_mm * pixelsPerMm;
      const mapX = originX + x_pixels;
      const mapY = originY + y_pixels;
      const newRawCoords = [mapX, mapY];

      // 🔥 SỬA: Dùng trực tiếp 'yaw' từ Backend
      // Lưu ý: Backend gửi Độ (Degrees), OpenLayers cần Radian
      const rotationDegree = robot.yaw || 0;
      const newRawRotation = (rotationDegree * Math.PI) / 180;

      // 4. Lấy "Mục tiêu ảo" (Smoothed Target) CŨ
      const oldTarget = animationTargetsRef.current[robotId] || {
        coords: newRawCoords,
        rotation: newRawRotation,
      };

      // 5. TẠO "MỤC TIÊU ẢO" MỚI (Lớp lọc 1: Lọc nhiễu)
      const targetSmoothingFactor = 0.8; // Càng nhỏ càng mượt, nhưng càng trễ

      // Lọc tọa độ
      const smoothedX = oldTarget.coords[0] * (1 - targetSmoothingFactor) + newRawCoords[0] * targetSmoothingFactor;
      const smoothedY = oldTarget.coords[1] * (1 - targetSmoothingFactor) + newRawCoords[1] * targetSmoothingFactor;
      const smoothedCoords = [smoothedX, smoothedY];

      // Lọc góc xoay (xử lý khi qua 360 độ)
      let delta = newRawRotation - oldTarget.rotation;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      const smoothedRotation = oldTarget.rotation + delta * targetSmoothingFactor;

      // 6. Tạo Feature (nếu chưa có)
      let robotFeature = robotLayerSource.getFeatureById(robotId);
      if (!robotFeature) {
        robotFeature = new Feature({
          geometry: new Point(smoothedCoords), // Dùng tọa độ ĐÃ LÀM MƯỢT
          type: "robot",
          vehicleId: robotId,
          name: robot.name || `Robot ${robotId}`,
          x: robot.x,
          y: robot.y,
        });
        robotFeature.setId(robotId);
        const style = new Style({
          image: new Icon({
            src: carIcon,
            scale: 0.06,
            anchor: [0.5, 0.5],
            rotation: smoothedRotation, // Dùng góc ĐÃ LÀM MƯỢT
          }),
        });
        robotFeature.setStyle([style]); // Đặt style (trong mảng)
        robotLayerSource.addFeature(robotFeature);
      } else {
        // Cập nhật dữ liệu cho popup
        robotFeature.setProperties({
          name: robot.name || `Robot ${robotId}`,
          x: robot.x,
          y: robot.y,
        });
      }

      // 7. ĐẶT MỤC TIÊU (ĐÃ LÀM MƯỢT)
      // Vòng lặp animate (Lớp lọc 2) sẽ đuổi theo "mục tiêu ảo" này
      animationTargetsRef.current[robotId] = {
        coords: smoothedCoords,
        rotation: smoothedRotation,
      };
    });
  }, [robots, mapOrigin, pixelsPerMm]); //

  useEffect(() => {
    // Tốc độ di chuyển (0.1 = rất mượt, 0.5 = nhanh, 1.0 = tắt)
    const easingFactor = 0.35;
    let animationFrameId = null;

    const animate = () => {
      const robotLayerSource = layersRef.current.robotLayer?.getSource();

      if (!robotLayerSource) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      Object.keys(animationTargetsRef.current).forEach((vehicleId) => {
        const feature = robotLayerSource.getFeatureById(vehicleId);
        const target = animationTargetsRef.current[vehicleId];

        if (!feature || !target) return;

        // 1. Lấy style của xe (là một mảng)
        const styles = feature.getStyle();
        const carStyle = styles[0]; // Style của xe là phần tử đầu tiên

        // 2. Lấy speed từ ref
        const speed = robotSpeedsRef.current[vehicleId] || 0;

        // 3. Tính toán di chuyển
        const currentCoords = feature.getGeometry().getCoordinates();
        const currentRotation = carStyle.getImage().getRotation();

        const nextX = currentCoords[0] + (target.coords[0] - currentCoords[0]) * easingFactor;
        const nextY = currentCoords[1] + (target.coords[1] - currentCoords[1]) * easingFactor;

        let delta = target.rotation - currentRotation;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;
        const nextRotation = currentRotation + delta * easingFactor;

        // 4. Cập nhật VỊ TRÍ
        feature.getGeometry().setCoordinates([nextX, nextY]);

        // 5. Cập nhật XOAY XE
        carStyle.getImage().setRotation(nextRotation);

        let indicatorStyle = null;
        const turnThreshold = 0.02; // Ngưỡng bắt đầu rẽ (radian)
        const speedThreshold = 0.1; // Ngưỡng tốc độ (m/s)

        // Dùng 'delta' (độ chênh lệch góc) để phát hiện rẽ
        if (speed > speedThreshold) {
          if (Math.abs(delta) > turnThreshold) {
            // Đang rẽ
            indicatorStyle = delta > 0 ? rightArrow : leftArrow;
          } else {
            // Đang đi thẳng
            indicatorStyle = fwdArrow;
          }
        } else if (speed < -speedThreshold) {
          // Đang đi lùi (nếu có)
          indicatorStyle = revArrow;
        }

        const newStyles = [carStyle];
        if (indicatorStyle) {
          // Xoay mũi tên/chữ theo hướng xe
          indicatorStyle.getText().setRotation(nextRotation);
          newStyles.push(indicatorStyle);
        }

        //  ✅ SET STYLE MỚI (mảng)
        feature.setStyle(newStyles);
      });

      animationFrameId = requestAnimationFrame(animate);
    };
    // Bắt đầu vòng lặp
    animationFrameId = requestAnimationFrame(animate);

    // Dọn dẹp khi component unmount
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const getStatusClass = (status) => {
    /* ... */
  };
  const getBatteryWidth = (battery) => `${parseInt(battery, 10) || 0}%`;
  const handleBellClick = () => {
    /* ... */
  };

  if (loading && !mapInitialized.current) {
    return <div className="loading-screen">⏳ Loading Map...</div>;
  }

  // --- HÀM XỬ LÝ SET MAP ---
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      // Tự động lấy kích thước ảnh để điền sẵn vào ô input
      const img = new Image();
      img.onload = () => {
        setTempConfig((prev) => ({
          ...prev,
          width: img.width,
          height: img.height,
          previewUrl: url,
        }));
      };
      img.src = url;
    }
  };

  // --- HÀM XỬ LÝ CHỌN THƯ MỤC (MỚI) ---
  const handleDirectorySelect = (e) => {
    const files = Array.from(e.target.files);

    // 1. Tìm file YAML (.yaml hoặc .yml)
    const yamlFile = files.find((f) => f.name.endsWith(".yaml") || f.name.endsWith(".yml"));
    const jsonFile = files.find((f) => f.name.endsWith(".json"));
    if (!yamlFile) {
      alert("Không tìm thấy file .yaml trong thư mục này!");
      return;
    } else if (!jsonFile) {
      alert("Không tìm thấy file .yaml trong thư mục này!");
      return;
    }
    // --- LOGIC ĐỌC JSON ---
    // --- LOGIC ĐỌC JSON (ĐÃ CẬP NHẬT TÍNH TOÁN NODE GẦN NHẤT) ---
 if (jsonFile) {
      const jsonReader = new FileReader();
      jsonReader.onload = (ev) => {
        try {
          const jsonData = JSON.parse(ev.target.result);
          const toMm = (val) => val * 1000; // Hàm ép sang mm

          // ÉP TOÀN BỘ TOPO.JSON SANG MM
          if (jsonData.points) {
            jsonData.points.forEach(p => { p.x = toMm(p.x); p.y = toMm(p.y); });
          }
          if (jsonData.nodes) {
            jsonData.nodes.forEach(n => { n.coordinate.x = toMm(n.coordinate.x); n.coordinate.y = toMm(n.coordinate.y); });
          }
          if (jsonData.lanes) {
            jsonData.lanes.forEach(l => {
              if (l.anchor_points) l.anchor_points.forEach(p => { p.x = toMm(p.x); p.y = toMm(p.y); });
              if (l.control_points) l.control_points.forEach(pair => pair.forEach(p => { p.x = toMm(p.x); p.y = toMm(p.y); }));
              if (l.length) l.length = toMm(l.length);
              if (l.radius) l.radius = toMm(l.radius);
            });
          }
          if (jsonData.map && jsonData.map.forbiddenArea) {
             jsonData.map.forbiddenArea.forEach(area => {
                if (area.points) area.points.forEach(p => { p.x = toMm(p.x); p.y = toMm(p.y); });
             });
          }
          // 🔥 BẮT ĐẦU TÍNH TOÁN NODE GẦN NHẤT 🔥
          if (jsonData.points && jsonData.nodes) {
            console.log("🔄 Đang tính toán Node gần nhất cho từng Point...");

            const enrichedPoints = jsonData.points.map((point) => {
              let minDistance = Infinity;
              let nearestNodeId = null;

              jsonData.nodes.forEach((node) => {
                // 🛑 SỬA: Lấy trực tiếp tọa độ (Vì file json đã là Mét rồi)
                const nodeX = node.coordinate.x;
                const nodeY = node.coordinate.y;

                // 2. Tính khoảng cách Euclid
                const dx = point.x - nodeX;
                const dy = point.y - nodeY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // 3. Tìm Min
                if (dist < minDistance) {
                  minDistance = dist;
                  nearestNodeId = node.content;
                }
              });

              return {
                ...point,
                nearestNodeId: nearestNodeId,
                distanceToNode: minDistance,
              };
            });

            // Cập nhật lại danh sách points đã có thông tin Node
            jsonData.points = enrichedPoints;
          }

          console.log("✅ Đã đọc và xử lý topo.json:", jsonData);
          setTopoData(jsonData); // Lưu vào state

          // Gửi dữ liệu ra ngoài (nếu có dùng)
          if (onTopoLoaded && jsonData.points) {
            onTopoLoaded(jsonData.points);
          }
        } catch (err) {
          console.error("Lỗi parse JSON:", err);
          alert("File JSON lỗi cấu trúc!");
        }
      };
      jsonReader.readAsText(jsonFile);
    }

    // 2. Đọc file YAML
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const parsedData = parseYamlContent(content);

      console.log("YAML Parsed:", parsedData);

      if (!parsedData.image) {
        alert("File YAML không chứa thông tin 'image'!");
        return;
      }

      // 3. Tìm file ảnh tương ứng trong thư mục dựa trên tên trong YAML
      const imageFile = files.find((f) => f.name === parsedData.image);

      if (!imageFile) {
        alert(`Không tìm thấy file ảnh map: ${parsedData.image} trong thư mục!`);
        return;
      }

      // 4. Load ảnh để lấy Width/Height
      const url = URL.createObjectURL(imageFile);
      const img = new Image();
      img.onload = () => {
        // Cập nhật thông tin vào bảng cấu hình tạm
        setTempConfig((prev) => ({
          ...prev,
          width: img.width,
          height: img.height,
          previewUrl: url,
        }));

        // Tính Pixels Per Meter từ Resolution
        // Công thức: 1 mét / resolution (m/px) = px/m
        // Ví dụ: resolution 0.05 => 1 / 0.05 = 20 px/m
        if (parsedData.resolution) {
          const ppmm = 1 / (parsedData.resolution * 1000); 
          setTempResolution(ppmm); 
        }

        // Lưu tạm Origin từ YAML (nếu cần dùng để set gốc tọa độ tự động)
        if (parsedData.origin) {
          // ÉP GỐC TỌA ĐỘ SANG MM
          setTempOrigin([parsedData.origin[0] * 1000, parsedData.origin[1] * 1000]);
        }
      };
      img.src = url;
    };
    reader.readAsText(yamlFile);
  };

  const handleApplyMap = () => {
    // Nếu chọn Static mà chưa có ảnh
    if (tempMapType === "static" && !tempConfig.previewUrl && !mapImageUrl) {
      alert("Chưa chọn ảnh bản đồ!");
      return;
    }

    // Cập nhật State
    setMapType(tempMapType);

    if (tempMapType === "static") {
      const newUrl = tempConfig.previewUrl || mapImageUrl;
      setMapImageUrl(newUrl);
      setMapImageSize([Number(tempConfig.width), Number(tempConfig.height)]);

      // ✅ CẬP NHẬT PIXELS PER METER TỰ ĐỘNG TỪ YAML
      if (tempResolution) {
        setPixelsPerMm(tempResolution);
        console.log(`Đã cập nhật tỉ lệ bản đồ: ${tempResolution} px/m`);
      }

      // 🔥 LOGIC MỚI: TỰ ĐỘNG CHỐT GỐC TỌA ĐỘ TỪ FILE YAML
      if (tempOrigin && tempResolution) {
        // tempOrigin đang là [-68.75, -68.75]. Ta dùng Math.abs để ép thành số dương [68.75, 68.75]
        const positiveOriginX_m = Math.abs(tempOrigin[0]);
        const positiveOriginY_m = Math.abs(tempOrigin[1]);

        // Đổi từ mét sang pixel màn hình
        const autoOriginPixelX = positiveOriginX_m * tempResolution;
        const autoOriginPixelY = positiveOriginY_m * tempResolution;

        // Tự động ghim gốc tọa độ và đánh dấu "đã set origin"
        setMapOrigin([autoOriginPixelX, autoOriginPixelY]);
        setHasOriginBeenSet(true);
        
        console.log(`🎯 Tự động Set Origin: YAML[${tempOrigin[0]}, ${tempOrigin[1]}] -> Dương[${positiveOriginX_m}, ${positiveOriginY_m}]m -> Pixel(${autoOriginPixelX}, ${autoOriginPixelY})`);
      }
      if (topoData) {
        uploadMapToBackend(topoData);
      }
    }

    // Reset Map để useEffect chạy lại
    mapInitialized.current = false;
    if (mapRef.current) mapRef.current.innerHTML = "";

    // Reset Layer Ref
    layersRef.current = {
      robotLayer: null,
      originLayer: null,
      waypointLayer: null,
      targetLayer: null,
      topoLayer: null,
      plannedPathLayer: null
    };

    setShowMapConfig(false);
  };

  return (
    <div className="robot-map-container">
      <div ref={mapRef} className="map-container" />
      <div ref={popupRef} className="map-popup">
        {hoverInfo && (
          <>
            <strong>{hoverInfo.name}</strong>
            <div>X: {hoverInfo.x != null ? hoverInfo.x.toFixed(0) : 0} mm</div>
            <div>Y: {hoverInfo.y != null ? hoverInfo.y.toFixed(0) : 0} mm</div>
          </>
        )}
      </div>
      <div className="alert-bell-container" onClick={handleBellClick}>
        {unreadAlertCount > 0 && <span className="alert-badge">{unreadAlertCount}</span>}
      </div>
      {!showSetupMenu && (
        <button className="setup-toggle-btn" onClick={() => setShowSetupMenu(true)} title="Open Setting Robot">
          &#9881;
        </button>
      )}
      {showSetupMenu && (
        <div className="popup-overlay">
          <div className="popup-modal">
            <div className="manual-controls-header">
              System Control
              <button className="close-setup-btn" onClick={() => setShowSetupMenu(false)} title="Đóng">
                &times;
              </button>
            </div>
            <button className="control-button" onClick={() => setShowMapConfig(true)}>
              Import Map
            </button>
            <button
              onClick={() => {
                setIsSetOriginMode(true);
                setShowSetupMenu(false);
              }}
              className={`control-button ${isSetOriginMode ? "active" : ""}`}
            >
              {isSetOriginMode ? "Click on map..." : "Set Origin (0,0)"}
            </button>
            <div className="origin-display">
              Origin: (X: {mapOrigin[0].toFixed(1)}, Y: {mapOrigin[1].toFixed(1)})
            </div>
            <div>
              <input type="file" accept=".csv" id="csv-upload" onChange={handleWaypointFileUpload} />
              <label
                htmlFor="csv-upload"
                title="Nhập file waypoint.csv"
                style={{
                  cursor: "pointer",
                  backgroundColor: "#17a2b8", // Màu xanh cyan
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "20px", // Bo tròn giống công tắc
                  fontSize: "12px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  marginBottom: 0,
                  boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                }}
              >
                📂 Load CSV
              </label>
            </div>
            <div className="toggle-switch-container">
              <label htmlFor="ws-toggle" className="toggle-label">
                WebSocket
              </label>
              <label className="toggle-switch">
                <input
                  id="ws-toggle"
                  type="checkbox"
                  checked={isWsEnabled}
                  onChange={() => {
                    // Nếu đang TẮT mà muốn BẬT
                    if (!isWsEnabled) {
                      // Kiểm tra xem đã đặt Origin chưa?
                      if (!hasOriginBeenSet) {
                        alert("⚠️ CẢNH BÁO: Bạn chưa đặt điểm gốc (Origin)!\n\nVui lòng nhấn nút 'Set Origin' và chọn vị trí trên bản đồ trước khi kết nối.");
                        return; // ❌ CHẶN NGAY, không cho bật
                      }
                    }
                    setIsWsEnabled(!isWsEnabled);
                  }}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>
      )}
      {/* --- THAY ĐỔI 2: Hiển thị thanh trạng thái LUÔN LUÔN (dùng dataToShow) --- */}
      {activeTab === "map" && !managerTab && (
        <div
          className="robot-status-bar"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.95)", // Màu nền đen
            color: "#aaa",
            padding: "8px 15px",
            borderTop: "2px solid #007bff",
            fontSize: "12px",
            fontFamily: "Consolas, Monaco, monospace",
            lineHeight: "1.6",

            /* FLEX CHÍNH */
            display: "flex",
            flexWrap: "wrap",
            gap: "5px 20px",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          {/* ===== DÒNG 1: ID → YAW ===== */}
          <span style={{ whiteSpace: "nowrap" }}>
            <span style={{ color: "#00d2ff", fontWeight: "bold" }}>ID:</span> {dataToShow.vehicleId}
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <b>MODE:</b> <span style={{ color: "#fff", fontWeight: "bold" }}>{dataToShow.driveMode || "--"}</span>
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <b>SPD:</b> <span style={{ color: "#fff" }}>{(dataToShow.speed || 0).toFixed(2)} m/s</span>
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <b>BAT:</b>{" "}
            <span
              style={{
                // Logic màu: Nếu pin = 0 (Standby) thì màu xám, Pin yếu thì đỏ, Pin khỏe thì xanh
                color: dataToShow.battery > 0 && dataToShow.battery < 20 ? "#ff4d4d" : dataToShow.battery > 0 ? "#00e676" : "#aaa",
                fontWeight: "bold",
              }}
            >
              {dataToShow.battery}%
            </span>
            {dataToShow.isCharging === 1 && <span style={{ color: "yellow", fontWeight: "bold" }}> (CHG)</span>}
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <b>RNG:</b> <span style={{ color: "#fff" }}>{dataToShow.endurance} km</span>
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <b>POS:</b>{" "}
            <span style={{ color: "#fff" }}>
              ({dataToShow.x != null ? dataToShow.x.toFixed(0) : 0}, {dataToShow.y != null ? dataToShow.y.toFixed(0) : 0}) mm
            </span>
          </span>
          <span style={{ whiteSpace: "nowrap" }}>
            {/* Tùy chọn: Z cũng đổi sang mm nếu cần */}
            <b>Z:</b> <span style={{ color: "#fff" }}>{dataToShow.z != null ? (dataToShow.z).toFixed(0) : 0} mm</span>          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <b>YAW:</b> <span style={{ color: "#fff" }}>{(dataToShow.yaw || 0).toFixed(1)}°</span>
          </span>

          {/* 🔥 NGẮT DÒNG CỨNG SAU YAW */}
          <span style={{ flexBasis: "100%", height: 0 }} />

          {/* ===== DÒNG 2: MAP → ENG ===== */}
          <span style={{ whiteSpace: "nowrap" }}>
            <b>MAP:</b> <span style={{ color: "#fff" }}>{dataToShow.mapName || "--"}</span>
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <b>PT:</b> <span style={{ color: "#fff" }}>{dataToShow.currentPoint || "--"}</span>
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <b>TASK:</b> <span style={{ color: "#fff" }}>{dataToShow.taskId || "--"}</span>
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <b>SUB:</b> <span style={{ color: "#fff" }}>{dataToShow.robotTaskId || "--"}</span>
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <b>STS:</b> <span style={{ color: "#fff" }}>{dataToShow.taskStatus ?? "--"}</span>
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <b>ODO:</b> <span style={{ color: "#fff" }}>{dataToShow.odometer} km</span>
          </span>

          <span style={{ whiteSpace: "nowrap" }}>
            <b>ENG:</b>{" "}
            <span
              style={{
                color: dataToShow.isOpen === 1 ? "#00e676" : "#666",
                fontWeight: "bold",
              }}
            >
              {dataToShow.isOpen === 1 ? "ON" : "OFF"}
            </span>
          </span>
        </div>
      )}

      {showMapConfig && (
        <div className="popup-overlay map-config-overlay">
          <div className="popup-modal map-config-modal">
            <div className="manual-controls-header">
              Cài Đặt Bản Đồ
              <button className="close-setup-btn" onClick={() => setShowMapConfig(false)}>
                &times;
              </button>
            </div>

            <div className="map-config-body">
              {/* --- PHẦN CHỌN LOẠI BẢN ĐỒ --- */}
              <div className="form-group" style={{ marginBottom: "15px" }}>
                <label className="form-label">Loại Bản Đồ:</label>
                <div style={{ display: "flex", gap: "20px", marginTop: "5px" }}>
                  <label
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="radio"
                      name="mapType"
                      value="static"
                      checked={tempMapType === "static"}
                      onChange={(e) => setTempMapType(e.target.value)}
                      style={{ marginRight: "5px" }}
                    />
                    Ảnh Tĩnh (Trong nhà)
                  </label>
                  <label
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="radio"
                      name="mapType"
                      value="satellite"
                      checked={tempMapType === "satellite"}
                      onChange={(e) => setTempMapType(e.target.value)}
                      style={{ marginRight: "5px" }}
                    />
                    Vệ Tinh (Google)
                  </label>
                </div>
              </div>

              {tempMapType === "static" ? (
                // Nếu chọn STATIC: Hiển thị form upload THƯ MỤC
                <>
                  <div className="form-group">
                    <label className="form-label">Chọn Thư Mục Map (Chứa .yaml, .png):</label>
                    {/* ✅ THÊM webkitdirectory="" directory="" ĐỂ CHỌN FOLDER */}
                    <input type="file" webkitdirectory="" directory="" onChange={handleDirectorySelect} className="form-input" />
                  </div>

                  {/* Hiển thị thông tin đã đọc được (Read-only để user biết) */}
                  <div className="form-row">
                    <div className="form-col">
                      <label className="form-label">Rộng (px):</label>
                      <input
                        type="number"
                        value={tempConfig.width}
                        disabled // Không cho sửa tay, lấy từ ảnh
                        className="form-input-padded"
                        style={{ backgroundColor: "#e9ecef" }}
                      />
                    </div>
                    <div className="form-col">
                      <label className="form-label">Cao (px):</label>
                      <input
                        type="number"
                        value={tempConfig.height}
                        disabled // Không cho sửa tay
                        className="form-input-padded"
                        style={{ backgroundColor: "#e9ecef" }}
                      />
                    </div>
                  </div>

                  {/* ✅ HIỂN THỊ THÔNG SỐ ĐỌC TỪ YAML */}
                  {tempResolution && (
                    <div className="form-group" style={{ marginTop: "10px" }}>
                      <label className="form-label" style={{ color: "#28a745" }}>
                        ✅ Đã đọc từ YAML:
                      </label>
                      <div style={{ fontSize: "13px", paddingLeft: "10px" }}>
                        Resolution: <b>{(1 / tempResolution).toFixed(3)}</b> m/px <br />
                        Tỉ lệ quy đổi: <b>{tempResolution.toFixed(2)}</b> px/m
                      </div>
                    </div>
                  )}

                  {tempConfig.previewUrl && (
                    <div className="preview-container">
                      <img src={tempConfig.previewUrl} alt="Preview" className="preview-image" />
                    </div>
                  )}
                </>
              ) : (
                // Nếu chọn SATELLITE: Hiển thị thông báo hướng dẫn
                <div
                  style={{
                    padding: "15px",
                    background: "#f8f9fa",
                    border: "1px solid #dee2e6",
                    borderRadius: "5px",
                    marginBottom: "15px",
                    fontSize: "14px",
                    color: "#495057",
                    lineHeight: "1.5",
                  }}
                >
                  <p style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>🌍 Chế độ Bản đồ Vệ tinh</p>
                  <p style={{ margin: 0 }}>
                    Hệ thống sẽ tải bản đồ vệ tinh trực tiếp từ Google Maps.
                    <br />
                    Hãy đảm bảo Robot gửi về tọa độ <b>GPS (Kinh độ/Vĩ độ)</b> hoặc hệ thống đã được cấu hình chuyển đổi tọa độ phù hợp.
                  </p>
                </div>
              )}

              {/* --- CÁC NÚT HÀNH ĐỘNG --- */}
              <div className="action-buttons">
                <button onClick={handleApplyMap} className="control-button btn-save">
                  {tempMapType === "static" ? "Lưu & Vẽ Lại" : "Chuyển Chế Độ"}
                </button>
                <button onClick={() => setShowMapConfig(false)} className="control-button btn-cancel">
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MAP ASSIGNMENT POPUP === */}
      {showMapPopup && (
        <div style={mapPopupStyles.overlay}>
          <div style={mapPopupStyles.modal}>
            <div style={mapPopupStyles.header}>
              <h3 style={mapPopupStyles.title}>🗺️ Assign Map to Robot</h3>
              <button style={mapPopupStyles.closeBtn} onClick={() => setShowMapPopup(false)}>✕</button>
            </div>

            <div style={mapPopupStyles.body}>
              <div style={mapPopupStyles.infoRow}>
                <span style={mapPopupStyles.label}>Robot ID:</span>
                <span style={mapPopupStyles.value}>{mapPopupRobotId}</span>
              </div>

              {currentAssignedMap && (
                <div style={mapPopupStyles.currentMap}>
                  <span style={mapPopupStyles.label}>Current Map:</span>
                  <span style={{ color: '#a6e3a1', fontWeight: 'bold' }}>{currentAssignedMap.mapName}</span>
                </div>
              )}

              <div style={mapPopupStyles.selectRow}>
                <label style={mapPopupStyles.label}>Select Map:</label>
                <select
                  value={selectedMapId}
                  onChange={(e) => setSelectedMapId(e.target.value)}
                  style={mapPopupStyles.select}
                >
                  <option value="">-- Choose a map --</option>
                  {mapLibraryList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.mapName}{currentAssignedMap && m.id === currentAssignedMap.mapId ? ' (current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {mapLibraryList.length === 0 && (
                <p style={{ color: '#f38ba8', fontSize: '13px', margin: '10px 0' }}>
                  No maps in library. Upload maps first via Admin → Map Library.
                </p>
              )}

              {mapAssignMsg && <div style={mapPopupStyles.message}>{mapAssignMsg}</div>}

              <div style={mapPopupStyles.actions}>
                <button
                  style={{ ...mapPopupStyles.assignBtn, opacity: !selectedMapId || mapAssigning ? 0.5 : 1 }}
                  onClick={handleAssignMap}
                  disabled={!selectedMapId || mapAssigning}
                >
                  {mapAssigning ? 'Assigning...' : '📌 Assign Map'}
                </button>
                <button style={mapPopupStyles.cancelBtn} onClick={() => setShowMapPopup(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const mapPopupStyles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 9999,
  },
  modal: {
    background: '#1e1e2e', borderRadius: '12px', padding: '0',
    width: '420px', maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    color: '#cdd6f4', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 20px', borderBottom: '1px solid #45475a',
  },
  title: { margin: 0, fontSize: '16px', color: '#89b4fa' },
  closeBtn: {
    background: 'none', border: 'none', color: '#f38ba8',
    fontSize: '18px', cursor: 'pointer',
  },
  body: { padding: '16px 20px' },
  infoRow: { display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' },
  currentMap: {
    display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center',
    padding: '8px 12px', background: '#313244', borderRadius: '6px',
  },
  selectRow: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' },
  label: { fontSize: '13px', color: '#bac2de', minWidth: '90px' },
  value: { fontSize: '13px', color: '#89b4fa', fontWeight: 'bold', fontFamily: 'monospace' },
  select: {
    padding: '8px 12px', borderRadius: '6px', border: '1px solid #45475a',
    background: '#313244', color: '#cdd6f4', fontSize: '13px', outline: 'none',
  },
  message: {
    padding: '8px 12px', borderRadius: '6px', background: '#45475a',
    fontSize: '13px', marginBottom: '12px',
  },
  actions: { display: 'flex', gap: '10px', marginTop: '4px' },
  assignBtn: {
    flex: 1, padding: '8px 16px', borderRadius: '6px', border: 'none',
    background: '#89b4fa', color: '#1e1e2e', fontWeight: 'bold',
    fontSize: '13px', cursor: 'pointer',
  },
  cancelBtn: {
    padding: '8px 16px', borderRadius: '6px', border: '1px solid #45475a',
    background: 'transparent', color: '#a6adc8', fontSize: '13px', cursor: 'pointer',
  },
};

export default memo(RobotMap);
