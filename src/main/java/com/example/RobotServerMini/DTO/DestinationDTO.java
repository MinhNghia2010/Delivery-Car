package com.example.RobotServerMini.DTO;


public class DestinationDTO {
    private String parkPointName;
    private double x;
    private double y;
    private double z;

    // Getter & Setter
    public String getParkPointName() { return parkPointName; }
    public void setParkPointName(String parkPointName) { this.parkPointName = parkPointName; }
    public double getX() { return x; }
    public void setX(double x) { this.x = x; }
    public double getY() { return y; }
    public void setY(double y) { this.y = y; }
    public double getZ() { return z; }
    public void setZ(double z) { this.z = z; }
}