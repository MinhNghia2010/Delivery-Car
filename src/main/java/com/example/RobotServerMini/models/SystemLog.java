package com.example.RobotServerMini.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

@Document(collection = "SystemLogs")
public class SystemLog {

    @Id
    private String id;

    private String actorId;      // ID người dùng (VD: shipper_01)
    private String actorName;    // Tên hiển thị (VD: Nguyễn Văn A)
    private String action;       // Hành động (CREATE_ORDER, CANCEL, ...)
    private String targetEntity; // Đối tượng (ORDER, ROBOT)
    private String targetId;     // Mã đối tượng (Mã đơn hàng)
    private String details;      // Chi tiết (VD: Tạo đơn hàng từ App Mobile)

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime timestamp;

    public SystemLog() {}

    public SystemLog(String actorId, String actorName, String action, String targetEntity, String targetId, String details) {
        this.actorId = actorId;
        this.actorName = actorName;
        this.action = action;
        this.targetEntity = targetEntity;
        this.targetId = targetId;
        this.details = details;
        this.timestamp = LocalDateTime.now();
    }

    // --- GETTER & SETTER ---
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getActorId() { return actorId; }
    public void setActorId(String actorId) { this.actorId = actorId; }
    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getTargetEntity() { return targetEntity; }
    public void setTargetEntity(String targetEntity) { this.targetEntity = targetEntity; }
    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}