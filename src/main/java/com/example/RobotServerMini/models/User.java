package com.example.RobotServerMini.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "Account") // Đảm bảo tên collection trong MongoDB là 'users'
public class User {
    @Id
    private String id;
    private String username;
    private String password; // Ánh xạ chuỗi bcrypt
    private String role;

    // Getters and Setters
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}