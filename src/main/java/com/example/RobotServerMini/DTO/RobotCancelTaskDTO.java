package com.example.RobotServerMini.DTO;

import com.fasterxml.jackson.annotation.JsonProperty;

public class RobotCancelTaskDTO {

    // --- CẤU TRÚC HEADER ---
    @JsonProperty("Action")
    public String action = "cancelTask";

    @JsonProperty("Body")
    public CancelBody body;

    @JsonProperty("Device")
    public String device;

    @JsonProperty("ID")
    public String id;

    @JsonProperty("Time")
    public long time;

    // --- CẤU TRÚC BODY (ĐẦY ĐỦ KHÔNG THIẾU TRƯỜNG NÀO) ---
    public static class CancelBody {
        @JsonProperty("TaskId")
        public String taskId;       // Bắt buộc

        @JsonProperty("BizTaskId")
        public String bizTaskId;    // Bắt buộc (thường giống TaskId)

        @JsonProperty("Stoptype")
        public Integer stopType;    // Có trong JSON mẫu (0)

        @JsonProperty("Reason")
        public String reason;       // Có trong mô tả (Optional)
    }
}