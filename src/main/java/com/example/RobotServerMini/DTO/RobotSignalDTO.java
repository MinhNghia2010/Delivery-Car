package com.example.RobotServerMini.DTO;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;


// Import các class con từ file RobotStatusState
import com.example.RobotServerMini.DTO.RobotStatusState.*;
@JsonIgnoreProperties(ignoreUnknown = true)
public class RobotSignalDTO {

    @JsonProperty("Report")
    public String report;

    @JsonAlias({"Device", "device"})
    public String device;

    @JsonAlias({"ID", "id"})
    public String id;

    @JsonProperty("Body")
    @JsonAlias("body")
    public Map<String, Object> body;

    @JsonAlias({"Time", "time"})
    public Long time;


    // --- Dùng cho bản tin Login Result & RobotInfo ---
    public Integer code;
    public String desc;
    public DataPayload data;

    @JsonIgnoreProperties(ignoreUnknown = true)
    // Class con chứa dữ liệu nested
    public static class DataPayload {
        // 1. Phần Login (Cũ)
        public Boolean result;
        @JsonProperty("TaskId")
        public String taskId;
        public Params params;
        public RobotDetail robot;
        public ExecutionDetail execution;
        public StatusDetail statusDetail;
        public FuelDetail fuelDetail;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Params {
        @JsonProperty("Device")
        public DeviceDetail device;

        @JsonProperty("FailedList")
        public List<Map<String, Object>> failedList;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TaskStateBody {
        @JsonProperty("States")
        public List<TaskStateDetail> states;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TaskStateDetail {
        @JsonProperty("TaskID")
        public String taskId;       // ID task chính

        @JsonProperty("State")
        public String state;        // Running, Paused, Finished...

        @JsonProperty("SliceID")
        public String sliceId;      // ID đoạn đường nhỏ (Subtask)

        @JsonProperty("SliceState")
        public String sliceState;   // Trạng thái đoạn đường

        @JsonProperty("ErrorNumber")
        public Integer errorNumber; // 0 = OK

        @JsonProperty("ReasonDesc")
        public String reasonDesc;   // Mô tả lỗi
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DeviceDetail {
        @JsonProperty("Ip")
        public String ip;
        @JsonProperty("Port")
        public Integer port;
        @JsonProperty("Mac")
        public String mac;
        @JsonProperty("Protocal")
        public String protocol;
        @JsonProperty("SerialNo")
        public String serialNo;
        @JsonProperty("Class")
        public String rClass;
        @JsonProperty("SubClass")
        public String subClass;
        @JsonProperty("Type")
        public String type;
        @JsonProperty("Version")
        public String version;
    }
}