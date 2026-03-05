package com.example.RobotServerMini.DTO;

import com.fasterxml.jackson.annotation.JsonProperty;

public class RobotResumeTaskDTO {

    // --- HEADER ---
    @JsonProperty("Action")
    public String action = "resumeTask";

    @JsonProperty("Body")
    public ResumeBody body;

    @JsonProperty("Device")
    public String device;

    @JsonProperty("ID")
    public String id;

    @JsonProperty("Time")
    public long time;

    // --- BODY ---
    public static class ResumeBody {
        @JsonProperty("TaskId")
        public String taskId;

        @JsonProperty("BizTaskId")
        public String bizTaskId;
    }
}
