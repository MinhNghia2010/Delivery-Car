package com.example.RobotServerMini.DTO;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

public class RobotStatusState {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RobotDetail {
        @JsonProperty("robotName")
        public String robotName;

        @JsonProperty("robotModelName")
        public String robotModelName;

        @JsonProperty("siteId")
        public String siteId;

        // Bắt cả trường hợp hãng gửi "State" hoặc có dấu cách "State "
        @JsonAlias({"State", "State "})
        public String state;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StatusDetail {
        public Double longitude;
        public Double latitude;

        @JsonProperty("x")
        public Double x;

        @JsonProperty("y")
        public Double y;

        public Double altitude;
        public Double steerAngle;
        public Double azimuth;
        public Integer shift;
        public Double throttle;
        public Double brake;
        public Double speed;
        public Integer regionId;
        public String locationState;
        public String driveMode;

        @JsonProperty("State")
        public String state;

        public Long statusDateTime;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FuelDetail {
        public Double residualFuel;
        public Double voltage;
        public Double ammeter;
        public Double temperature;
        public Double endurance;
        public Double odometer;
        public Integer isCharging; // Giữ lại đề phòng lỗi UI
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ExecutionDetail {
        public String executeTaskId;
        public String robotTaskId;
        public String parkPointId;
        public Integer status;
    }
}