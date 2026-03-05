package com.example.RobotServerMini.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "robots")
public class RobotModel {
    @Id
    private String robotId;

    private String robotObjectId; // Mã phần cứng (MAC/UUID)
    private String robotName;
    private String robotModelName;
    private Integer robotType; // 0: Delivery, 1: Patrol...

    private Long serviceStartTime;
    private Long serviceEndTime;

    private String remark;
    private String status; // "IN_SERVICE", "OFFLINE"...
    private String siteId; // Liên kết với Site

    // Constructor
    public RobotModel() {}

    // Getters & Setters
    public String getRobotId() { return robotId; }
    public void setRobotId(String robotId) { this.robotId = robotId; }

    public String getRobotObjectId() { return robotObjectId; }
    public void setRobotObjectId(String robotObjectId) { this.robotObjectId = robotObjectId; }

    public String getRobotName() { return robotName; }
    public void setRobotName(String robotName) { this.robotName = robotName; }

    public String getRobotModelName() { return robotModelName; }
    public void setRobotModelName(String robotModelName) { this.robotModelName = robotModelName; }

    public Integer getRobotType() { return robotType; }
    public void setRobotType(Integer robotType) { this.robotType = robotType; }

    public Long getServiceStartTime() { return serviceStartTime; }
    public void setServiceStartTime(Long serviceStartTime) { this.serviceStartTime = serviceStartTime; }

    public Long getServiceEndTime() { return serviceEndTime; }
    public void setServiceEndTime(Long serviceEndTime) { this.serviceEndTime = serviceEndTime; }

    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSiteId() { return siteId; }
    public void setSiteId(String siteId) { this.siteId = siteId; }
}