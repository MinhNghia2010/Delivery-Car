package com.example.RobotServerMini.controllers;

import com.example.RobotServerMini.models.RobotModel;
import com.example.RobotServerMini.repository.RobotRepository;
import com.example.RobotServerMini.repository.SiteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "*")
public class RobotController {

    @Autowired
    private RobotRepository robotRepository;

    @Autowired
    private SiteRepository siteRepository;

    @PostMapping("/api/robot")
    public Map<String, Object> createRobot(@RequestBody RobotModel robot) {
        if (robot.getStatus() == null) robot.setStatus("IN_SERVICE");
        RobotModel saved = robotRepository.save(robot);
        return successResponse(saved);
    }

    @PutMapping("/api/robot/{robotId}")
    public Map<String, Object> updateRobot(@PathVariable String robotId, @RequestBody RobotModel robot) {
        return robotRepository.findById(robotId).map(existing -> {
            // Update fields
            if(robot.getRobotName() != null) existing.setRobotName(robot.getRobotName());
            if(robot.getRobotObjectId() != null) existing.setRobotObjectId(robot.getRobotObjectId());
            if(robot.getRemark() != null) existing.setRemark(robot.getRemark());
            // ... (các trường khác nếu cần)
            robotRepository.save(existing);
            return successResponse(true);
        }).orElse(errorResponse("Robot not found"));
    }

    @DeleteMapping("/api/robot/{robotId}")
    public Map<String, Object> deleteRobot(@PathVariable String robotId) {
        if (robotRepository.existsById(robotId)) {
            robotRepository.deleteById(robotId);
            return successResponse(true);
        }
        return errorResponse("Not Found");
    }

    @GetMapping("/api/robot")
    public Map<String, Object> getRobots(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String siteId
    ) {
        Pageable pageable = PageRequest.of(current - 1, size);
        Page<RobotModel> page;

        if (siteId != null && !siteId.isEmpty()) {
            page = robotRepository.findBySiteId(siteId, pageable);
        } else if (keyword != null && !keyword.isEmpty()) {
            page = robotRepository.searchByKeyword(keyword, pageable);
        } else {
            page = robotRepository.findAll(pageable);
        }

        return pageResponse(page);
    }

    @GetMapping("/api/robots/{robotId}")
    public Map<String, Object> getRobotDetail(@PathVariable String robotId) {
        Optional<RobotModel> robot = robotRepository.findById(robotId);
        return robot.map(this::successResponse).orElse(errorResponse("Not Found"));
    }

    // ==========================================
    // 1.4 QUẢN LÝ QUAN HỆ ROBOT - SITE
    // ==========================================

    // Add relationship
    @PutMapping("/api/sites/{siteId}/robots/{robotId}")
    public Map<String, Object> addRelation(@PathVariable String siteId, @PathVariable String robotId) {

        // 👈 3. THÊM ĐOẠN CHECK NÀY
        if (!siteRepository.existsById(siteId)) {
            return errorResponse("Lỗi: Site ID " + siteId + " không tìm thấy trong Database!");
        }

        return robotRepository.findById(robotId).map(robot -> {
            robot.setSiteId(siteId);
            robotRepository.save(robot);
            return successResponse(true);
        }).orElse(errorResponse("Robot not found"));
    }

    // Delete relationship
    @DeleteMapping("/api/sites/{siteId}/robots/{robotId}")
    public Map<String, Object> deleteRelation(@PathVariable String siteId, @PathVariable String robotId) {
        return robotRepository.findById(robotId).map(robot -> {
            // Chỉ xóa nếu robot đang thuộc site này
            if (siteId.equals(robot.getSiteId())) {
                robot.setSiteId(null); // Gỡ site
                robotRepository.save(robot);
            }
            return successResponse(true);
        }).orElse(errorResponse("Robot not found"));
    }

    // Query robots in site
    @GetMapping("/api/sites/{siteId}/robots")
    public Map<String, Object> getRobotsBySite(
            @PathVariable String siteId,
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(current - 1, size);
        Page<RobotModel> page = robotRepository.findBySiteId(siteId, pageable);
        return pageResponse(page);
    }

    // --- Helpers ---
    private Map<String, Object> successResponse(Object data) {
        Map<String, Object> map = new HashMap<>();
        map.put("code", 0);
        map.put("data", data);
        return map;
    }

    private Map<String, Object> errorResponse(String msg) {
        Map<String, Object> map = new HashMap<>();
        map.put("code", 1);
        map.put("msg", msg);
        return map;
    }

    private Map<String, Object> pageResponse(Page<RobotModel> page) {
        Map<String, Object> data = new HashMap<>();
        data.put("records", page.getContent());
        data.put("total", page.getTotalElements());
        data.put("size", page.getSize());
        data.put("current", page.getNumber() + 1);
        data.put("pages", page.getTotalPages());
        return successResponse(data);
    }
}