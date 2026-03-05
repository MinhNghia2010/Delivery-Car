package com.example.RobotServerMini.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "map_library")
public class MapLibraryEntry {
    @Id
    private String id;

    private String mapName; // User-given name to identify this map
    private String token; // UUID token for download
    private String downloadUrl; // /api/download/{token}
    private String fullDownloadUrl; // http://host:port/api/download/{token}
    private long fileSizeBytes; // Size of the ZIP file
    private Instant createdAt; // Upload timestamp

    public MapLibraryEntry() {
    }

    // Getters & Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getMapName() {
        return mapName;
    }

    public void setMapName(String mapName) {
        this.mapName = mapName;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getDownloadUrl() {
        return downloadUrl;
    }

    public void setDownloadUrl(String downloadUrl) {
        this.downloadUrl = downloadUrl;
    }

    public String getFullDownloadUrl() {
        return fullDownloadUrl;
    }

    public void setFullDownloadUrl(String fullDownloadUrl) {
        this.fullDownloadUrl = fullDownloadUrl;
    }

    public long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public void setFileSizeBytes(long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
