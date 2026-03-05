package com.example.RobotServerMini.controllers;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/datamap")
@CrossOrigin("*") // Cho phép Frontend gọi
public class DataMapController {

    // Lưu trữ Map trong bộ nhớ (hoặc bạn có thể lưu vào DB)
    // Để static để các Service khác (TaskService) có thể truy cập tính toán đường đi
    public static Map<String, Object> GLOBAL_MAP_DATA = new ConcurrentHashMap<>();

    @PostMapping("/upload")
    public Map<String, Object> uploadMap(@RequestBody Map<String, Object> payload) {

        // 1. Lưu dữ liệu vào biến toàn cục
        GLOBAL_MAP_DATA.put("nodes", payload.get("nodes"));   // Danh sách Node
        GLOBAL_MAP_DATA.put("points", payload.get("points")); // Danh sách Point (đã lọc stoppoint)
        GLOBAL_MAP_DATA.put("lanes", payload.get("lanes"));   // Danh sách đường nối

        // In kiểm tra
        List<?> points = (List<?>) payload.get("points");
        System.out.println("👉 Số lượng Points (Node): " + (points != null ? points.size() : 0));

        List<?> lanes = (List<?>) payload.get("lanes");
        System.out.println("👉 Số lượng Lanes: " + (lanes != null ? lanes.size() : 0));

        // 2. (Tùy chọn) Tại đây bạn có thể gọi hàm Build Graph để tính toán đường đi sau này
        // graphService.buildGraph(payload);

        Map<String, Object> res = new HashMap<>();
        res.put("status", "SUCCESS");
        res.put("message", "Map stored successfully");
        return res;
    }
}
