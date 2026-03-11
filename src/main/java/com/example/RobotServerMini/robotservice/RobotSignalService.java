package com.example.RobotServerMini.robotservice;

import com.example.RobotServerMini.DTO.RobotSignalDTO;
import com.example.RobotServerMini.DTO.RobotStatusState;
import com.example.RobotServerMini.models.RobotInformationModel;
import com.example.RobotServerMini.repository.RobotInformationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RobotSignalService {

    @Autowired
    private RobotInformationRepository robotInfoRepo;
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    @Autowired
    private HeartbeatService heartbeatService;
    @Autowired
    @Lazy
    private ProtocolService protocolService;

    // Cấu hình server
    private final String SERVER_IP = "192.168.28.179"; // Check lại IP máy bạn
    private final int SERVER_PORT = 8095;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public static final Map<String, RobotSignalDTO.DataPayload> latestRobotStates = new ConcurrentHashMap<>();

    public void handleSignal(RobotSignalDTO signal) {
        String currentSerial = signal.device;
        saveLogToFile("📥 ROBOT -> SERVER", currentSerial, signal);

        // 🔥 FIX 2: Lấy trạng thái hiện tại từ DB (Hoặc Cache nếu muốn nhanh)
        Optional<RobotInformationModel> robotOpt = robotInfoRepo.findBySerialNo(currentSerial);
        String dbStatus = robotOpt.map(RobotInformationModel::getConnectionStatus).orElse("UNKNOWN");

        try {
            // CASE 1: RegDevice (Luôn phải xử lý để check quyền)
            if ("RegDevice".equals(signal.report)) {
                handleRegDevice(signal, currentSerial, dbStatus);
                return; // Xử lý xong Reg thì return luôn
            }

            // 🔥 FIX 3: Nếu xe đã bị REJECTED hoặc chưa APPROVED, cấm xử lý các tin khác
            if ("REJECTED".equals(dbStatus)) {
                System.out.println("⛔ Chặn tin từ xe bị từ chối (REJECTED): " + currentSerial);
                // Có thể gửi lệnh đóng socket ở đây nếu muốn gắt
                return;
            }
            if (!"APPROVED".equals(dbStatus)) {
                // Nếu chưa được duyệt thì chỉ cho phép Login/Reg thôi, các cái khác bỏ qua
                // Tuy nhiên, nếu đang PENDING mà gửi Login thì vẫn phải cho qua
                if (!"loginDevice".equals(signal.report)) {
//                    System.out.println("⚠️ Xe chưa duyệt (" + dbStatus + ") đang spam tin: " + signal.report);
                    return;
                }
            }

            // --- CÁC LOGIC NGHIỆP VỤ (CHỈ CHẠY KHI ĐÃ APPROVED HOẶC ĐANG LOGIN) ---

            if ("loginDevice".equals(signal.report)) {
                handleLoginAck(signal, currentSerial);
            }
//            else if ("RobotInfo".equals(signal.report)) {
//                handleRobotInfo(signal, currentSerial);
//            }
            else if ("DeviceState".equals(signal.report)) {
                handleDeviceState(signal, currentSerial);
            }
            else if ("HeartBeating".equals(signal.report)) {
                heartbeatService.receiveHeartbeatAck(currentSerial);
            }
            else if (Set.of("addTask","addTaskSlice", "pauseTask", "resumeTask", "cancelTask").contains(signal.report)) {
                handleTaskAck(signal, currentSerial);
            }
            else if ("TaskState".equals(signal.report)) {
                handleTaskState(signal, currentSerial);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // --- CÁC HÀM CON ---

    private void handleRegDevice(RobotSignalDTO signal, String serial, String currentStatus) {
        System.out.println("📡 Nhận RegDevice từ: " + serial + " | Status DB: " + currentStatus);

        // 1. Lấy IP/Port từ bản tin Robot gửi lên
        String robotIp = "UNKNOWN";
        int robotPort = 0;
        if (signal.body != null) {
            try {
                Map<String, Object> deviceData = (Map<String, Object>) signal.body.get("Device");
                if (deviceData != null) {
                    robotIp = (String) deviceData.getOrDefault("Ip", "UNKNOWN");
                    if (deviceData.get("Port") instanceof Number) robotPort = ((Number) deviceData.get("Port")).intValue();
                }
            } catch (Exception e) {}
        }

        // 2. CHẶN NGAY NẾU ĐÃ BỊ TỪ CHỐI (REJECTED)
        if ("REJECTED".equals(currentStatus)) {
            System.err.println("❌ TỪ CHỐI KẾT NỐI LẠI VỚI: " + serial);
            // Gửi tin báo từ chối để Robot biết đường mà dừng (hoặc bạn có thể im lặng luôn cũng được)
            Map<String, Object> response = new HashMap<>();
            response.put("desc", "CONNECTION_REFUSED");
            protocolService.sendToRobot(serial, response);
            return;
        }

        // 3. NẾU ĐÃ DUYỆT (APPROVED) -> Gửi lệnh Login ngay (Trường hợp mất kết nối và nối lại)
        if ("APPROVED".equals(currentStatus)) {
            // Cập nhật lại IP mới nhất (đề phòng robot đổi mạng)
            Optional<RobotInformationModel> rOpt = robotInfoRepo.findBySerialNo(serial);
            if(rOpt.isPresent()) {
                RobotInformationModel r = rOpt.get();
                r.setIpAddress(robotIp);
                r.setPort(robotPort);
                robotInfoRepo.save(r);
            }
            sendLoginCommandToRobot(serial);
            return;
        }

        // 4. NẾU XE MỚI HOẶC ĐANG PENDING -> CHỈ LƯU DB VÀ BÁO UI (KHÔNG PHẢN HỒI ROBOT)
        RobotInformationModel robot = robotInfoRepo.findBySerialNo(serial).orElse(new RobotInformationModel());
        robot.setSerialNo(serial);
        // Chỉ cập nhật trạng thái nếu nó chưa có trạng thái (tránh ghi đè bậy bạ)
        if (robot.getConnectionStatus() == null) {
            robot.setConnectionStatus("PENDING");
        }

        robot.setIpAddress(robotIp);
        robot.setPort(robotPort);
        robot.setLastLoginTime(System.currentTimeMillis());
        robotInfoRepo.save(robot);

        // Báo UI hiện Popup yêu cầu kết nối
        Map<String, Object> alert = new HashMap<>();
        alert.put("type", "CONNECTION_REQUEST");
        alert.put("vehicleId", serial);
        alert.put("ip", robotIp);
        alert.put("message", "Yêu cầu kết nối từ " + robotIp);
        messagingTemplate.convertAndSend("/topic/alerts", alert);

        // 🔥 QUAN TRỌNG: Đã xóa đoạn gửi "WAIT_FOR_ADMIN" ở đây.
        // Server sẽ im lặng. Robot (Python) sẽ tiếp tục vòng lặp chờ đợi.
        // Khi nào bạn bấm "Accept" trên Web -> RobotConnectionController sẽ bắn lệnh "loginDevice".
        System.out.println("⏳ Đã lưu trạng thái PENDING cho " + serial + " và đang đợi Admin duyệt...");
    }

    private void handleLoginAck(RobotSignalDTO signal, String serial) {
        // TRƯỜNG HỢP 1: ĐĂNG NHẬP THÀNH CÔNG
        if (signal.code != null && signal.code == 1000) {
            System.out.println("✅ Robot " + serial + " đã đăng nhập thành công!");

            Optional<RobotInformationModel> robotOpt = robotInfoRepo.findBySerialNo(serial);
            if (robotOpt.isPresent()) {
                RobotInformationModel r = robotOpt.get();
                r.setConnectionStatus("APPROVED");
                r.setLastLoginTime(System.currentTimeMillis());

                // 🔥 [BỔ SUNG] 1. Logic đọc thông tin chi tiết từ Robot gửi lên
                if (signal.data != null && signal.data.params != null) {
                    try {
                        // params thường là một LinkedHashMap
                        Map<String, Object> params = objectMapper.convertValue(signal.data.params, Map.class);

                        if (params.containsKey("Device")) {
                            Map<String, Object> devInfo = (Map<String, Object>) params.get("Device");

                            // Lưu các thông tin này vào DB để quản lý
                            if (devInfo.get("Mac") != null) r.setMacAddress((String) devInfo.get("Mac"));
                            if (devInfo.get("Version") != null) r.setSoftwareVersion((String) devInfo.get("Version"));
                            if (devInfo.get("Class") != null) r.setRobotClass((String) devInfo.get("Class"));
                            if (devInfo.get("Type") != null) r.setModelType((String) devInfo.get("Type"));

                            System.out.println("   📝 Updated Info: Ver=" + r.getSoftwareVersion() + ", Mac=" + r.getMacAddress());
                        }
                    } catch (Exception e) {
                        System.err.println("⚠️ Lỗi đọc params login của " + serial + ": " + e.getMessage());
                    }
                }

                robotInfoRepo.save(r);
            }

            // Báo UI xe đã Online (Màu xanh)
            messagingTemplate.convertAndSend("/topic/vehicle-status",
                    Map.of("vehicleId", serial, "connectionStatus", "APPROVED"));
        }
        // TRƯỜNG HỢP 2: ĐĂNG NHẬP THẤT BẠI (Mã lỗi khác 1000)
        else {
            System.err.println("❌ Robot " + serial + " đăng nhập thất bại!");
            System.err.println("   Code: " + signal.code + ", Lý do: " + signal.desc);

            // [Tùy chọn] Có thể gửi cảnh báo lên UI
            Map<String, Object> alert = new HashMap<>();
            alert.put("type", "LOGIN_FAILED");
            alert.put("message", "Xe " + serial + " lỗi đăng nhập: " + signal.desc);
            alert.put("device", serial);
            messagingTemplate.convertAndSend("/topic/alerts", alert);
        }
    }

    private void handleDeviceState(RobotSignalDTO signal, String serial) {
        if (signal.body != null) {
            try {
                Map<String, Object> uiPayload = new HashMap<>();
                uiPayload.put("vehicleId", serial);
                uiPayload.put("type", "ROBOT_INFO_UPDATE");

                // Map dữ liệu từ Body sang các Class Java (Dùng objectMapper)
                RobotStatusState.RobotDetail robot = objectMapper.convertValue(signal.body.get("robot"), RobotStatusState.RobotDetail.class);
                RobotStatusState.StatusDetail status = objectMapper.convertValue(signal.body.get("statusDetail"), RobotStatusState.StatusDetail.class);
                RobotStatusState.FuelDetail fuel = objectMapper.convertValue(signal.body.get("fuelDetail"), RobotStatusState.FuelDetail.class);

                // ÉP PHẲNG DỮ LIỆU STATUS CHUẨN BỊ CHO UI ---
                if (status != null) {
                    uiPayload.put("x", status.x != null ? status.x : status.longitude);
                    uiPayload.put("y", status.y != null ? status.y : status.latitude);
                    uiPayload.put("yaw", status.azimuth);
                    uiPayload.put("speed", status.speed);
                    uiPayload.put("driveMode", status.driveMode);
                    uiPayload.put("realtimeState", status.state); // Trạng thái chạy: Idle, InTask, Fault...
                }

                // ÉP PHẲNG DỮ LIỆU PIN ---
                if (fuel != null) {
                    uiPayload.put("battery", fuel.residualFuel); // Đẩy đúng tên biến "battery" cho UI
                    uiPayload.put("odometer", fuel.odometer);
                    uiPayload.put("endurance", fuel.endurance);
                    // Đề phòng trường hợp lỗi undefine nếu hãng đã xóa isCharging
                    uiPayload.put("isCharging", fuel.isCharging != null ? fuel.isCharging : 0);
                }
                // DỮ LIỆU HỆ THỐNG ROBOT ---
                if (robot != null) {
                    uiPayload.put("fleetState", robot.state); // Trạng thái luồng: Navigating, Arrived...
                    uiPayload.put("robotName", robot.robotName);
                }

                // Bơm thẳng cục dữ liệu đã làm sạch lên React qua WebSocket
                messagingTemplate.convertAndSend("/topic/vehicle-status", uiPayload);

                // Cập nhật vào bộ nhớ đệm nội bộ của Server (Nếu bạn có dùng cho thuật toán khác)
                RobotSignalDTO.DataPayload currentData = latestRobotStates.getOrDefault(serial, new RobotSignalDTO.DataPayload());
                // Cập nhật các thông số cần thiết vào currentData ở đây nếu cần...
                latestRobotStates.put(serial, currentData);

            } catch (Exception e) {
                System.err.println("⚠️ Lỗi bóc tách DeviceState: " + e.getMessage());
            }
        }

    }

    private void handleTaskAck(RobotSignalDTO signal, String serial) {
        String actionType = signal.report; // addTask, addTaskSlice, pauseTask...
        boolean isSuccess = (signal.code != null && signal.code == 1000);
        String message = "";
        String alertType = "";

        // Kiểm tra result = false ở cấp data (Ví dụ bản tin addTaskSlice trả về code 2065, result: false)
        if (signal.data != null) {
            try {
                Map<String, Object> dataMap = objectMapper.convertValue(signal.data, Map.class);
                if (dataMap.containsKey("result")) {
                    isSuccess = isSuccess && Boolean.TRUE.equals(dataMap.get("result"));
                }
            } catch (Exception e) {}
        }

        // 🔥 XỬ LÝ 1: Bóc lỗi chi tiết cho addTask (Lấy chữ "Motor Failed" từ FailedList)
        if ("addTask".equals(actionType) && signal.data != null && signal.data.params != null) {
            try {
                Map<String, Object> params = objectMapper.convertValue(signal.data.params, Map.class);
                List<Map<String, Object>> failedList = (List<Map<String, Object>>) params.get("FailedList");
                if (failedList != null && !failedList.isEmpty()) {
                    isSuccess = false;
                    String errorDetail = (String) failedList.get(0).get("Error");
                    message = "Lỗi khởi tạo Task: " + (errorDetail != null ? errorDetail : "Không rõ lỗi");
                }
            } catch (Exception e) {}
        }

        // 🔥 XỬ LÝ 2: Bóc lỗi chi tiết cho addTaskSlice (Lấy chữ "sportCallFailed" từ Reason)
        if ("addTaskSlice".equals(actionType) && signal.data != null && signal.data.params != null) {
            try {
                Map<String, Object> params = objectMapper.convertValue(signal.data.params, Map.class);
                if (!isSuccess) {
                    String reason = (String) params.get("Reason");
                    message = "Lỗi quỹ đạo xe: " + (reason != null ? reason : "Không rõ nguyên nhân");
                }
            } catch (Exception e) {}
        }

        // TỔNG HỢP VÀ PHÂN LOẠI ĐỂ GỬI LÊN WEB UI
        if (isSuccess) {
            TaskService.pendingTaskCommands.remove(signal.id); // Xóa lệnh đang chờ phản hồi

            switch (actionType) {
                case "addTask":
                    alertType = "TASK_ACK";
                    message = "Gửi nhiệm vụ tổng thành công! Đang nạp quỹ đạo...";

                    // 🔥 BÓP CÒ: Lấy Slice từ kho ra và gửi đi ngay lập tức
                    Map<String, Object> pendingSlice = TaskService.pendingSlices.remove(serial);
                    if (pendingSlice != null) {
                        System.out.println("🚀 Đã nhận ACK của addTask, bắn tiếp addTaskSlice xuống " + serial);
                        protocolService.sendToRobot(serial, pendingSlice);

                        // Đưa ID của bản tin Slice này vào danh sách chờ Timeout bảo vệ
                        TaskService.pendingTaskCommands.put(String.valueOf(pendingSlice.get("ID")), System.currentTimeMillis());
                    } else {
                        System.err.println("⚠️ Không tìm thấy quỹ đạo (Slice) chờ sẵn cho xe: " + serial);
                    }
                    break;

                case "addTaskSlice":
                    alertType = "TASK_SLICE_ACK";
                    message = "Gửi quỹ đạo thành công! Xe bắt đầu chạy.";
                    break;
                case "pauseTask": alertType = "TASK_PAUSED"; message = "Robot đã tạm dừng!"; break;
                case "resumeTask": alertType = "TASK_RESUMED"; message = "Robot tiếp tục chạy!"; break;
                case "cancelTask": alertType = "TASK_CANCELED"; message = "Robot đã hủy nhiệm vụ!"; break;
            }
            System.out.println("✅ " + actionType + " thành công cho " + serial);
        } else {
            alertType = "TASK_FAILED";
            // Nếu không bóc được lỗi chuyên sâu ở trên, sẽ lấy thông báo lỗi chung từ biến "desc" (VD: "failed")
            if (message.isEmpty()) {
                message = "Lệnh " + actionType + " thất bại! Lỗi: " + (signal.desc != null ? signal.desc : "Unknown");
            }
            System.err.println("❌ " + actionType + " thất bại cho " + serial + " - " + message);
        }

        // Báo UI
        Map<String, Object> alert = new HashMap<>();
        alert.put("type", alertType);
        alert.put("message", message);
        alert.put("device", serial);
        messagingTemplate.convertAndSend("/topic/alerts", alert);
    }

    private void handleTaskState(RobotSignalDTO signal, String serial) {
        if (signal.body != null) {
            try {
                // 🔥 SỬA ĐỔI: Chuyển body thành Map để dễ dàng lấy mọi trường, kể cả SliceID
                Map<String, Object> bodyMap = objectMapper.convertValue(signal.body, Map.class);
                List<Map<String, Object>> states = (List<Map<String, Object>>) bodyMap.get("States");

                if (states != null && !states.isEmpty()) {
                    Map<String, Object> stateDetail = states.get(0);

                    // Lấy các thông tin cơ bản
                    String taskId = String.valueOf(stateDetail.get("TaskID"));
                    String stateStr = String.valueOf(stateDetail.get("State")); // "Running", "Finished", etc.

                    // 🔥 LẤY THÊM SLICE ID TỪ BẢN TIN (Phục vụ gọt đường A*)
                    String sliceId = String.valueOf(stateDetail.get("SliceID"));

                    // Map trạng thái sang code
                    int statusCode = mapStateToCode(stateStr);

                    // Update Cache nội bộ của Java
                    RobotSignalDTO.DataPayload currentData = latestRobotStates.getOrDefault(serial, new RobotSignalDTO.DataPayload());
                    if (currentData.execution == null) currentData.execution = new RobotStatusState.ExecutionDetail();

                    currentData.execution.robotTaskId = taskId;
                    currentData.execution.status = statusCode;
                    latestRobotStates.put(serial, currentData);

                    // Xử lý terminal state (Báo hoàn thành/Hủy)
                    if (isTerminalState(stateStr)) {
                        System.out.println("🏁 Robot " + serial + " kết thúc task: " + stateStr);
                        TaskService.pendingTaskCommands.remove(taskId); // Xóa nếu còn

                        Map<String, Object> alert = new HashMap<>();
                        alert.put("type", "TASK_" + stateStr.toUpperCase());
                        alert.put("message", "Nhiệm vụ " + taskId + ": " + stateStr);
                        alert.put("device", serial);
                        messagingTemplate.convertAndSend("/topic/alerts", alert);
                    }

                    // 🔥 GỬI GÓI TIN LÊN REACT (Bao gồm cả sliceId)
                    Map<String, Object> uiPayload = new HashMap<>();
                    uiPayload.put("vehicleId", serial);
                    uiPayload.put("type", "ROBOT_INFO_UPDATE");
                    uiPayload.put("taskId", taskId);
                    uiPayload.put("taskStatus", statusCode);
                    uiPayload.put("sliceId", sliceId); // <--- ĐÂY LÀ CHÌA KHÓA ĐỂ REACT GỌT ĐƯỜNG

                    messagingTemplate.convertAndSend("/topic/vehicle-status", uiPayload);
                }
            } catch (Exception e) {
                System.err.println("⚠️ Lỗi xử lý TaskState: " + e.getMessage());
            }
        }
    }
    // Helper: Map state string to code
    private int mapStateToCode(String state) {
        switch (state) {
            case "Queued": return 30;
            case "Running": return 40;
            case "Paused": return 50;
            case "Finished": return 60;
            case "Failed": return 101;
            case "Canceled": return 102;
            default: return 0;
        }
    }

    // Helper: Check terminal state
    private boolean isTerminalState(String state) {
        return "Finished".equals(state) || "Failed".equals(state) || "Canceled".equals(state);
    }

    // Helper: Send Login Command (dùng khi RegDevice thành công hoặc approved)
    private void sendLoginCommandToRobot(String vehicleId) {
        Map<String, Object> cmd = new HashMap<>();
        cmd.put("Action", "loginDevice");

        Map<String, Object> body = new HashMap<>();
        body.put("Username", "admin");
        body.put("Password", "admin123456");
        body.put("Ip", SERVER_IP);
        body.put("Port", SERVER_PORT);

        cmd.put("Body", body);
        cmd.put("Device", vehicleId);
        cmd.put("ID", "LOGIN_" + System.currentTimeMillis());
        cmd.put("Time", System.currentTimeMillis() * 1000);

        protocolService.sendToRobot(vehicleId, cmd);
    }

    private void saveLogToFile(String direction, String deviceId, Object payload) {
        try {
            // Chuyển đổi Object (JSON) thành chuỗi String dễ đọc
            String jsonString = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(payload);

            // Lấy thời gian hiện tại
            String timeStamp = java.time.LocalDateTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"));

            // Tạo dòng log
            String logLine = "--------------------------------------------------\n" +
                    "[" + timeStamp + "] " + direction + " | DEVICE: " + deviceId + "\n" +
                    jsonString + "\n\n";

            // Ghi nối vào file (Nếu chưa có file thì tự tạo)
            java.nio.file.Path path = java.nio.file.Paths.get("robot_history.log");
            java.nio.file.Files.write(path, logLine.getBytes(),
                    java.nio.file.StandardOpenOption.CREATE,
                    java.nio.file.StandardOpenOption.APPEND);

        } catch (Exception e) {
            System.err.println("❌ Lỗi khi ghi file log: " + e.getMessage());
        }
    }
}