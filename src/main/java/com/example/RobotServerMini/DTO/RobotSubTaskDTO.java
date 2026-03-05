package com.example.RobotServerMini.DTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class RobotSubTaskDTO {

    // --- REQUEST (Server -> Robot) ---
    public static class TaskRequest {
        @JsonProperty("Action")
        public String action = "addTask";

        @JsonProperty("Body")
        public TaskBody body;

        @JsonProperty("Device")
        public String device;

        @JsonProperty("ID")
        public String id;

        @JsonProperty("Time")
        public long time;
    }

    public static class TaskBody {
        @JsonProperty("Task")
        public List<TaskItem> task;
    }

    public static class TaskItem {
        @JsonProperty("TaskId")
        public String taskId;

        @JsonProperty("BizTaskId")
        public String bizTaskId;

        @JsonProperty("Type")
        public String type = "COMBINE_TASK";

        @JsonProperty("Timeout")
        public int timeout = -1;

        @JsonProperty("NeedACK")
        public int needACK = 1;

        @JsonProperty("Source")
        public String source = "DCS";

        @JsonProperty("StartFromCurrent")
        public boolean startFromCurrent = true;

        @JsonProperty("WayPoints")
        public List<WayPoint> wayPoints;

        @JsonProperty("ReturnPoint")
        public Object returnPoint = null;

        @JsonProperty("Name")
        public String name;
    }

    public static class WayPoint {
        @JsonProperty("Order")
        public int order;

        @JsonProperty("PointId")
        public String pointId;

        // 🔥 ĐÃ BỔ SUNG TRƯỜNG POINTNAME BỊ THIẾU
        @JsonProperty("Pointname")
        public String pointName;

        @JsonProperty("Pose")
        public Pose pose;
    }

    public static class Pose {
        @JsonProperty("Position")
        public Position position;

        @JsonProperty("Angle")
        public double angle; // Hướng 0.001 độ
    }

    public static class Position {
        @JsonProperty("x") // Thêm JsonProperty cho chắc chắn dù thư viện thường tự map
        public double x;

        @JsonProperty("y")
        public double y;
    }
}