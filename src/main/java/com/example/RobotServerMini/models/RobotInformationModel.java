package com.example.RobotServerMini.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "robot_register_informations") // Lưu vào collection riêng
public class RobotInformationModel {
    @Id
    private String id; // ID Mongo tự sinh

    private String serialNo; // Đây là khóa chính logic (field: SerialNo)

    // Thông tin mạng
    private String ipAddress;
    private Integer port;
    private String macAddress;

    // Thông tin định danh & Phiên bản
    private String protocolVer;
    private String robotClass;
    private String subClass;
    private String modelType;
    private String softwareVersion;

    private Long lastLoginTime; // Thời điểm cập nhật cuối cùng
    @Field("LastHeartbeatTime") // Map với tên trường trong DB
    private Long lastHeartbeatTime;

    @Field("ConnectionStatus")
    private String connectionStatus;

    private String assignedMapId; // References MapLibraryEntry.id

    // Constructor, Getter, Setter
    public RobotInformationModel() {
    }

    // Getter & Setter (Bạn tự generate đầy đủ nhé, ví dụ mẫu:)
    public String getSerialNo() {
        return serialNo;
    }

    public void setSerialNo(String serialNo) {
        this.serialNo = serialNo;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public Integer getPort() {
        return port;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public String getMacAddress() {
        return macAddress;
    }

    public void setMacAddress(String macAddress) {
        this.macAddress = macAddress;
    }

    public String getProtocolVer() {
        return protocolVer;
    }

    public void setProtocolVer(String protocolVer) {
        this.protocolVer = protocolVer;
    }

    public String getRobotClass() {
        return robotClass;
    }

    public void setRobotClass(String robotClass) {
        this.robotClass = robotClass;
    }

    public String getSubClass() {
        return subClass;
    }

    public void setSubClass(String subClass) {
        this.subClass = subClass;
    }

    public String getModelType() {
        return modelType;
    }

    public void setModelType(String modelType) {
        this.modelType = modelType;
    }

    public String getSoftwareVersion() {
        return softwareVersion;
    }

    public void setSoftwareVersion(String softwareVersion) {
        this.softwareVersion = softwareVersion;
    }

    public Long getLastLoginTime() {
        return lastLoginTime;
    }

    public void setLastLoginTime(Long lastLoginTime) {
        this.lastLoginTime = lastLoginTime;
    }

    public Long getLastHeartbeatTime() {
        return lastHeartbeatTime;
    }

    public void setLastHeartbeatTime(Long lastHeartbeatTime) {
        this.lastHeartbeatTime = lastHeartbeatTime;
    }

    public String getConnectionStatus() {
        return connectionStatus;
    }

    public void setConnectionStatus(String connectionStatus) {
        this.connectionStatus = connectionStatus;
    }

    public String getAssignedMapId() {
        return assignedMapId;
    }

    public void setAssignedMapId(String assignedMapId) {
        this.assignedMapId = assignedMapId;
    }

}
