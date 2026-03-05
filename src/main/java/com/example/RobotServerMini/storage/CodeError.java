package com.example.RobotServerMini.storage;

public class CodeError {
    //    @PostMapping("/robot-signal")
//    public Map<String, Object> handleSignal(@RequestBody RobotSignalDTO signal , HttpServletRequest request) {
//        Map<String, Object> response = new HashMap<>();
//        String currentSerial = signal.device;
//
//        try {
//            // IN RA BẢN TIN ROBOT GỬI LÊN
//            String jsonReceived = objectMapper.writeValueAsString(signal);
//            // Chỉ in nếu không phải HeartBeating
//            if (!"HeartBeating".equals(signal.report)) {
//                System.out.println("\n📥 [ROBOT >> SERVER] (" + signal.report + "): " + jsonReceived);
//            }
//
//        } catch (Exception e) {
//            System.err.println("Lỗi in log: " + e.getMessage());
//        }
//
//        // -----------------------------------------------------------
//        // CASE 1: ROBOT GỬI YÊU CẦU ĐĂNG KÝ (Report = "RegDevice")
//        // -----------------------------------------------------------
//        if ("RegDevice".equals(signal.report)) {
//            System.out.println("📡 Nhận RegDevice từ: " + currentSerial);
//
//            Optional<RobotInformationModel> exists = robotInfoRepo.findBySerialNo(currentSerial);
//
//            // Lấy trạng thái hiện tại (nếu chưa có thì là null)
//            String currentStatus = exists.map(RobotInformationModel::getConnectionStatus).orElse(null);
//
//            // --- KIỂM TRA: NẾU ĐÃ ĐƯỢC DUYỆT (APPROVED) ---
//            if ("APPROVED".equals(currentStatus) || "DISCONNECTED".equals(currentStatus)) {
//
//                // 🔥 QUAN TRỌNG: Nếu đang là DISCONNECTED, phải set lại thành APPROVED ngay
//                // Để HeartbeatService bắt đầu theo dõi lại
//                if ("DISCONNECTED".equals(currentStatus)) {
//                    RobotInformationModel robot = exists.get();
//                    robot.setConnectionStatus("APPROVED");// Reset trạng thái vận hành
//                    robotInfoRepo.save(robot);
//                }
//
//                // ✅ Trả về ngay Form Login
//                response.put("Action", "loginDevice");
//
//                Map<String, Object> body = new HashMap<>();
//                body.put("Username", "admin");
//                body.put("Password", "admin123456");
//                body.put("Ip", SERVER_IP); // IP server config ở trên
//                body.put("Port", SERVER_PORT);
//
//                response.put("Body", body);
//                response.put("Device", currentSerial);
//                response.put("ID", "LOGIN_" + System.currentTimeMillis());
//                response.put("Time", System.currentTimeMillis() * 1000);
//
//                return response; // Gửi về cho Robot
//            }
//
//            // --- NẾU CHƯA ĐƯỢC DUYỆT HOẶC XE MỚI ---
//            RobotInformationModel robotInfo = exists.orElse(new RobotInformationModel());
//
//            // Chỉ set PENDING và báo UI nếu đây là xe mới (tránh spam UI và reset trạng thái REJECTED)
//            if (currentStatus == null) {
//                robotInfo.setSerialNo(currentSerial);
//                robotInfo.setConnectionStatus("PENDING");
//
//                // Lấy IP/Port lưu lại
//                String robotIp = request.getRemoteAddr();
//                if ("0:0:0:0:0:0:0:1".equals(robotIp)) robotIp = "127.0.0.1";
//                robotInfo.setIpAddress(robotIp);
//                robotInfo.setPort(33026);
//                robotInfo.setLastLoginTime(System.currentTimeMillis());
//
//                robotInfoRepo.save(robotInfo);
//
//                // Bắn Socket báo UI (Chỉ bắn khi xe mới tinh chưa có status)
//                Map<String, Object> alert = new HashMap<>();
//                alert.put("type", "CONNECTION_REQUEST");
//                alert.put("vehicleId", currentSerial);
//                alert.put("ip", robotIp);
//                alert.put("message", "Yêu cầu kết nối");
//                messagingTemplate.convertAndSend("/topic/alerts", alert);
//            }
//
//            // Trả về báo Robot tiếp tục chờ
//            response.put("desc", "WAIT_FOR_ADMIN");
//            return response;
//        }
//
//        // -----------------------------------------------------------
//        // CASE 2: ROBOT GỬI KẾT QUẢ LOGIN (Report = "loginDevice")
//        // -----------------------------------------------------------
//        else if ("loginDevice".equals(signal.report)) {
//            System.out.println("✅ Nhận kết quả Login từ: " + signal.device);
//
//            // Kiểm tra code = 1000 (Thành công)
//            if (signal.code != null && signal.code == 1000 && signal.data != null) {
//                saveRobotInformation(signal);
//            }
//
//            // Server phản hồi đơn giản (ACK)
//            response.put("desc", "SUCCESS");
//            return response;
//        }
//
//        // ==================================================================
//        // CASE 3: ROBOT PHẢN HỒI HEARTBEAT (Report = "HeartBeating")
//        // ==================================================================
//        else if ("HeartBeating".equals(signal.report)) {
//            String serialNo = signal.device; // Lấy Serial từ bản tin
//
//            // KIỂM TRA TRONG DATABASE
//            // Query xem serialNo này có khớp với con nào trong bảng robot_register_informations không
//            Optional<RobotInformationModel> robotOpt = robotInfoRepo.findBySerialNo(serialNo);
//
//            if (robotOpt.isPresent()) {
//                // ==> TÌM THẤY
//                RobotInformationModel robot = robotOpt.get();
//
//                // 2. CẬP NHẬT THỜI GIAN SỐNG
//                robot.setLastHeartbeatTime(System.currentTimeMillis());
//                robotInfoRepo.save(robot);
//
////                System.out.println("Heartbeat OK: " + serialNo);
//
//                // 3. (Tùy chọn) Báo ngay cho UI là xe này đang Online
//                // messagingTemplate.convertAndSend("/topic/robot-status", serialNo + ":ONLINE");
//
//            } else {
//                // ==> KHÔNG TÌM THẤY (Robot lạ hoặc chưa đăng ký)
//                System.out.println("⚠Nhận Heartbeat từ Robot lạ (Chưa có trong DB): " + serialNo);
//                // Từ chối tiếp nhận (return null hoặc lỗi)
//                return null;
//            }
//
//            // Server không cần trả lời gì thêm cho bản tin này, hoặc trả về rỗng
//            return new HashMap<>();
//        }
//// ==================================================================
//        // 🔥 CASE 4 (MỚI): XỬ LÝ ROBOT INFO & GỬI TÍN HIỆU LÊN UI
//        // ==================================================================
//        else if ("RobotInfo".equals(signal.report)) {
//            if (signal.data != null) {
//                latestRobotStates.put(currentSerial, signal.data);
//                Map<String, Object> uiPayload = new HashMap<>();
//
//                // 1. Gắn cờ để Frontend biết đây là tin cập nhật trạng thái
//                uiPayload.put("vehicleId", currentSerial);
//                uiPayload.put("type", "ROBOT_INFO_UPDATE");
//
//                // 2. Map dữ liệu từ DTO mới sang JSON phẳng cho Frontend dễ dùng
//                if (signal.data.statusDetail != null) {
//                    var s = signal.data.statusDetail;
//                    uiPayload.put("x", s.longitude);       // Vị trí X
//                    uiPayload.put("y", s.latitude);        // Vị trí Y
//                    uiPayload.put("z", s.altitude);        // Độ cao Z
//                    uiPayload.put("yaw", s.azimuth);       // Góc quay
//                    uiPayload.put("speed", s.speed);       // Tốc độ
//                    uiPayload.put("driveMode", s.driveMode);
//                    uiPayload.put("mapName", s.mapName);
//                    uiPayload.put("isOpen", s.isOpen);
//                }
//
//                if (signal.data.fuelDetail != null) {
//                    var f = signal.data.fuelDetail;
//                    uiPayload.put("battery", f.residualFuel);  // % Pin
//                    uiPayload.put("isCharging", f.isCharging); // Đang sạc?
//                    uiPayload.put("odometer", f.odometer);     // Tổng KM
//                    uiPayload.put("endurance", f.endurance);
//                }
//
//                if (signal.data.execution != null) {
//                    var e = signal.data.execution;
//                    uiPayload.put("taskId", e.executeTaskId);
//                    uiPayload.put("taskStatus", e.status);
//                    uiPayload.put("currentPoint", e.parkPointId);
//                }
//
//                // 3. BẮN TÍN HIỆU LÊN UI (Thay thế logic cũ của FleetController)
//                // Frontend App.js đã subscribe "/topic/vehicle-status" nên sẽ nhận được ngay
//                messagingTemplate.convertAndSend("/topic/vehicle-status", uiPayload);
//            }
//
//            // 4. TRẢ LỜI ACK CHO ROBOT
//            response.put("Action", "RobotInfoAck");
//            Map<String, Object> body = new HashMap<>();
//            body.put("result", true);
//            response.put("Body", body);
//            response.put("Device", currentSerial);
//            response.put("ID", signal.id);
//            response.put("Time", System.currentTimeMillis() * 1000);
//
//            return response;
//        }
//
//        if ("addTask".equals(signal.report)) {
//            String cmdId = signal.id; // Robot Echo lại ID server gửi
//            String vehicleId = signal.device;
//
//            // Kiểm tra xem có phải lệnh mình đang chờ không
//            if (pendingTaskCommands.containsKey(cmdId)) {
//                System.out.println("✅ Robot " + vehicleId + " đã NHẬN LỆNH (ACK) cho ID: " + cmdId);
//
//                // Xóa khỏi danh sách chờ (Thành công)
//                pendingTaskCommands.remove(cmdId);
//
//                // Báo UI: Robot đã nhận lệnh
//                Map<String, Object> alert = new HashMap<>();
//                alert.put("type", "TASK_ACK");
//                alert.put("message", "Robot " + vehicleId + " đã nhận nhiệm vụ!");
//                alert.put("device", vehicleId);
//                messagingTemplate.convertAndSend("/topic/alerts", alert);
//            }
//            return null; // Không cần trả lời lại ACK của Robot
//        }
//
//        if ("pauseTask".equals(signal.report)) {
//            String cmdId = signal.id;
//            String vehicleId = signal.device;
//
//            // Kiểm tra xem lệnh này có phải do mình gửi không
//            if (pendingTaskCommands.containsKey(cmdId)) {
//                System.out.println("✅ Robot " + vehicleId + " đã PAUSE thành công!");
//                pendingTaskCommands.remove(cmdId);
//
//                // Báo UI
//                Map<String, Object> alert = new HashMap<>();
//                alert.put("type", "TASK_PAUSED");
//                alert.put("message", "Robot " + vehicleId + " đã tạm dừng nhiệm vụ!");
//                alert.put("device", vehicleId);
//                messagingTemplate.convertAndSend("/topic/alerts", alert);
//            }
//            return null;
//        }
//
//        if ("resumeTask".equals(signal.report)) {
//            String cmdId = signal.id;
//            String vehicleId = signal.device;
//
//            if (pendingTaskCommands.containsKey(cmdId)) {
//                System.out.println("✅ Robot " + vehicleId + " đã RESUME thành công!");
//                pendingTaskCommands.remove(cmdId);
//
//                // Báo UI
//                Map<String, Object> alert = new HashMap<>();
//                alert.put("type", "TASK_RESUMED"); // Frontend lắng nghe cái này để đổi màu nút
//                alert.put("message", "Robot " + vehicleId + " đã tiếp tục chạy!");
//                alert.put("device", vehicleId);
//                messagingTemplate.convertAndSend("/topic/alerts", alert);
//            }
//            return null;
//        }
//        if ("cancelTask".equals(signal.report)) {
//            String cmdId = signal.id;
//            String vehicleId = signal.device;
//
//            if (pendingTaskCommands.containsKey(cmdId)) {
//                System.out.println("✅ Robot " + vehicleId + " đã HỦY (CANCEL) thành công!");
//                pendingTaskCommands.remove(cmdId);
//
//                // Báo UI
//                Map<String, Object> alert = new HashMap<>();
//                alert.put("type", "TASK_CANCELED");
//                alert.put("message", "Robot " + vehicleId + " đã hủy nhiệm vụ!");
//                alert.put("device", vehicleId);
//                messagingTemplate.convertAndSend("/topic/alerts", alert);
//            }
//            return null;
//        }
//
//
//
//        return null;
//    }
}
