# 📚 Tài liệu: Hệ thống Upload Map và Tạo Download Link

## 🎯 Tổng quan

Hệ thống này cho phép upload bản đồ (map) lên server và tạo link download để phân phối cho các robot. Sử dụng cơ chế **One-Time Download Link** với token UUID để đảm bảo bảo mật và quản lý tập trung.

---

## 🔄 Luồng hoạt động tổng quan

```
┌──────────────┐
│   Frontend   │ 1. Chọn thư mục map (3 files)
│   (React)    │────────────────────────┐
└──────────────┘                        │
                                        ↓
                              ┌─────────────────────┐
                              │  2. POST /upload    │
                              │  MapUploadController│
                              └──────────┬──────────┘
                                        │
                ┌───────────────────────┼───────────────────────┐
                │                       │                       │
                ↓                       ↓                       ↓
        ┌──────────────┐      ┌─────────────────┐    ┌──────────────┐
        │ Validate     │      │ Nén thành ZIP   │    │ Tạo Token    │
        │ - .png       │      │ - map.png       │    │ (UUID)       │
        │ - .json      │      │ - topo.json     │    │              │
        │ - .yaml      │      │ - config.yaml   │    │              │
        │ - Max 50MB   │      │                 │    │              │
        └──────────────┘      └─────────────────┘    └──────┬───────┘
                                        │                    │
                                        ↓                    ↓
                              ┌─────────────────────────────────┐
                              │  MapDownloadService             │
                              │  ├─ ConcurrentHashMap<Token...> │
                              │  ├─ /tmp/map_upload_*.zip       │
                              │  └─ TTL: 30 phút                │
                              └──────────────┬──────────────────┘
                                            │
                                            ↓
                              ┌─────────────────────────┐
                              │  MongoDB                │
                              │  ├─ MapDownloadLink     │
                              │  └─ IssueMapsRecord     │
                              └──────────────┬──────────┘
                                            │
                ┌───────────────────────────┴───────────────────────┐
                │                                                   │
                ↓                                                   ↓
    ┌──────────────────────┐                          ┌──────────────────────┐
    │ 3. Response Token    │                          │ 4. Issue Map         │
    │ Frontend hiển thị    │                          │ (Manual)             │
    │ danh sách robot      │                          │                      │
    └──────────────────────┘                          └──────────┬───────────┘
                                                                 │
                                                                 ↓
                                                    ┌─────────────────────────┐
                                                    │ 5. Send TCP Packet      │
                                                    │ Action: "issueMaps"     │
                                                    │ URL, MD5, Size          │
                                                    └──────────┬──────────────┘
                                                              │
                                                              ↓
                                                    ┌──────────────────────┐
                                                    │ 6. Robot Download    │
                                                    │ GET /api/download/   │
                                                    │     {token}          │
                                                    └──────────────────────┘
```

---

## 📁 Cấu trúc File

### **Frontend (React)**

| File | Chức năng |
|------|-----------|
| `src/main/UI/src/components/PageMap.js` | UI chọn thư mục map, upload, issue map |
| `src/main/UI/src/api.js` | Định nghĩa các API endpoints |

### **Backend (Java Spring Boot)**

| File | Chức năng |
|------|-----------|
| `controllers/MapUploadController.java` | REST API upload map, issue map |
| `controllers/OneTimeDownloadController.java` | REST API download file ZIP |
| `robotservice/MapDownloadService.java` | Quản lý token và file ZIP |
| `robotservice/MapIssueService.java` | Gửi lệnh issueMaps xuống robot |
| `models/MapDownloadLink.java` | Model MongoDB lưu link download |
| `models/IssueMapsRecord.java` | Model MongoDB lưu lịch sử issue map |
| `scheduler/DownloadCleanupScheduler.java` | Tự động dọn dẹp file hết hạn |

---

## 🔧 Chi tiết từng bước

### **Bước 1: Upload Map Files từ Frontend**

#### **Frontend Code (PageMap.js)**

```javascript
// Người dùng chọn thư mục chứa map
const handleDirectorySelect = (e) => {
  const files = Array.from(e.target.files);
  
  // Tìm 3 file bắt buộc
  const yamlFile = files.find(f => f.name.endsWith(".yaml") || f.name.endsWith(".yml"));
  const jsonFile = files.find(f => f.name.endsWith(".json"));
  const pngFile = files.find(f => f.name.endsWith(".png"));
  
  if (pngFile && jsonFile && yamlFile) {
    setSelectedFilesForUpload({
      mapFile: pngFile,
      topoFile: jsonFile,
      configFile: yamlFile,
    });
  }
};

// Upload 3 file lên server
const uploadMapFilesToBackend = async (files) => {
  const formData = new FormData();
  formData.append("mapFile", files.mapFile);      // map.png
  formData.append("topoFile", files.topoFile);    // topo.json
  formData.append("configFile", files.configFile); // config.yaml
  
  const response = await fetch("http://localhost:8081/api/map-upload/upload", {
    method: "POST",
    body: formData,
  });
  
  const result = await response.json();
  
  if (result.success) {
    setMapUploadToken(result.token); // Lưu token để issue sau
    fetchConnectedRobots(); // Tải danh sách robot
  }
};
```

#### **HTML Input**

```html
<!-- Chọn thư mục thay vì file đơn lẻ -->
<input 
  type="file" 
  webkitdirectory="" 
  directory="" 
  onChange={handleDirectorySelect} 
/>
```

---

### **Bước 2: Server xử lý Upload**

#### **REST API Endpoint**

```
POST /api/map-upload/upload
Content-Type: multipart/form-data

Parameters:
  - mapFile: File (.png)
  - topoFile: File (.json)
  - configFile: File (.yaml hoặc .yml)
```

#### **MapUploadController.java**

```java
@PostMapping("/upload")
public Map<String, Object> uploadMapFiles(
        @RequestParam("mapFile") MultipartFile mapFile,
        @RequestParam("topoFile") MultipartFile topoFile,
        @RequestParam("configFile") MultipartFile configFile) {
    
    Map<String, Object> response = new HashMap<>();
    
    try {
        // 1. Validate file extensions
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
        
        // 2. Validate tổng kích thước (Max 50MB)
        long totalSize = mapFile.getSize() + topoFile.getSize() + configFile.getSize();
        if (totalSize > 50 * 1024 * 1024) {
            response.put("success", false);
            response.put("error", "Total file size exceeds 50MB limit");
            return response;
        }
        
        // 3. Tạo file ZIP
        Path zipPath = createZipFile(mapFile, topoFile, configFile);
        
        // 4. Đăng ký token download
        String token = mapDownloadService.registerDownload(zipPath);
        
        // 5. Lưu vào MongoDB
        linkRepository.deleteAll(); // Xóa link cũ
        MapDownloadLink link = new MapDownloadLink();
        link.setToken(token);
        link.setDownloadUrl("/api/download/" + token);
        link.setFullDownloadUrl("http://localhost:8081/api/download/" + token);
        link.setCreatedAt(Instant.now());
        linkRepository.save(link);
        
        // 6. Xóa lịch sử issue cũ (cho phép gửi lại cho tất cả robot)
        recordRepository.deleteAll();
        
        // 7. Response
        response.put("success", true);
        response.put("token", token);
        response.put("downloadUrl", "/api/download/" + token);
        
        Set<String> connectedDevices = mapIssueService.getConnectedDeviceIds();
        response.put("connectedRobots", connectedDevices.size());
        response.put("connectedDeviceIds", connectedDevices);
        
    } catch (IOException e) {
        response.put("success", false);
        response.put("error", "Failed to process upload: " + e.getMessage());
    }
    
    return response;
}
```

#### **Tạo File ZIP**

```java
private Path createZipFile(MultipartFile mapFile, 
                          MultipartFile topoFile, 
                          MultipartFile configFile) throws IOException {
    
    // Tạo file tạm trong thư mục temp của hệ thống
    Path zipPath = Files.createTempFile("map_upload_", ".zip");
    
    try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipPath.toFile()))) {
        // Thêm 3 file vào ZIP
        addToZip(zos, "map.png", mapFile.getBytes());
        addToZip(zos, "topo.json", topoFile.getBytes());
        addToZip(zos, getOriginalFilename(configFile), configFile.getBytes());
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
```

---

### **Bước 3: Tạo và Quản lý Token**

#### **MapDownloadService.java**

```java
@Service
public class MapDownloadService {
    
    // Lưu trữ token trong bộ nhớ (thread-safe)
    private final ConcurrentHashMap<String, DownloadEntry> tokenStore = new ConcurrentHashMap<>();
    
    // Thời gian sống: 30 phút
    private static final long TTL_SECONDS = 30 * 60;
    
    /**
     * Đăng ký file ZIP mới, trả về token UUID
     */
    public String registerDownload(Path zipPath) {
        String token = UUID.randomUUID().toString();
        tokenStore.put(token, new DownloadEntry(zipPath));
        
        System.out.println("📦 Registered download token: " + token + " → " + zipPath);
        return token;
    }
    
    /**
     * Lấy đường dẫn file từ token (KHÔNG xóa token)
     */
    public Path getFilePath(String token) {
        DownloadEntry entry = tokenStore.get(token);
        if (entry == null) {
            return null;
        }
        return entry.getFilePath();
    }
    
    /**
     * Kiểm tra token còn hợp lệ không
     */
    public boolean isTokenValid(String token) {
        DownloadEntry entry = tokenStore.get(token);
        if (entry == null) return false;
        if (entry.isConsumed()) return false;
        
        long age = Instant.now().getEpochSecond() - entry.getCreatedAt().getEpochSecond();
        return age < TTL_SECONDS;
    }
    
    /**
     * Dọn dẹp các token hết hạn (gọi bởi Scheduler)
     */
    public void cleanupExpired() {
        Instant now = Instant.now();
        
        for (Map.Entry<String, DownloadEntry> entry : tokenStore.entrySet()) {
            String token = entry.getKey();
            DownloadEntry dl = entry.getValue();
            
            long ageSeconds = now.getEpochSecond() - dl.getCreatedAt().getEpochSecond();
            
            if (ageSeconds > TTL_SECONDS || dl.isConsumed()) {
                // Xóa file ZIP trên disk
                try {
                    Files.deleteIfExists(dl.getFilePath());
                    System.out.println("🗑️ Cleaned up expired zip: " + dl.getFilePath());
                } catch (IOException e) {
                    System.err.println("⚠️ Failed to delete zip: " + e.getMessage());
                }
                
                // Xóa token
                tokenStore.remove(token);
            }
        }
    }
}
```

#### **DownloadEntry Class**

```java
public static class DownloadEntry {
    private final Path filePath;
    private final Instant createdAt;
    private final AtomicBoolean consumed;
    
    public DownloadEntry(Path filePath) {
        this.filePath = filePath;
        this.createdAt = Instant.now();
        this.consumed = new AtomicBoolean(false);
    }
    
    public Path getFilePath() {
        return filePath;
    }
    
    public Instant getCreatedAt() {
        return createdAt;
    }
    
    public boolean tryConsume() {
        return consumed.compareAndSet(false, true); // Thread-safe
    }
    
    public boolean isConsumed() {
        return consumed.get();
    }
}
```

---

### **Bước 4: Lưu vào MongoDB**

#### **Model: MapDownloadLink**

```java
@Document(collection = "map_download_links")
public class MapDownloadLink {
    @Id
    private String id;
    
    private String token;              // UUID token
    private String downloadUrl;        // /api/download/{token}
    private String fullDownloadUrl;    // http://localhost:8081/api/download/{token}
    private Instant createdAt;         // Thời điểm tạo
    private boolean downloaded;        // Đã được tải chưa
    
    // Getters & Setters...
}
```

#### **Repository**

```java
public interface MapDownloadLinkRepository extends MongoRepository<MapDownloadLink, String> {
    MapDownloadLink findTopByOrderByCreatedAtDesc(); // Lấy link mới nhất
    MapDownloadLink findByToken(String token);
}
```

---

### **Bước 5: Issue Map cho Robot (Thủ công)**

#### **REST API Endpoint**

```
POST /api/map-upload/issue-to-robot
Content-Type: application/json

Body:
{
  "vehicleId": "CB20608BAK00001",
  "mapName": "floor1",
  "version": "1.0",
  "message": ""
}
```

#### **MapIssueService.java**

```java
public Map<String, Object> issueMapToRobot(String vehicleId, 
                                          String mapName, 
                                          String version, 
                                          String message) {
    Map<String, Object> response = new HashMap<>();
    
    try {
        // 1. Lấy download link mới nhất
        MapDownloadLink latestLink = linkRepository.findTopByOrderByCreatedAtDesc();
        if (latestLink == null) {
            response.put("status", "ERROR");
            response.put("message", "No map uploaded yet. Upload a map first.");
            return response;
        }
        
        String token = latestLink.getToken();
        String downloadUrl = latestLink.getFullDownloadUrl();
        
        // 2. Kiểm tra robot đã nhận map này chưa (chống gửi trùng)
        boolean alreadyIssued = recordRepository.existsByVehicleIdAndMapTokenAndStatus(
            vehicleId, token, "SENT"
        );
        
        if (alreadyIssued) {
            response.put("status", "ALREADY_ISSUED");
            response.put("message", "Map has already been issued to robot " + vehicleId);
            return response;
        }
        
        // 3. Tính MD5 của file ZIP
        Path zipPath = mapDownloadService.getFilePath(token);
        String md5 = calculateMD5(zipPath);
        long fileSize = Files.size(zipPath);
        
        // 4. Xây dựng packet theo giao thức Huaray
        Map<String, Object> packet = new LinkedHashMap<>();
        packet.put("Action", "issueMaps");
        
        Map<String, Object> body = new HashMap<>();
        List<Map<String, Object>> mapsList = new ArrayList<>();
        
        Map<String, Object> mapEntry = new LinkedHashMap<>();
        mapEntry.put("Md5", md5);
        mapEntry.put("Name", truncate(mapName, 31));
        mapEntry.put("Version", truncate(version, 7));
        mapEntry.put("URL", truncate(downloadUrl, 127));
        mapEntry.put("Size", (int) fileSize);
        if (message != null && !message.isEmpty()) {
            mapEntry.put("Message", truncate(message, 255));
        }
        
        mapsList.add(mapEntry);
        body.put("Maps", mapsList);
        packet.put("Body", body);
        
        packet.put("Device", vehicleId);
        String cmdId = "CMD_issueMaps_" + System.currentTimeMillis();
        packet.put("ID", cmdId);
        packet.put("Time", System.currentTimeMillis() * 1000); // Microseconds
        
        // 5. Gửi xuống robot qua TCP
        boolean sent = protocolService.sendToRobot(vehicleId, packet);
        
        // 6. Lưu lịch sử vào MongoDB
        IssueMapsRecord record = new IssueMapsRecord();
        record.setVehicleId(vehicleId);
        record.setCommandId(cmdId);
        record.setMapToken(token);
        record.setMapName(mapName);
        record.setVersion(version);
        record.setDownloadUrl(downloadUrl);
        record.setMd5(md5);
        record.setFileSize(fileSize);
        record.setSentAt(Instant.now());
        record.setStatus(sent ? "SENT" : "FAILED");
        recordRepository.save(record);
        
        response.put("status", sent ? "SENT" : "FAILED");
        response.put("message", sent ? "issueMaps command sent to " + vehicleId : "Failed to send");
        response.put("downloadUrl", downloadUrl);
        response.put("md5", md5);
        
    } catch (Exception e) {
        response.put("status", "ERROR");
        response.put("message", e.getMessage());
    }
    
    return response;
}
```

#### **Giao thức TCP Packet**

```json
{
  "Action": "issueMaps",
  "Device": "CB20608BAK00001",
  "ID": "CMD_issueMaps_1234567890",
  "Time": 1234567890000000,
  "Body": {
    "Maps": [
      {
        "Md5": "a1b2c3d4e5f67890abcdef1234567890",
        "Name": "floor1",
        "Version": "1.0",
        "URL": "http://localhost:8081/api/download/uuid-token-here",
        "Size": 1024000,
        "Message": "Updated map for floor 1"
      }
    ]
  }
}
```

---

### **Bước 6: Robot Download Map**

#### **REST API Endpoint**

```
GET /api/download/{token}
```

#### **OneTimeDownloadController.java**

```java
@GetMapping("/{token}")
public ResponseEntity<StreamingResponseBody> downloadZip(@PathVariable String token) {
    
    // 1. Kiểm tra token có hợp lệ không
    Path zipPath = mapDownloadService.getFilePath(token);
    
    if (zipPath == null) {
        System.out.println("⛔ Token invalid: " + token);
        return ResponseEntity.status(HttpStatus.GONE)
            .body(outputStream -> outputStream.write(
                "{\"error\":\"Download link expired\"}".getBytes()
            ));
    }
    
    // 2. Kiểm tra file còn tồn tại
    if (!Files.exists(zipPath)) {
        System.err.println("⚠️ File not found: " + zipPath);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(outputStream -> outputStream.write(
                "{\"error\":\"File not found on server\"}".getBytes()
            ));
    }
    
    long fileSize = Files.size(zipPath);
    System.out.println("📥 Serving download: token=" + token + ", size=" + fileSize);
    
    // 3. Đánh dấu đã download trong MongoDB
    MapDownloadLink link = linkRepository.findByToken(token);
    if (link != null && !link.isDownloaded()) {
        link.setDownloaded(true);
        linkRepository.save(link);
    }
    
    // 4. Stream file về client
    StreamingResponseBody responseBody = outputStream -> {
        try (InputStream inputStream = Files.newInputStream(zipPath)) {
            byte[] buffer = new byte[8192]; // Chunk 8KB
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
            outputStream.flush();
        }
    };
    
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
    headers.setContentDisposition(
        ContentDisposition.builder("attachment")
            .filename("map_package.zip")
            .build()
    );
    headers.setContentLength(fileSize);
    
    return ResponseEntity.ok()
        .headers(headers)
        .body(responseBody);
}
```

#### **Robot Processing (Python - fake_robot.py)**

```python
def download_map(self, url: str, md5_expected: str = ""):
    """Tải file ZIP từ URL do server cung cấp"""
    
    filename = os.path.join(DOWNLOAD_DIR, "map_package.zip")
    
    # Download file
    response = requests.get(url, stream=True, timeout=60)
    response.raise_for_status()
    
    # Lưu file
    with open(filename, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    # Kiểm tra MD5
    if md5_expected:
        actual_md5 = calculate_md5(filename)
        if actual_md5 != md5_expected:
            raise Exception("MD5 checksum mismatch")
    
    # Giải nén
    with zipfile.ZipFile(filename, 'r') as zip_ref:
        zip_ref.extractall(DOWNLOAD_DIR)
    
    print(f"✅ Map downloaded and extracted: {DOWNLOAD_DIR}")
    
    # Báo lại server
    self.send_event("RobotMapUpdate", {
        "Status": "SUCCESS",
        "Message": "Map installed successfully"
    })
```

---

## 🔐 Bảo mật và Quản lý

### **1. Time-To-Live (TTL)**

- Mỗi token có thời gian sống **30 phút**
- Sau 30 phút, file ZIP tự động bị xóa
- Scheduler chạy mỗi 5 phút để dọn dẹp

```java
@Scheduled(fixedRate = 5 * 60 * 1000) // 5 phút
public void cleanupExpiredDownloads() {
    mapDownloadService.cleanupExpired();
}
```

### **2. Thread-Safe Operations**

- Sử dụng `ConcurrentHashMap` để lưu token
- Sử dụng `AtomicBoolean` cho trạng thái consumed
- Đảm bảo an toàn trong môi trường đa luồng

### **3. Chống gửi trùng**

- Mỗi robot chỉ nhận 1 lần per token
- Lưu lịch sử trong MongoDB: `IssueMapsRecord`
- Muốn gửi lại → phải upload map mới

```java
boolean alreadyIssued = recordRepository.existsByVehicleIdAndMapTokenAndStatus(
    vehicleId, token, "SENT"
);

if (alreadyIssued) {
    return "ALREADY_ISSUED";
}
```

### **4. Validation**

- **File Extension:**
  - mapFile: `.png`
  - topoFile: `.json`
  - configFile: `.yaml` hoặc `.yml`

- **File Size:**
  - Tối đa: 50MB (tổng 3 file)

- **String Length (Giao thức Huaray):**
  - Map Name: 31 bytes
  - Version: 7 bytes
  - URL: 127 bytes
  - Message: 255 bytes

### **5. MD5 Checksum**

```java
private String calculateMD5(Path filePath) throws IOException, NoSuchAlgorithmException {
    MessageDigest md = MessageDigest.getInstance("MD5");
    
    try (InputStream is = Files.newInputStream(filePath)) {
        byte[] buffer = new byte[8192];
        int bytesRead;
        while ((bytesRead = is.read(buffer)) != -1) {
            md.update(buffer, 0, bytesRead);
        }
    }
    
    byte[] digest = md.digest();
    StringBuilder sb = new StringBuilder();
    for (byte b : digest) {
        sb.append(String.format("%02x", b));
    }
    return sb.toString();
}
```

---

## 📊 Database Schema (MongoDB)

### **Collection: map_download_links**

```javascript
{
  _id: ObjectId("..."),
  token: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  downloadUrl: "/api/download/a1b2c3d4-e5f6-7890-1234-567890abcdef",
  fullDownloadUrl: "http://localhost:8081/api/download/a1b2c3d4-e5f6-7890-1234-567890abcdef",
  createdAt: ISODate("2026-03-05T10:30:00Z"),
  downloaded: false
}
```

### **Collection: issue_maps_records**

```javascript
{
  _id: ObjectId("..."),
  vehicleId: "CB20608BAK00001",
  commandId: "CMD_issueMaps_1234567890",
  mapToken: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  mapName: "floor1",
  version: "1.0",
  message: "Updated map",
  downloadUrl: "http://localhost:8081/api/download/a1b2c3d4-...",
  md5: "a1b2c3d4e5f67890abcdef1234567890",
  fileSize: 1024000,
  sentAt: ISODate("2026-03-05T10:31:00Z"),
  status: "SENT"
}
```

---

## 🛠️ API Reference

### **1. Upload Map**

```http
POST /api/map-upload/upload
Content-Type: multipart/form-data

Form Data:
  - mapFile: File (.png)
  - topoFile: File (.json)
  - configFile: File (.yaml)

Response:
{
  "success": true,
  "token": "uuid-here",
  "downloadUrl": "/api/download/uuid-here",
  "connectedRobots": 3,
  "connectedDeviceIds": ["CB20608BAK00001", "CB20608BAK00002", "CB20608BAK00003"],
  "note": "Map uploaded but NOT auto-issued."
}
```

### **2. Get Latest Download Link**

```http
GET /api/map-upload/latest-link

Response:
{
  "found": true,
  "token": "uuid-here",
  "downloadUrl": "/api/download/uuid-here",
  "fullDownloadUrl": "http://localhost:8081/api/download/uuid-here",
  "createdAt": "2026-03-05T10:30:00Z",
  "downloaded": false
}
```

### **3. Get Connected Robots**

```http
GET /api/map-upload/connected-robots

Response:
{
  "count": 3,
  "deviceIds": ["CB20608BAK00001", "CB20608BAK00002", "CB20608BAK00003"]
}
```

### **4. Issue Map to Robot**

```http
POST /api/map-upload/issue-to-robot
Content-Type: application/json

Body:
{
  "vehicleId": "CB20608BAK00001",
  "mapName": "floor1",
  "version": "1.0",
  "message": "Updated map"
}

Response:
{
  "status": "SENT",
  "message": "issueMaps command sent to CB20608BAK00001",
  "downloadUrl": "http://localhost:8081/api/download/uuid-here",
  "md5": "a1b2c3d4..."
}
```

### **5. Issue Map to All Robots**

```http
POST /api/map-upload/issue-to-all
Content-Type: application/json

Body:
{
  "mapName": "floor1",
  "version": "1.0",
  "message": "Updated map"
}

Response:
{
  "status": "OK",
  "message": "Issued to 3 robot(s), skipped 0 (already issued).",
  "issuedCount": 3,
  "skippedCount": 0,
  "totalConnected": 3,
  "results": [...]
}
```

### **6. Download Map**

```http
GET /api/download/{token}

Response:
- 200 OK: File stream (application/octet-stream)
- 410 Gone: Token expired or invalid
- 500 Internal Server Error: File not found
```

### **7. Check Token Status**

```http
GET /api/map-upload/status/{token}

Response:
{
  "token": "uuid-here",
  "valid": true,
  "message": "Token is still valid"
}
```

---

## ⚙️ Configuration

### **application.properties**

```properties
# Server Port
server.port=8081

# MongoDB Connection
spring.data.mongodb.uri=mongodb://localhost:27017/robot_management

# File Upload Settings
spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB

# Temp Directory
java.io.tmpdir=/tmp
```

### **Frontend API (api.js)**

```javascript
const BASE_URL = "http://localhost:8081";

export const API_MAP_UPLOAD = `${BASE_URL}/api/map-upload/upload`;
export const API_MAP_LATEST_LINK = `${BASE_URL}/api/map-upload/latest-link`;
export const API_MAP_CONNECTED_ROBOTS = `${BASE_URL}/api/map-upload/connected-robots`;
export const API_MAP_ISSUE_TO_ROBOT = `${BASE_URL}/api/map-upload/issue-to-robot`;
export const API_MAP_ISSUE_TO_ALL = `${BASE_URL}/api/map-upload/issue-to-all`;
```

---

## 🚀 Hướng dẫn sử dụng

### **1. Chuẩn bị Map**

Tạo thư mục chứa 3 file:

```
my_map/
├── map.png         (Ảnh bản đồ)
├── topo.json       (Topology: nodes, lanes, stoppoints)
└── config.yaml     (Map config: resolution, origin)
```

### **2. Upload từ Frontend**

1. Mở trang web
2. Click **"Import Map"**
3. Chọn thư mục `my_map`
4. Click **"Upload Map Files to Server"**
5. Chờ upload thành công → hiển thị token

### **3. Issue Map cho Robot**

**Option A: Gửi cho 1 robot**
1. Chọn robot từ dropdown
2. Click **"Issue Map"**

**Option B: Gửi cho tất cả robot**
1. Click **"Issue Map to All Robots"**

### **4. Robot tự động download**

Robot nhận lệnh `issueMaps` → tải file ZIP từ URL → giải nén → cài đặt

---

## 🐛 Troubleshooting

### **Lỗi: "Total file size exceeds 50MB limit"**

**Nguyên nhân:** File map quá lớn

**Giải pháp:**
- Giảm resolution ảnh map
- Nén ảnh PNG
- Tăng giới hạn trong code:
  ```java
  private static final long MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB
  ```

### **Lỗi: "Download link expired"**

**Nguyên nhân:** Token đã quá 30 phút

**Giải pháp:**
- Upload lại map mới
- Tăng TTL:
  ```java
  private static final long TTL_SECONDS = 60 * 60; // 60 phút
  ```

### **Lỗi: "Map has already been issued"**

**Nguyên nhân:** Robot đã nhận map này rồi (chống gửi trùng)

**Giải pháp:**
- Upload map mới (token mới)
- Hoặc xóa record cũ trong MongoDB:
  ```javascript
  db.issue_maps_records.deleteMany({ vehicleId: "CB20608BAK00001" })
  ```

### **Lỗi: "No robots connected"**

**Nguyên nhân:** Không có robot nào kết nối qua TCP

**Giải pháp:**
- Kiểm tra robot đã kết nối chưa: `GET /api/map-upload/connected-robots`
- Khởi động fake_robot.py để test
- Kiểm tra ProtocolService có đang lưu connection không

---

## 📈 Monitoring & Logging

### **Log Messages**

```
📦 Registered download token: a1b2c3d4-... → /tmp/map_upload_1234.zip
📁 Created zip at: /tmp/map_upload_1234.zip (1024000 bytes)
💾 Download link saved to MongoDB.
🗺️ Issuing map to robot: CB20608BAK00001
   URL: http://localhost:8081/api/download/a1b2c3d4-...
   MD5: a1b2c3d4e5f67890abcdef1234567890
   Size: 1024000 bytes
📥 Serving download: token=a1b2c3d4-..., size=1024000
🗑️ Cleaned up expired zip: /tmp/map_upload_1234.zip
```

### **Kiểm tra trạng thái**

```bash
# Số lượng file ZIP trong /tmp
ls -lh /tmp/map_upload_*.zip

# Số lượng token đang active (thêm endpoint)
GET /api/map-upload/stats

# Lịch sử issue map
db.issue_maps_records.find().sort({ sentAt: -1 }).limit(10)
```

---

## 🔧 Tùy chỉnh & Mở rộng

### **1. Tắt chế độ One-Time Download**

Hiện tại file **KHÔNG bị xóa** sau download → có thể tải nhiều lần

Nếu muốn **chỉ tải 1 lần** (true one-time):

```java
// Trong OneTimeDownloadController.java
Path zipPath = mapDownloadService.consumeDownload(token); // Dùng consumeDownload thay vì getFilePath
```

### **2. Thay đổi TTL**

```java
// MapDownloadService.java
private static final long TTL_SECONDS = 60 * 60; // 1 giờ
```

### **3. Lưu file vào thư mục cố định thay vì /tmp**

```java
// MapUploadController.java
private Path createZipFile(...) {
    Path uploadDir = Paths.get("/var/www/maps");
    Files.createDirectories(uploadDir);
    Path zipPath = uploadDir.resolve("map_" + System.currentTimeMillis() + ".zip");
    // ...
}
```

### **4. Thêm authentication cho download link**

```java
// OneTimeDownloadController.java
@GetMapping("/{token}")
public ResponseEntity<StreamingResponseBody> downloadZip(
        @PathVariable String token,
        @RequestHeader("Authorization") String authHeader) {
    
    if (!isValidAuth(authHeader)) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    // ...
}
```

### **5. Gửi notification sau khi robot download xong**

```java
// RobotEventHandler.java (khi nhận event RobotMapUpdate)
if (event.getStatus().equals("SUCCESS")) {
    notificationService.send("Robot " + vehicleId + " installed map successfully");
}
```

---

## 📚 Tham khảo

- **Spring Boot MultipartFile:** https://spring.io/guides/gs/uploading-files/
- **MongoDB Repository:** https://spring.io/projects/spring-data-mongodb
- **Java ZipOutputStream:** https://docs.oracle.com/javase/8/docs/api/java/util/zip/ZipOutputStream.html
- **React File Input:** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file
- **Huaray Protocol Spec:** (Internal documentation)

---

## 👨‍💻 Tác giả & Bảo trì

- **Version:** 2.0
- **Last Updated:** March 5, 2026
- **Author:** Development Team
- **Contact:** support@example.com

---

## 📝 Changelog

### **v2.0 - March 2026**
- Thêm tính năng upload map qua UI
- Tạo one-time download link với UUID token
- Chống gửi trùng map cho robot
- Tự động dọn dẹp file hết hạn (TTL: 30 phút)
- Lưu lịch sử issue map vào MongoDB
- Tính MD5 checksum để verify file

### **v1.0 - January 2026**
- Upload map thủ công qua API
- Gửi map trực tiếp cho robot (không qua link)

---

## ⚠️ Lưu ý quan trọng

1. **Không tự động gửi map:** Sau khi upload, phải **thủ công** bấm "Issue Map"
2. **Một robot - một map:** Mỗi robot chỉ nhận 1 lần per token. Muốn gửi lại → upload map mới
3. **TTL 30 phút:** File ZIP tự xóa sau 30 phút. Download trước khi hết hạn!
4. **Max 50MB:** Tổng 3 file không vượt quá 50MB
5. **Thread-safe:** Hệ thống an toàn với nhiều request đồng thời
6. **MongoDB required:** Cần MongoDB để lưu link và lịch sử

---

**🎉 Hoàn thành! Tài liệu này mô tả đầy đủ cơ chế upload map và tạo download link.**
