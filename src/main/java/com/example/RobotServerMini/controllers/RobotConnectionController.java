package com.example.RobotServerMini.controllers;

import com.example.RobotServerMini.models.RobotInformationModel;
import com.example.RobotServerMini.repository.RobotInformationRepository;
import com.example.RobotServerMini.robotservice.ProtocolService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.net.NetworkInterface;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.net.InetAddress;
import java.util.Enumeration;

@RestController
@RequestMapping("/api/cars")
@CrossOrigin(origins = "*") // Cho phép Frontend gọi vào
public class RobotConnectionController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private RobotInformationRepository robotInfoRepo;

    @Autowired
    private ProtocolService protocolService;

    // API để Frontend gọi lên khi bấm nút Accept/Reject
    @PostMapping("/connection-response")
    public void handleConnectionResponse(@RequestBody Map<String, Object> payload) {
        String vehicleId = (String) payload.get("vehicleId");
        String action = (String) payload.get("action"); // "ACCEPTED" hoặc "REJECTED"

        System.out.println("🖱️ UI ra lệnh [" + action + "] cho xe: " + vehicleId);

        Optional<RobotInformationModel> robotOpt = robotInfoRepo.findBySerialNo(vehicleId);

        if (robotOpt.isPresent()) {
            RobotInformationModel robot = robotOpt.get();

            if ("ACCEPTED".equals(action)) {
                // 1. Cập nhật DB thành APPROVED
                robot.setConnectionStatus("APPROVED");
                robotInfoRepo.save(robot);

                // 2. Gửi lệnh Login xuống Robot (để Robot bắt đầu gửi data)
                boolean sent = sendLoginCommandToRobot(vehicleId);

                if (sent) {
                    System.out.println("✅ Đã gửi lệnh Login xuống Socket cho: " + vehicleId);

                    // Báo lại cho UI cập nhật màu xanh ngay lập tức
                    messagingTemplate.convertAndSend("/topic/vehicle-status",
                            Map.of("vehicleId", vehicleId, "connectionStatus", "APPROVED"));
                } else {
                    System.err.println("Lỗi: Không tìm thấy socket để gửi Login cho: " + vehicleId);
                }

            } else {
                // 1. Cập nhật DB thành REJECTED
                robot.setConnectionStatus("REJECTED");
                robotInfoRepo.save(robot);
                System.out.println("Đã từ chối kết nối xe: " + vehicleId);
            }
        } else {
            System.err.println("Không tìm thấy thông tin xe trong DB: " + vehicleId);
        }
    }

    /**
     * Hàm đóng gói bản tin Login theo chuẩn Huaray
     * Lưu ý: IP và Port ở đây là thông tin Server gửi cho Robot để Robot biết
     */
    private boolean sendLoginCommandToRobot(String vehicleId) {
        try {
            Map<String, Object> cmd = new HashMap<>();
            cmd.put("Action", "loginDevice");

            Map<String, Object> body = new HashMap<>();
            body.put("Username", "admin");
            body.put("Password", "admin123456");

            String serverIp = getCorrectLocalIp();
            body.put("Ip", serverIp);
            body.put("Port", 8095); // Port này thường cố định nên để cứng được

            cmd.put("Body", body);
            cmd.put("Device", vehicleId);
            cmd.put("ID", "LOGIN_" + System.currentTimeMillis());
            cmd.put("Time", System.currentTimeMillis() * 1000);

            // Gọi ProtocolService để bắn tin xuống Socket
            return protocolService.sendToRobot(vehicleId, cmd);
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    // =========================================================
    // 🔥 HÀM TÌM IP CHUẨN XÁC (HỖ TRỢ CẢ MẠNG LAN & TAILSCALE)
    // =========================================================
//    private String getCorrectLocalIp() {
//        try {
//            String wifiLanIp = null; // Biến dự phòng cho mạng Wifi
//            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
//
//            while (interfaces.hasMoreElements()) {
//                NetworkInterface networkInterface = interfaces.nextElement();
//
//                // Bỏ qua card mạng tắt hoặc card loopback (127.0.0.1)
//                if (!networkInterface.isUp() || networkInterface.isLoopback()) {
//                    continue;
//                }
//
//                String name = networkInterface.getName().toLowerCase();
//                String displayName = networkInterface.getDisplayName().toLowerCase();
//
//                // Lọc bỏ các phần mềm máy ảo rác, NHƯNG tha cho Tailscale
//                if ((name.contains("vmnet") || name.contains("vbox") || name.contains("wsl"))
//                        && !name.contains("tailscale") && !displayName.contains("tailscale")) {
//                    continue;
//                }
//
//                Enumeration<InetAddress> addresses = networkInterface.getInetAddresses();
//                while (addresses.hasMoreElements()) {
//                    InetAddress addr = addresses.nextElement();
//                    String ip = addr.getHostAddress();
//
//                    // Chỉ lấy định dạng IPv4 (chứa dấu chấm)
//                    if (ip.contains(".")) {
//
//                        // 🔥 ƯU TIÊN SỐ 1: Bắt trúng IP của Tailscale (thường bắt đầu bằng 100.)
//                        if (name.contains("tailscale") || displayName.contains("tailscale") || ip.startsWith("100.")) {
//                            System.out.println("[MẠNG] Đã phát hiện kết nối Tailscale!");
//                            return ip; // Trả về luôn IP Tailscale ngay lập tức!
//                        }
//
//                        // 🔥 ƯU TIÊN SỐ 2: Lưu lại IP của Wifi/LAN nội bộ làm dự phòng
//                        if (addr.isSiteLocalAddress()) {
//                            wifiLanIp = ip;
//                        }
//                    }
//                }
//            }
//
//            // Nếu không có Tailscale, dùng Wifi/LAN. Nếu không có cả hai, đành dùng LocalHost.
//            return wifiLanIp != null ? wifiLanIp : InetAddress.getLocalHost().getHostAddress();
//
//        } catch (Exception e) {
//            System.err.println("Lỗi quét IP: " + e.getMessage());
//            return "127.0.0.1";
//        }
//    }

    private String getCorrectLocalIp() {
        // Fix cứng IP theo đúng mạng hiện tại của bạn
        return "192.168.28.77";
    }
}