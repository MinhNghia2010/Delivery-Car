package com.example.RobotServerMini.robotservice;

import com.example.RobotServerMini.DTO.DestinationDTO;
import com.example.RobotServerMini.DTO.MissionDTO;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.io.PrintWriter;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;

@Service
public class RobotService {

    private static final String ROBOT_IP = "192.168.29.53";
    private static final int ROBOT_PORT = 9000;

    public void processFollowWaypoints(MissionDTO request) {
        List<DestinationDTO> dests = request.getDestinations();

        // Check null hoặc rỗng
        if (dests == null || dests.isEmpty()) {
            System.err.println("⚠ Danh sách điểm trống.");
            return;
        }

        //  CASE 1: NẾU CHỈ CÓ 1 ĐIỂM -> CHUYỂN SANG NAVIGATE TO POSE
        if (dests.size() == 1) {
            System.out.println(" Phát hiện chỉ có 1 điểm -> Chuyển sang mode NavigateToPose (Chuẩn ROS2)");
            // Gọi lại hàm xử lý đơn điểm cũ của bạn
            processAndPrintMission(request);
            return; // 🛑 Dừng luôn, không chạy logic bên dưới nữa
        }

        //  CASE 2: NẾU > 1 ĐIỂM -> DÙNG FOLLOW WAYPOINTS (Logic cũ)
        System.out.println(" Phát hiện " + dests.size() + " điểm -> Dùng mode FollowWaypoints");

        FollowWaypointsPayload payload = new FollowWaypointsPayload();
        List<PoseStamped> poseList = new ArrayList<>();

        for (int i = 0; i < dests.size(); i++) {
            DestinationDTO currentPoint = dests.get(i);

            // Tính toán hướng (Orientation) để robot nhìn về điểm tiếp theo
            double theta;
            if (i < dests.size() - 1) {
                DestinationDTO nextPoint = dests.get(i + 1);
                theta = Math.atan2(nextPoint.getY() - currentPoint.getY(),
                        nextPoint.getX() - currentPoint.getX());
            } else {
                // Điểm cuối cùng: Giữ hướng của đoạn trước đó
                if (i > 0) {
                    DestinationDTO prevPoint = dests.get(i - 1);
                    theta = Math.atan2(currentPoint.getY() - prevPoint.getY(),
                            currentPoint.getX() - prevPoint.getX());
                } else {
                    theta = 0.0;
                }
            }

            double qz = Math.sin(theta / 2.0);
            double qw = Math.cos(theta / 2.0);

            // Tạo Pose
            PoseStamped pose = new PoseStamped();
            Header header = new Header();
            header.setFrame_id("map");
            pose.setHeader(header);

            PoseData poseData = new PoseData();
            Position position = new Position();
            position.setX(currentPoint.getX());
            position.setY(currentPoint.getY());
            position.setZ(0.0);

            Orientation orientation = new Orientation();
            orientation.setX(0.0);
            orientation.setY(0.0);
            orientation.setZ(qz);
            orientation.setW(qw);

            poseData.setPosition(position);
            poseData.setOrientation(orientation);
            pose.setPose(poseData);

            poseList.add(pose);
        }

        // Set danh sách và count
        payload.getGoal().setPoses(poseList);
        payload.getGoal().setCount(poseList.size()); // ✅ Có count cho đi nhiều điểm

        printDebugJson(payload);
//        sendJsonViaSocket(payload);
    }

    public void processAndPrintMission(MissionDTO request) {
        if (request.getDestinations() == null || request.getDestinations().isEmpty()) return;

        DestinationDTO target = request.getDestinations().get(0);
        double theta = Math.atan2(target.getY(), target.getX());
        double qz = Math.sin(theta / 2.0);
        double qw = Math.cos(theta / 2.0);

        NavigateToPosePayload payload = createPayload(target.getX(), target.getY(), qz, qw);

        printDebugJson(payload);
        sendJsonViaSocket(payload);
    }


    // Hàm gửi chung cho mọi loại Object (FollowWaypoints HOẶC NavigateToPose)
    private void sendJsonViaSocket(Object payload) {
        System.out.println("🔌 Connecting to Robot...");
        try (Socket socket = new Socket(ROBOT_IP, ROBOT_PORT);
             OutputStream output = socket.getOutputStream();
             PrintWriter writer = new PrintWriter(output, true)) {

            ObjectMapper mapper = new ObjectMapper();
            String jsonString = mapper.writeValueAsString(payload);

            writer.println(jsonString);
            System.out.println(" SENT SOCKET SUCCESS!");

        } catch (Exception e) {
            System.err.println(" SOCKET ERROR: " + e.getMessage());
        }
    }

    private void printDebugJson(Object payload) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(payload));
        } catch (Exception e) { e.printStackTrace(); }
    }

    private NavigateToPosePayload createPayload(double x, double y, double z, double w) {
        NavigateToPosePayload payload = new NavigateToPosePayload();
        payload.setPose(new PoseStamped());
        payload.getPose().setHeader(new Header());
        payload.getPose().getHeader().setFrame_id("map");
        payload.getPose().setPose(new PoseData());
        payload.getPose().getPose().setPosition(new Position());
        payload.getPose().getPose().getPosition().setX(x);
        payload.getPose().getPose().getPosition().setY(y);
        payload.getPose().getPose().getPosition().setZ(0.0);
        payload.getPose().getPose().setOrientation(new Orientation());
        payload.getPose().getPose().getOrientation().setZ(z);
        payload.getPose().getPose().getOrientation().setW(w);
        return payload;
    }



    public static class FollowWaypointsPayload {
        public String ros_type = "action";
        public String action_name = "/follow_waypoints";
        public String action_type = "nav2_msgs/action/FollowWaypoints";
        public String topic = null;
        public WaypointGoal goal = new WaypointGoal();

        public WaypointGoal getGoal() { return goal; }
    }

    @JsonPropertyOrder({ "poses", "count" }) // 1. Bắt buộc "pose" đứng trước "count"
    public static class WaypointGoal {

        private List<PoseStamped> poses;
        private int count;


        // 🟢 MỚI: Đổi tên Getter để JSON xuất ra key là "pose"
        public List<PoseStamped> getPoses() { return poses; }

        public void setPoses(List<PoseStamped> poses) { this.poses = poses; }

        public int getCount() { return count; }
        public void setCount(int count) { this.count = count; }
    }

    // 🔽 CÁC CLASS CŨ (GIỮ NGUYÊN ĐỂ TÁI SỬ DỤNG) 🔽

    public static class NavigateToPosePayload {
        private PoseStamped pose;
        public PoseStamped getPose() { return pose; }
        public void setPose(PoseStamped pose) { this.pose = pose; }
    }

    public static class PoseStamped {
        private Header header;
        private PoseData pose;
        public Header getHeader() { return header; }
        public void setHeader(Header header) { this.header = header; }
        public PoseData getPose() { return pose; }
        public void setPose(PoseData pose) { this.pose = pose; }
    }

    public static class Header {
        private String frame_id;
        public String getFrame_id() { return frame_id; }
        public void setFrame_id(String frame_id) { this.frame_id = frame_id; }
    }

    public static class PoseData {
        private Position position;
        private Orientation orientation;
        public Position getPosition() { return position; }
        public void setPosition(Position position) { this.position = position; }
        public Orientation getOrientation() { return orientation; }
        public void setOrientation(Orientation orientation) { this.orientation = orientation; }
    }

    public static class Position {
        private double x, y, z;
        public double getX() { return x; } public void setX(double x) { this.x = x; }
        public double getY() { return y; } public void setY(double y) { this.y = y; }
        public double getZ() { return z; } public void setZ(double z) { this.z = z; }
    }

    public static class Orientation {
        private double x, y, z, w;
        public double getX() { return x; } public void setX(double x) { this.x = x; }
        public double getY() { return y; } public void setY(double y) { this.y = y; }
        public double getZ() { return z; } public void setZ(double z) { this.z = z; }
        public double getW() { return w; } public void setW(double w) { this.w = w; }
    }
}