package com.example.RobotServerMini.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "park_points")
public class ParkPointModel {
    @Id
    private String parkPointId;

    private String dockName;
    private String dockShowName;
    private Double longitude;
    private Double latitude;
    private Double azimuth; // Góc hướng (Heading)

    private Integer regionId; // Tầng (Floor)
    private Integer parkPointNum; // Station ID
    private Double parkRange; // Khoảng cách lệch cho phép

    private Integer areaId;
    private String siteId; // Liên kết với Site

    // 0: Yes, 1: No
    private Integer isCharge;
    private Integer isLoad;

    // Constructor, Getter, Setter
    public ParkPointModel() {}

    // Getters & Setters
    public String getParkPointId() { return parkPointId; }
    public void setParkPointId(String parkPointId) { this.parkPointId = parkPointId; }

    public String getDockName() { return dockName; }
    public void setDockName(String dockName) { this.dockName = dockName; }

    public String getDockShowName() { return dockShowName; }
    public void setDockShowName(String dockShowName) { this.dockShowName = dockShowName; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getAzimuth() { return azimuth; }
    public void setAzimuth(Double azimuth) { this.azimuth = azimuth; }

    public Integer getRegionId() { return regionId; }
    public void setRegionId(Integer regionId) { this.regionId = regionId; }

    public Integer getParkPointNum() { return parkPointNum; }
    public void setParkPointNum(Integer parkPointNum) { this.parkPointNum = parkPointNum; }

    public Double getParkRange() { return parkRange; }
    public void setParkRange(Double parkRange) { this.parkRange = parkRange; }

    public Integer getAreaId() { return areaId; }
    public void setAreaId(Integer areaId) { this.areaId = areaId; }

    public String getSiteId() { return siteId; }
    public void setSiteId(String siteId) { this.siteId = siteId; }

    public Integer getIsCharge() { return isCharge; }
    public void setIsCharge(Integer isCharge) { this.isCharge = isCharge; }

    public Integer getIsLoad() { return isLoad; }
    public void setIsLoad(Integer isLoad) { this.isLoad = isLoad; }
}
