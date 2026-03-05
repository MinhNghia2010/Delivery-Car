package com.example.RobotServerMini.robotservice;


import com.example.RobotServerMini.robotservice.ProtocolService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TaskService {

    @Autowired
    private ProtocolService protocolService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private GraphService graphService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Map lưu các lệnh đang chờ phản hồi
    public static final Map<String, Long> pendingTaskCommands = new ConcurrentHashMap<>();

    // 1. GỬI QUY TRÌNH TASK: ADD TASK (HEADER) -> ADD TASK SLICE (PATH A*)
// 1. GỬI QUY TRÌNH TASK: ADD TASK (HEADER) -> ADD TASK SLICE (PATH A* NHIỀU CHẶNG)
    public Map<String, Object> sendAddTask(Map<String, Object> payload) {
        Map<String, Object> response = new HashMap<>();
        try {
            // Kiểm tra xem backend đang có map hay cha
            if (!graphService.isMapLoaded()) {
                response.put("status", "MAP_MISSING");
                response.put("message", "Chưa có bản đồ! Yêu cầu nạp bản đồ trước khi điều khiển robot");

                // Bắn thông báo qua WebSocket để "gọi" Người quản lý đang mở web
                Map<String, Object> alert = new HashMap<>();
                alert.put("type", "REQUEST_MAP_UPLOAD");
                alert.put("message", "⚠CẢNH BÁO: Có hệ thống đang cố gắng ra lệnh cho Robot di chuyển, nhưng Server chưa có bản đồ. Vui lòng bấm 'Lưu & Vẽ lại'");

                // Giả sử bạn đang có biến messagingTemplate được @Autowired
                messagingTemplate.convertAndSend("/topic/alerts", alert);

                System.out.println("Đã từ chối lệnh di chuyển: Server đang thiếu bản đồ!");
                return response; // Dừng hàm ngay lập tức, không gửi gì cho Robot
            }
            // --- A. LẤY DỮ LIỆU TỪ PAYLOAD ---
            String vehicleId = getString(payload, "vehicleId");

            Object taskIdObj = payload.get("taskId");
            String taskId = taskIdObj != null ? String.valueOf(taskIdObj) : "TASK_" + System.currentTimeMillis();

            List<Map<String, Object>> rawWayPoints = (List<Map<String, Object>>) payload.get("wayPoints");
            if (rawWayPoints == null || rawWayPoints.isEmpty()) {
                throw new RuntimeException("Chưa chọn điểm đến!");
            }

            // Điểm đích cuối cùng (Dành cho gói tin Header)
            Map<String, Object> finalDestination = rawWayPoints.get(rawWayPoints.size() - 1);
            String finalDestPointId = getString(finalDestination, "PointId");
            int[] finalDestPosMm = extractPositionMm(finalDestination);
            int finalDestAngle = extractAngle(finalDestination);

            double robotX_m = payload.containsKey("robotX") ? Double.parseDouble(String.valueOf(payload.get("robotX"))) : 0.0;
            double robotY_m = payload.containsKey("robotY") ? Double.parseDouble(String.valueOf(payload.get("robotY"))) : 0.0;

            System.out.println("🤖 Robot tại: (" + robotX_m + ", " + robotY_m + ")");
            System.out.println("🏁 Điểm đến cuối: " + finalDestPointId);

            // --- B. TÍNH TOÁN ĐƯỜNG ĐI QUA TỪNG CHẶNG (Robot -> A -> B -> C...) ---
            List<Map<String, Object>> sliceWayPoints = new ArrayList<>();
            List<GraphService.GraphNode> allPathNodes = new ArrayList<>(); // Gom điểm để React vẽ đường vàng liên tục

            double currentX = robotX_m;
            double currentY = robotY_m;

            for (int i = 0; i < rawWayPoints.size(); i++) {
                Map<String, Object> target = rawWayPoints.get(i);
                String targetId = getString(target, "PointId");
                int[] targetPosMm = extractPositionMm(target);
                int targetAngle = extractAngle(target);

                double targetX_m = targetPosMm[0] / 1000.0;
                double targetY_m = targetPosMm[1] / 1000.0;

                // 1. Tìm Node A* cho chặng này
                GraphService.GraphNode startNode = graphService.findNearestNode(currentX, currentY);
                GraphService.GraphNode endNode = graphService.findNearestNode(targetX_m, targetY_m);

                if (startNode != null && endNode != null) {

                    List<GraphService.GraphNode> segmentPath = graphService.findPathAStar(startNode.id, endNode.id);
                    //Bổ sung : THUẬT TOÁN CHỐNG ĐI LÙI (ANTI-BACKTRACKING)
                    if (segmentPath.size() >= 2) {
                        GraphService.GraphNode firstNode = segmentPath.get(0);
                        GraphService.GraphNode secondNode = segmentPath.get(1);

                        double distToSecond = Math.sqrt(Math.pow(currentX - secondNode.x, 2) + Math.pow(currentY - secondNode.y, 2));
                        double dist1to2 = Math.sqrt(Math.pow(firstNode.x - secondNode.x, 2) + Math.pow(firstNode.y - secondNode.y, 2));
                        // Nếu khoảng cách từ Xe tới Node 2 còn ngắn hơn độ dài con đường từ Node 1 tới Node 2
                        // -> Xe đang nằm giữa đường, bỏ Node 1 đi, phóng thẳng tới Node 2
                        if (distToSecond <= dist1to2) {
                            segmentPath.remove(0);
                        }
                    }
                    System.out.println("📍 Routing Chặng " + (i+1) + ": Node " + startNode.id + " -> Node " + endNode.id);
                    if (!segmentPath.isEmpty()) {
                        allPathNodes.addAll(segmentPath); // Gom cho UI vẽ

                        for (GraphService.GraphNode node : segmentPath) {
                            Map<String, Object> wp = new LinkedHashMap<>();
                            wp.put("DestPoint", node.id);
                            wp.put("Position", new int[]{(int)(node.x * 1000), (int)(node.y * 1000)});
                            wp.put("LinearVelocity", 1000);
                            wp.put("AngleVelocity", 0);
                            wp.put("DestAngle", 0);
                            wp.put("ShelfAngle", 0);
                            wp.put("ExecTime", 0);
                            wp.put("Type", 1);
                            wp.put("FreePlan", false);
                            sliceWayPoints.add(wp);
                        }
                    }
                }

                // 2. Chèn chính Target đang xét vào đường đi
                Map<String, Object> targetWp = new LinkedHashMap<>();
                targetWp.put("DestPoint", targetId);
                targetWp.put("Position", targetPosMm);
                targetWp.put("DestAngle", targetAngle != 0 ? targetAngle : 0); // Đảm bảo luôn có DestAngle
                targetWp.put("AngleVelocity", 0);
                targetWp.put("ShelfAngle", 0);
                targetWp.put("ExecTime", 0);
                // Nếu là điểm đích CUỐI CÙNG thì Type = 2 (Stoppoint) - xe dừng hẳn
                if (i == rawWayPoints.size() - 1) {
                    targetWp.put("LinearVelocity", 500); // 0.5m/s vào bến
                    targetWp.put("Type", 2);
                } else {
                    // Nếu chỉ là điểm đi qua (A, B, C) thì Type = 1 - xe đi lướt qua luôn
                    targetWp.put("LinearVelocity", 1000);
                    targetWp.put("Type", 1);
                }
                targetWp.put("FreePlan", false);
                sliceWayPoints.add(targetWp);

                // 3. Gán vị trí đích hiện tại thành điểm xuất phát của chặng tiếp theo
                currentX = targetX_m;
                currentY = targetY_m;
            }

            // ==========================================================
            // 🔥 THÊM ĐOẠN NÀY: IN CHI TIẾT LỘ TRÌNH RA CONSOLE ĐỂ KIỂM TRA
            // ==========================================================
            StringBuilder routeLog = new StringBuilder();
            routeLog.append("🛤️ CHI TIẾT LỘ TRÌNH TỔNG TỔNG CỘNG (").append(sliceWayPoints.size()).append(" điểm): \n");
            routeLog.append("   [Bắt đầu] ");

            for (int j = 0; j < sliceWayPoints.size(); j++) {
                Map<String, Object> wp = sliceWayPoints.get(j);
                String pointId = getString(wp, "DestPoint");
                int type = Integer.parseInt(String.valueOf(wp.get("Type")));

                // Đánh dấu để biết đâu là điểm đi lướt qua (Node), đâu là điểm đỗ (Stoppoint)
                if (type == 2) {
                    routeLog.append("[").append(pointId).append(" (Đích/Trạm dừng)]");
                } else {
                    routeLog.append(pointId);
                }

                if (j < sliceWayPoints.size() - 1) {
                    routeLog.append(" ➔ ");
                }
            }
            System.out.println(routeLog.toString());
            // ==========================================================


            // --- C. GỬI GÓI TIN 1: ADD TASK (HEADER) ---
            Map<String, Object> addTaskPacket = new LinkedHashMap<>();
            addTaskPacket.put("Action", "addTask");

            Map<String, Object> taskBody = new HashMap<>();
            List<Map<String, Object>> taskList = new ArrayList<>();
            Map<String, Object> taskItem = new LinkedHashMap<>();

            taskItem.put("ID", taskId);
            taskItem.put("Type", 10);
            taskItem.put("Timeout", -1);
            taskItem.put("NeedACK", 0);
            taskItem.put("StartPoint", "");
            taskItem.put("EndPoint", finalDestPointId); // Header chỉ quan tâm đích cuối cùng
            taskItem.put("Source", "Server");

            Map<String, Object> endPosition = new HashMap<>();
            endPosition.put("Angle", finalDestAngle);
            endPosition.put("Position", finalDestPosMm);
            taskItem.put("EndPosition", endPosition);
            taskItem.put("Name", "Mission_" + taskId);

            taskList.add(taskItem);
            taskBody.put("Task", taskList);
            addTaskPacket.put("Body", taskBody);

            // Gửi Header
            wrapAndSend(addTaskPacket, vehicleId, "addTask");


            // --- D. GỬI GÓI TIN 2: ADD TASK SLICE (BODY - PATH LIÊN HOÀN) ---
            Map<String, Object> slicePacket = new LinkedHashMap<>();
            slicePacket.put("Action", "addTaskSlice");

            Map<String, Object> sliceBody = new HashMap<>();
            sliceBody.put("TaskID", taskId);
            sliceBody.put("Type", "append");

            Map<String, Object> taskSlice = new LinkedHashMap<>();
            taskSlice.put("AutoPlanDisable", true);
            taskSlice.put("ID", "SLICE_" + System.currentTimeMillis());
            taskSlice.put("IsLastSlice", true);
            taskSlice.put("IsConditionalAction", false);
            taskSlice.put("Condition", new HashMap<>()); // Trả về {}
            taskSlice.put("CurrentPoint", "");
            taskSlice.put("Actions", new ArrayList<>()); // Trả về []
            taskSlice.put("ShelfAnglePoints", new ArrayList<>()); // Trả về []
            taskSlice.put("WayPoints", sliceWayPoints); // Chứa toàn bộ A* của mọi chặng
            sliceBody.put("TaskSlice", taskSlice);
            slicePacket.put("Body", sliceBody);

            // Gửi Body
            boolean sentSlice = wrapAndSend(slicePacket, vehicleId, "addTaskSlice");


            // --- E. PHẢN HỒI CHO FRONTEND VẼ ĐƯỜNG VÀNG ---
            if (sentSlice) {
                response.put("status", "SENT");
                response.put("taskId", taskId);
                response.put("pathLength", sliceWayPoints.size());

                List<Map<String, Object>> frontendPath = new ArrayList<>();

                // Điểm bắt đầu
                Map<String, Object> startPt = new HashMap<>();
                startPt.put("id", "start_point");
                startPt.put("x", robotX_m);
                startPt.put("y", robotY_m);
                frontendPath.add(startPt);

                // Các điểm trung gian của toàn bộ các chặng
                for (GraphService.GraphNode node : allPathNodes) {
                    Map<String, Object> pt = new HashMap<>();
                    pt.put("id", node.id);
                    pt.put("x", node.x);
                    pt.put("y", node.y);
                    frontendPath.add(pt);
                }




                // Điểm kết thúc cuối cùng
                Map<String, Object> endPt = new HashMap<>();
                endPt.put("id", finalDestPointId);
                endPt.put("x", currentX); // currentX lúc này đang lưu tọa độ đích cuối
                endPt.put("y", currentY);
                frontendPath.add(endPt);

                response.put("calculatedPath", frontendPath);

                // Bắn đuờng đi len React
                Map<String, Object> wsRoutePayload = new HashMap<>();
                wsRoutePayload.put("vehicleId", vehicleId);
                wsRoutePayload.put("calculatedPath", frontendPath);
                // Bắn vào một topic mới dành riêng cho việc vẽ đường
                messagingTemplate.convertAndSend("/topic/route-plan", wsRoutePayload);
                /// ////////////////////////


                response.put("message", "Đã gửi lộ trình gồm " + sliceWayPoints.size() + " điểm.");
            } else {
                response.put("status", "ERROR");
                response.put("message", "Lỗi gửi gói tin xuống Robot");
            }

        } catch (Exception e) {
            e.printStackTrace();
            response.put("status", "ERROR");
            response.put("message", "Start Failed: " + e.getMessage());
        }
        return response;
    }

    // 2. GỬI LỆNH PAUSE / RESUME / CANCEL (Logic chung form)
    public Map<String, Object> sendControlCommand(String action, Map<String, Object> payload) {
        Map<String, Object> response = new HashMap<>();
        try {
            String vehicleId = (String) payload.get("vehicleId");
            String taskId = (String) payload.getOrDefault("taskId", "0000"); // Nên lấy task thực tế từ cache nếu null
            int stopType = ((Number) payload.getOrDefault("stopType", 0)).intValue();

            Map<String, Object> packet = new LinkedHashMap<>();
            packet.put("Action", action);

            Map<String, Object> body = new HashMap<>();
            if ("resumeTask".equals(action)) {
                List<Map<String, String>> taskInfoList = new ArrayList<>();
                Map<String, String> item = new HashMap<>();
                item.put("TaskID", taskId);
                taskInfoList.add(item);
                body.put("TaskInfo", taskInfoList);
            } else {
                // Pause và Cancel dùng cấu trúc giống nhau
                List<String> taskIdList = new ArrayList<>();
                taskIdList.add(taskId);
                body.put("TaskID", taskIdList);
                body.put("StopType", stopType);
            }
            packet.put("Body", body);

            String cmdId = "CMD_" + action + "_" + System.currentTimeMillis();
            packet.put("Device", vehicleId);
            packet.put("ID", cmdId);
            packet.put("Time", System.currentTimeMillis() * 1000);

            boolean sent = protocolService.sendToRobot(vehicleId, packet);
            if (sent) {
                pendingTaskCommands.put(cmdId, System.currentTimeMillis());
                response.put("status", "SENT");
            } else {
                response.put("status", "ERROR");
                response.put("message", "Socket Error");
            }
        } catch (Exception e) {
            response.put("status", "ERROR");
            response.put("message", e.getMessage());
        }
        return response;
    }

    // --- HELPER FUNCTIONS ---

    // Hàm đóng gói ID, Time, Device và gửi đi
    private boolean wrapAndSend(Map<String, Object> packet, String vehicleId, String actionType) {
        String cmdId = "CMD_" + actionType + "_" + System.currentTimeMillis();
        packet.put("Device", vehicleId);
        packet.put("ID", cmdId);
        packet.put("Time", System.currentTimeMillis() * 1000); // Microseconds nếu cần, hoặc Millis

        System.out.println("📤 Đang gửi lệnh: " + actionType + " tới " + vehicleId);
        boolean sent = protocolService.sendToRobot(vehicleId, packet);

        if (sent) {
            pendingTaskCommands.put(cmdId, System.currentTimeMillis());
        }
        return sent;
    }

    // Trích xuất tọa độ từ Object Frontend và chuyển sang mm (Int Array)
    private int[] extractPositionMm(Map<String, Object> pointData) {
        try {
            Map<String, Object> pose = (Map<String, Object>) pointData.get("Pose");
            Map<String, Object> position = (Map<String, Object>) pose.get("Position");

            // Frontend gửi mét (ví dụ 49.28), Robot cần mm (49280)
            double xM = Double.parseDouble(String.valueOf(position.get("x")));
            double yM = Double.parseDouble(String.valueOf(position.get("y")));

            int xMm = (int) (xM * 1000); // chuyển m -> mm
            int yMm = (int) (yM * 1000);

            return new int[]{xMm, yMm};
        } catch (Exception e) {
            return new int[]{0, 0};
        }
    }

    private int extractAngle(Map<String, Object> pointData) {
        try {
            Map<String, Object> pose = (Map<String, Object>) pointData.get("Pose");
            double angle = Double.parseDouble(String.valueOf(pose.get("Angle")));
            return (int) (angle * 1000); // Quy ước góc (ví dụ độ * 1000)
        } catch (Exception e) {
            return 0;
        }
    }

    private String getString(Map<String, Object> map, String key) {
        if (map == null || key == null) return "";
        Object val = map.get(key);
        // Chuyển mọi thứ (Integer, Long, Double...) thành String an toàn
        return val != null ? String.valueOf(val) : "";
    }

    // 3. SCHEDULER CHECK TIMEOUT (Chuyển từ RobotGatewayController sang)
    @Scheduled(fixedRate = 1000)
    public void checkTaskTimeout() {
        long now = System.currentTimeMillis();
        long TIMEOUT_MS = 10000;

        pendingTaskCommands.entrySet().removeIf(entry -> {
            if (now - entry.getValue() > TIMEOUT_MS) {
                System.err.println("TIMEOUT: Lệnh " + entry.getKey() + " không phản hồi!");
                Map<String, Object> error = new HashMap<>();
                error.put("type", "TASK_TIMEOUT");
                error.put("message", "Lỗi: Robot không phản hồi lệnh (Timeout)!");
                messagingTemplate.convertAndSend("/topic/alerts", error);
                return true;
            }
            return false;
        });
    }
}
