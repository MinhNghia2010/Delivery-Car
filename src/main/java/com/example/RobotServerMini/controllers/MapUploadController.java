package com.example.RobotServerMini.controllers;

import com.example.RobotServerMini.models.MapLibraryEntry;
import com.example.RobotServerMini.models.RobotInformationModel;
import com.example.RobotServerMini.repository.MapLibraryRepository;
import com.example.RobotServerMini.repository.RobotInformationRepository;
import com.example.RobotServerMini.robotservice.MapDownloadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/map-upload")
@CrossOrigin(origins = "*")
public class MapUploadController {

    @Autowired
    private MapDownloadService mapDownloadService;

    @Autowired
    private MapLibraryRepository mapLibraryRepository;

    @Autowired
    private RobotInformationRepository robotInfoRepo;

    // =============================================
    // 1. UPLOAD MAP FILES (create ZIP + save to library)
    // =============================================
    @PostMapping("/upload")
    public Map<String, Object> uploadMapFiles(
            @RequestParam("mapFile") MultipartFile mapFile,
            @RequestParam("topoFile") MultipartFile topoFile,
            @RequestParam("configFile") MultipartFile configFile,
            @RequestParam("mapName") String mapName) {

        Map<String, Object> response = new HashMap<>();

        try {
            // Validate file extensions
            if (!isValidExtension(mapFile.getOriginalFilename(), ".png")) {
                response.put("success", false);
                response.put("error", "mapFile must be a .png file");
                return response;
            }
            if (!isValidExtension(topoFile.getOriginalFilename(), ".json")) {
                response.put("success", false);
                response.put("error", "topoFile must be a .json file");
                return response;
            }
            if (!isValidYamlExtension(configFile.getOriginalFilename())) {
                response.put("success", false);
                response.put("error", "configFile must be a .yaml or .yml file");
                return response;
            }

            // Validate total size (max 50MB)
            long totalSize = mapFile.getSize() + topoFile.getSize() + configFile.getSize();
            if (totalSize > 50 * 1024 * 1024) {
                response.put("success", false);
                response.put("error", "Total file size exceeds 50MB limit");
                return response;
            }

            // Validate map name is not empty
            if (mapName == null || mapName.trim().isEmpty()) {
                response.put("success", false);
                response.put("error", "mapName is required");
                return response;
            }

            // Create ZIP file
            Path zipPath = createZipFile(mapFile, topoFile, configFile);
            long zipSize = Files.size(zipPath);

            // Register download token
            String token = mapDownloadService.registerDownload(zipPath);

            // Save to map library
            MapLibraryEntry entry = new MapLibraryEntry();
            entry.setMapName(mapName.trim());
            entry.setToken(token);
            entry.setDownloadUrl("/api/download/" + token);
            entry.setFullDownloadUrl("http://localhost:8081/api/download/" + token);
            entry.setFileSizeBytes(zipSize);
            entry.setCreatedAt(Instant.now());
            mapLibraryRepository.save(entry);

            System.out.println("💾 Map '" + mapName + "' saved to library with token: " + token);

            response.put("success", true);
            response.put("mapId", entry.getId());
            response.put("mapName", mapName);
            response.put("token", token);
            response.put("downloadUrl", "/api/download/" + token);
            response.put("fullDownloadUrl", entry.getFullDownloadUrl());

        } catch (IOException e) {
            response.put("success", false);
            response.put("error", "Failed to process upload: " + e.getMessage());
        }

        return response;
    }

    // =============================================
    // 2. GET ALL MAPS FROM LIBRARY
    // =============================================
    @GetMapping("/library")
    public List<MapLibraryEntry> getAllMaps() {
        return mapLibraryRepository.findAll();
    }

    // =============================================
    // 3. DELETE A MAP FROM LIBRARY
    // =============================================
    @DeleteMapping("/library/{id}")
    public Map<String, Object> deleteMap(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        Optional<MapLibraryEntry> entryOpt = mapLibraryRepository.findById(id);
        if (entryOpt.isPresent()) {
            mapLibraryRepository.deleteById(id);
            System.out.println("🗑️ Deleted map from library: " + entryOpt.get().getMapName());
            response.put("success", true);
            response.put("message", "Map deleted");
        } else {
            response.put("success", false);
            response.put("error", "Map not found");
        }
        return response;
    }

    // =============================================
    // 4. ASSIGN A MAP TO A ROBOT
    // =============================================
    @PostMapping("/assign")
    public Map<String, Object> assignMapToRobot(@RequestBody Map<String, String> payload) {
        Map<String, Object> response = new HashMap<>();

        String vehicleId = payload.get("vehicleId");
        String mapId = payload.get("mapId");

        if (vehicleId == null || mapId == null) {
            response.put("success", false);
            response.put("error", "vehicleId and mapId are required");
            return response;
        }

        // Check robot exists and is approved
        Optional<RobotInformationModel> robotOpt = robotInfoRepo.findBySerialNo(vehicleId);
        if (robotOpt.isEmpty()) {
            response.put("success", false);
            response.put("error", "Robot not found: " + vehicleId);
            return response;
        }

        RobotInformationModel robot = robotOpt.get();
        if (!"APPROVED".equals(robot.getConnectionStatus())) {
            response.put("success", false);
            response.put("error", "Robot is not approved. Current status: " + robot.getConnectionStatus());
            return response;
        }

        // Check map exists
        Optional<MapLibraryEntry> mapOpt = mapLibraryRepository.findById(mapId);
        if (mapOpt.isEmpty()) {
            response.put("success", false);
            response.put("error", "Map not found in library: " + mapId);
            return response;
        }

        // Assign map to robot
        robot.setAssignedMapId(mapId);
        robotInfoRepo.save(robot);

        MapLibraryEntry map = mapOpt.get();
        System.out.println("🗺️ Assigned map '" + map.getMapName() + "' to robot: " + vehicleId);

        response.put("success", true);
        response.put("message", "Map '" + map.getMapName() + "' assigned to robot " + vehicleId);
        response.put("mapName", map.getMapName());
        response.put("downloadUrl", map.getFullDownloadUrl());
        return response;
    }

    // =============================================
    // 5. GET ASSIGNED MAP FOR A ROBOT
    // =============================================
    @GetMapping("/robot/{vehicleId}/map")
    public Map<String, Object> getAssignedMap(@PathVariable String vehicleId) {
        Map<String, Object> response = new HashMap<>();

        Optional<RobotInformationModel> robotOpt = robotInfoRepo.findBySerialNo(vehicleId);
        if (robotOpt.isEmpty()) {
            response.put("found", false);
            response.put("error", "Robot not found");
            return response;
        }

        RobotInformationModel robot = robotOpt.get();
        String mapId = robot.getAssignedMapId();

        if (mapId == null || mapId.isEmpty()) {
            response.put("found", false);
            response.put("message", "No map assigned to this robot");
            return response;
        }

        Optional<MapLibraryEntry> mapOpt = mapLibraryRepository.findById(mapId);
        if (mapOpt.isEmpty()) {
            response.put("found", false);
            response.put("message", "Assigned map no longer exists in library");
            return response;
        }

        MapLibraryEntry map = mapOpt.get();
        response.put("found", true);
        response.put("mapId", map.getId());
        response.put("mapName", map.getMapName());
        response.put("downloadUrl", map.getFullDownloadUrl());
        response.put("createdAt", map.getCreatedAt().toString());
        return response;
    }

    // =============================================
    // Helper methods
    // =============================================

    private Path createZipFile(MultipartFile mapFile,
            MultipartFile topoFile,
            MultipartFile configFile) throws IOException {
        Path zipPath = Files.createTempFile("map_upload_", ".zip");

        try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipPath.toFile()))) {
            // Use stripPath to keep only the base filename (no folder nesting)
            addToZip(zos, stripPath(mapFile.getOriginalFilename(), "map.png"), mapFile.getBytes());
            addToZip(zos, stripPath(topoFile.getOriginalFilename(), "topo.json"), topoFile.getBytes());
            addToZip(zos, stripPath(configFile.getOriginalFilename(), "config.yaml"), configFile.getBytes());
        }

        System.out.println("📁 Created zip at: " + zipPath + " (" + Files.size(zipPath) + " bytes)");
        return zipPath;
    }

    private void addToZip(ZipOutputStream zos, String entryName, byte[] data) throws IOException {
        ZipEntry entry = new ZipEntry(entryName);
        zos.putNextEntry(entry);
        zos.write(data);
        zos.closeEntry();
    }

    /** Strip any folder path prefix, keeping only the base filename */
    private String stripPath(String fullName, String fallback) {
        if (fullName == null || fullName.isEmpty())
            return fallback;
        int lastSlash = Math.max(fullName.lastIndexOf('/'), fullName.lastIndexOf('\\'));
        return lastSlash >= 0 ? fullName.substring(lastSlash + 1) : fullName;
    }

    private boolean isValidExtension(String filename, String ext) {
        return filename != null && filename.toLowerCase().endsWith(ext);
    }

    private boolean isValidYamlExtension(String filename) {
        if (filename == null)
            return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".yaml") || lower.endsWith(".yml");
    }
}
