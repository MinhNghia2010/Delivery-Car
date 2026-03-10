package com.example.RobotServerMini.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
@Document(collection = "orders")
public class OrderModel {
    @Id
    private String id;
    private LocalDateTime createdTime;  // Thời gian tạo
    private LocalDateTime completedTime; // Thời gian hoàn thành
    private String fullName;
    private String phone;
    private String address;
    private String compartment; // Ngăn tủ
    private String note;
    private String status;
    private String orderCode;

    // Constructor, Getter, Setter (Bạn tự generate nhé cho ngắn)
    public OrderModel() { this.createdTime = LocalDateTime.now(); }

    // Getter Setter mẫu
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getCompartment() { return compartment; }
    public void setCompartment(String compartment) { this.compartment = compartment; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedTime() { return createdTime; }
    public void setCreatedTime(LocalDateTime createdTime) { this.createdTime = createdTime; }
    public void setCompletedTime(LocalDateTime completedTime) { this.completedTime = completedTime; }

    public LocalDateTime getCompletedTime() {
        return completedTime;
    }

    public String getAddress() {
        return address;
    }

    public String getNote() {
        return note;
    }

    public String getOrderCode() {
        return orderCode;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public void setOrderCode(String orderCode) {
        this.orderCode = orderCode;
    }
}