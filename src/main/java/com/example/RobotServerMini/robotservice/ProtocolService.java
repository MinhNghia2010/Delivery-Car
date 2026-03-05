//
//package com.example.RobotServerMini.robotservice;
//
//import com.example.RobotServerMini.DTO.RobotSignalDTO;
//import com.example.RobotServerMini.controllers.RobotGatewayController;
//import com.fasterxml.jackson.databind.JsonNode;
//import com.fasterxml.jackson.databind.ObjectMapper;
//import com.example.RobotServerMini.protocol.RobotFrameDecoder;
//import com.example.RobotServerMini.protocol.RobotProtocolCodec;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.context.annotation.Lazy;
//import org.springframework.stereotype.Service;
//
//import jakarta.annotation.PostConstruct;
//import java.io.InputStream;
//import java.io.OutputStream;
//import java.net.ServerSocket;
//import java.net.Socket;
//import java.util.List;
//import java.util.concurrent.ConcurrentHashMap;
//
//@Service
//public class ProtocolService {
//
//    private static final int PORT = 8095;
//    // Map lưu socket: Key = SerialNo (Robot_1), Value = Socket
//    private final ConcurrentHashMap<String, Socket> connectedRobots = new ConcurrentHashMap<>();
//    private final ObjectMapper objectMapper = new ObjectMapper();
//
//    @Autowired
//    @Lazy
//    private RobotGatewayController robotController;
//
//    @PostConstruct
//    public void startServer() {
//        new Thread(() -> {
//            try (ServerSocket serverSocket = new ServerSocket(PORT)) {
//                System.out.println("🚀 TCP Socket Server đang chạy ở cổng " + PORT);
//                while (true) {
//                    Socket clientSocket = serverSocket.accept();
//                    new Thread(() -> handleClient(clientSocket)).start();
//                }
//            } catch (Exception e) {
//                e.printStackTrace();
//            }
//        }).start();
//    }
//
//    private void handleClient(Socket socket) {
//        String currentDeviceId = null;
//        try {
//            InputStream in = socket.getInputStream();
//            RobotFrameDecoder decoder = new RobotFrameDecoder();
//            byte[] buffer = new byte[2048];
//            int len;
//
//            while ((len = in.read(buffer)) != -1) {
//                List<JsonNode> messages = decoder.feed(buffer, len);
//
//                for (JsonNode json : messages) {
//                    RobotSignalDTO signalDTO = objectMapper.treeToValue(json, RobotSignalDTO.class);
//
//                    System.out.println("📥 SOCKET RECEIVE JSON: " + json.toString());
////                    System.out.println("   👉 Parsed Device ID: " + signalDTO.device);
//
//                    if (signalDTO.device != null) {
//                        currentDeviceId = signalDTO.device;
//                        // Cập nhật Map liên tục
//                        connectedRobots.put(currentDeviceId, socket);
//                    }
//
//                    robotController.processSignalFromSocket(signalDTO);
//                }
//            }
//        } catch (Exception e) {
//            System.err.println("Mất kết nối với Robot: " + currentDeviceId + " (" + e.getMessage() + ")");
//        } finally {
//            if (currentDeviceId != null) {
//                connectedRobots.remove(currentDeviceId);
//                System.out.println("❌ Đã xóa socket của: " + currentDeviceId);
//            }
//        }
//    }
//
//    public boolean sendToRobot(String deviceId, Object dtoPayload) {
//        // 🔥 DEBUG: Kiểm tra xem trong kho đang có socket nào
////        System.out.println("🔍 Đang tìm Socket cho ID: [" + deviceId + "]");
////        System.out.println("📋 Danh sách Socket hiện có: " + connectedRobots.keySet());
//
//        Socket socket = connectedRobots.get(deviceId);
//
//        if (socket == null) {
//            System.err.println("❌ ERROR: Không tìm thấy Socket trong Map cho ID: " + deviceId);
//            return false;
//        }
//        if (!socket.isConnected()) {
//            System.err.println("❌ ERROR: Socket đã bị ngắt kết nối cho ID: " + deviceId);
//            connectedRobots.remove(deviceId);
//            return false;
//        }
//
//        try {
//            JsonNode jsonNode = objectMapper.valueToTree(dtoPayload);
//            byte[] packet = RobotProtocolCodec.buildTcpMessage(jsonNode);
//            StringBuilder hexString = new StringBuilder();
//            for (byte b : packet) {
//                hexString.append(String.format("%02X ", b));
//            }
////            System.out.println("📦 [DEBUG HEX] Gửi " + packet.length + " bytes tới " + deviceId + ":");
//            System.out.println("   👉 " + hexString.toString());
//            OutputStream out = socket.getOutputStream();
//            out.write(packet);
//            out.flush();
//            System.out.println("📤 Gửi thành công tới " + deviceId);
//            return true;
//        } catch (Exception e) {
//            e.printStackTrace();
//            return false;
//        }
//    }
//}


package com.example.RobotServerMini.robotservice;

import com.example.RobotServerMini.DTO.RobotSignalDTO;
import com.example.RobotServerMini.protocol.RobotFrameDecoder;
import com.example.RobotServerMini.protocol.RobotProtocolCodec;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ProtocolService {

    private static final int PORT = 8095;
    // Map lưu socket: Key = SerialNo (Robot_1), Value = Socket
    private final ConcurrentHashMap<String, Socket> connectedRobots = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 🔥 SỬA 1: Gọi sang RobotSignalService thay vì Controller cũ
    @Autowired
    @Lazy // Giữ @Lazy để tránh vòng lặp dependency (SignalService cũng gọi lại ProtocolService)
    private RobotSignalService robotSignalService;

    @PostConstruct
    public void startServer() {
        new Thread(() -> {
            try (ServerSocket serverSocket = new ServerSocket(PORT)) {
                System.out.println("🚀 TCP Socket Server đang chạy ở cổng " + PORT);
                while (true) {
                    Socket clientSocket = serverSocket.accept();
                    new Thread(() -> handleClient(clientSocket)).start();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private void handleClient(Socket socket) {
        String currentDeviceId = null;
        try {
            InputStream in = socket.getInputStream();
            RobotFrameDecoder decoder = new RobotFrameDecoder();
            byte[] buffer = new byte[2048];
            int len;

            while ((len = in.read(buffer)) != -1) {
                List<JsonNode> messages = decoder.feed(buffer, len);

                for (JsonNode json : messages) {
                    RobotSignalDTO signalDTO = objectMapper.treeToValue(json, RobotSignalDTO.class);

                    // Debug Log (Có thể comment lại cho đỡ rối)
                    // System.out.println("📥 SOCKET RECEIVE JSON: " + json.toString());

                    if (signalDTO.device != null) {
                        currentDeviceId = signalDTO.device;
                        // Cập nhật Map liên tục để đảm bảo socket luôn mới nhất
                        connectedRobots.put(currentDeviceId, socket);
                    }

                    // 🔥 SỬA 2: Chuyển thẳng vào Service xử lý logic
                    robotSignalService.handleSignal(signalDTO);
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ Mất kết nối với Robot: " + currentDeviceId + " (" + e.getMessage() + ")");
        } finally {
            if (currentDeviceId != null) {
                connectedRobots.remove(currentDeviceId);
                System.out.println("❌ Đã xóa socket của: " + currentDeviceId);
            }
            try { socket.close(); } catch (Exception ignored) {}
        }
    }

    public boolean sendToRobot(String deviceId, Object dtoPayload) {
        Socket socket = connectedRobots.get(deviceId);

        if (socket == null) {
//            System.err.println("❌ ERROR: Không tìm thấy Socket trong Map cho ID: " + deviceId);
            return false;
        }
        if (!socket.isConnected() || socket.isClosed()) {
//            System.err.println("❌ ERROR: Socket đã bị ngắt kết nối cho ID: " + deviceId);
            connectedRobots.remove(deviceId);
            return false;
        }

        try {
            JsonNode jsonNode = objectMapper.valueToTree(dtoPayload);
            // Sử dụng PrettyPrinter để in JSON có thụt lề cho dễ đọc
            // ==========================================================
            String action = jsonNode.path("Action").asText("");

            if (!"HeartBeating".equals(action) && !"RobotInfoAck".equals(action)) {
                String prettyJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(jsonNode);
                System.out.println("\n=======================================================");
                System.out.println("📤 [GỬI XUỐNG ROBOT: " + deviceId + "]");
                System.out.println(prettyJson);
                System.out.println("=======================================================\n");
            }
            // ==========================================================

            // Đóng gói gửi xuống robot
            byte[] packet = RobotProtocolCodec.buildTcpMessage(jsonNode);


            // In Hex để debug (Tùy chọn)
            // StringBuilder hexString = new StringBuilder();
            // for (byte b : packet) hexString.append(String.format("%02X ", b));
            // System.out.println("   👉 " + hexString.toString());

            OutputStream out = socket.getOutputStream();
            out.write(packet);
            out.flush();
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}
