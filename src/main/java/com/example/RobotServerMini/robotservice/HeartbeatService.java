package com.example.RobotServerMini.robotservice;

import com.example.RobotServerMini.models.RobotInformationModel;
import com.example.RobotServerMini.repository.RobotInformationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@EnableScheduling
public class HeartbeatService {

    @Autowired
    private RobotInformationRepository robotInfoRepo;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ProtocolService protocolService;

    // Map đếm số lần thất bại: Key = SerialNo, Value = Số lần không phản hồi
    private final Map<String, AtomicInteger> failureCounts = new ConcurrentHashMap<>();

    // Cấu hình
    private final int MAX_MISSED_HEARTBEATS = 10; // 10 lần (tức là 60 giây)


    // 1. GỬI HEARTBEAT ĐỊNH KỲ (Mỗi 6 giây) CHO TẤT CẢ ROBOT
    @Scheduled(fixedRate = 6000)
    public void sendHeartbeatToAllRobots() {
        List<RobotInformationModel> allRobots = robotInfoRepo.findAll();

        for (RobotInformationModel robot : allRobots) {
            String serialNo = robot.getSerialNo();
            String currentStatus = robot.getConnectionStatus();

            // 🔥 SỬA CHỖ NÀY: Nếu xe CHƯA ĐƯỢC DUYỆT (PENDING, DISCONNECTED) -> Bỏ qua luôn, không hỏi han gì cả!
            if (!"APPROVED".equals(currentStatus)) {
                // Xóa bộ đếm lỗi cũ đi cho sạch bộ nhớ
                failureCounts.remove(serialNo);
                continue;
            }

            // --- Bắt đầu tính lỗi cho xe đã APPROVED ---
            AtomicInteger count = failureCounts.computeIfAbsent(serialNo, k -> new AtomicInteger(0));
            int currentFailures = count.incrementAndGet();

            if (currentFailures > MAX_MISSED_HEARTBEATS) {
                System.err.println("☠️ DEAD: Robot " + serialNo + " không phản hồi 10 lần liên tiếp -> DISCONNECT.");
                handleDisconnect(robot);
                continue;
            }

            // Gửi gói tin HeartBeating xuống Robot
            sendHeartbeatPacket(serialNo);
        }
    }


    // 2. XỬ LÝ KHI ROBOT PHẢN HỒI (Được gọi từ Controller)

    public void receiveHeartbeatAck(String serialNo) {
        // 1. Reset bộ đếm về 0 vì Robot vẫn sống
        if (failureCounts.containsKey(serialNo)) {
            failureCounts.get(serialNo).set(0);
        }

        // 2. Cập nhật vào DB và KIỂM TRA TRẠNG THÁI
        robotInfoRepo.findBySerialNo(serialNo).ifPresent(robot -> {
            boolean statusChanged = false;

            // LOGIC MỚI: Nếu xe đang không phải APPROVED (ví dụ Disconnected) mà lại phản hồi
            // -> Tự động chuyển sang APPROVED
            if (!"APPROVED".equals(robot.getConnectionStatus())) {
                robot.setConnectionStatus("APPROVED");
                statusChanged = true;
            }

            robot.setLastHeartbeatTime(System.currentTimeMillis());
            robotInfoRepo.save(robot);


            // Nếu có thay đổi trạng thái thì báo UI đổi màu ngay
            if (statusChanged) {
                messagingTemplate.convertAndSend("/topic/vehicle-status",
                        Map.of("vehicleId", serialNo, "connectionStatus", "APPROVED"));
            }
        });
    }

    // =========================================================================
    // 3. HÀM GỬI GÓI TIN (ĐÚNG FORMAT YÊU CẦU)
    // =========================================================================
    private boolean sendHeartbeatPacket(String serialNo) {
        Map<String, Object> packet = new HashMap<>();
        packet.put("Action", "HeartBeating");
        packet.put("Body", new HashMap<>()); // Body rỗng
        packet.put("Device", serialNo);

        long now = System.currentTimeMillis();
        packet.put("ID", "HB_" + now);
        packet.put("Time", now * 1000);

        return protocolService.sendToRobot(serialNo, packet);
    }

    // =========================================================================
    // 4. XỬ LÝ NGẮT KẾT NỐI
    // =========================================================================
    private void handleDisconnect(RobotInformationModel robot) {
        String serialNo = robot.getSerialNo();

        // Update DB
        robot.setConnectionStatus("DISCONNECTED");
        robotInfoRepo.save(robot);

        // Xóa khỏi bộ đếm (để lần sau ping lại từ 1)
        failureCounts.remove(serialNo);

        // Báo UI
        messagingTemplate.convertAndSend("/topic/vehicle-status",
                Map.of("vehicleId", serialNo, "connectionStatus", "DISCONNECTED"));

        Map<String, Object> alert = new HashMap<>();
        alert.put("type", "ROBOT_DISCONNECTED");
        alert.put("message", "Mất kết nối với " + serialNo + " (Timeout)");
        messagingTemplate.convertAndSend("/topic/alerts", alert);
    }
}