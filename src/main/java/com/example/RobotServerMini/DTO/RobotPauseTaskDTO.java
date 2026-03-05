package com.example.RobotServerMini.DTO;

import com.fasterxml.jackson.annotation.JsonProperty;

public class RobotPauseTaskDTO {

    // --- CẤU TRÚC HEADER ---
    @JsonProperty("Action")
    public String action = "pauseTask";

    @JsonProperty("Body")
    public PauseBody body;

    @JsonProperty("Device")
    public String device;

    @JsonProperty("ID")
    public String id;

    @JsonProperty("Time")
    public long time;

    // --- CẤU TRÚC BODY ---
    public static class PauseBody {
        @JsonProperty("TaskId")
        public String taskId;       // Bắt buộc

        @JsonProperty("BizTaskId")
        public String bizTaskId;    // Bắt buộc (có thể giống TaskId)

        @JsonProperty("Stoptype")
        public Integer stopType = 0; // 0: Parking (Mặc định), 1: Next Point, 2: Emergency
    }
}
