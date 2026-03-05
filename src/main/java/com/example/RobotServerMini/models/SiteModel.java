package com.example.RobotServerMini.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "sites")
public class SiteModel {
    @Id
    private String siteId; // MongoDB sẽ tự tạo nếu null, hoặc frontend gửi lên khi update

    private String siteName;
    private String siteDetailAddress;
    private String siteRemark;

    private Double longitude;
    private Double latitude;

    // Các thông số hiệu chỉnh bản đồ
    private Double deflectionX;
    private Double deflectionY;
    private Double height;

    private Integer siteStatus; // 0: In service, 1: Maintenance, 2: Down

    // Constructor, Getter, Setter
    public SiteModel() {}

    public String getSiteId() { return siteId; }
    public void setSiteId(String siteId) { this.siteId = siteId; }

    public String getSiteName() { return siteName; }
    public void setSiteName(String siteName) { this.siteName = siteName; }

    public String getSiteDetailAddress() { return siteDetailAddress; }
    public void setSiteDetailAddress(String siteDetailAddress) { this.siteDetailAddress = siteDetailAddress; }

    public String getSiteRemark() { return siteRemark; }
    public void setSiteRemark(String siteRemark) { this.siteRemark = siteRemark; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getDeflectionX() { return deflectionX; }
    public void setDeflectionX(Double deflectionX) { this.deflectionX = deflectionX; }

    public Double getDeflectionY() { return deflectionY; }
    public void setDeflectionY(Double deflectionY) { this.deflectionY = deflectionY; }

    public Double getHeight() { return height; }
    public void setHeight(Double height) { this.height = height; }

    public Integer getSiteStatus() { return siteStatus; }
    public void setSiteStatus(Integer siteStatus) { this.siteStatus = siteStatus; }
}
