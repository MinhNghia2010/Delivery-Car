package com.example.RobotServerMini.controllers;

import com.example.RobotServerMini.models.ParkPointModel;
import com.example.RobotServerMini.repository.ParkPointRepository;
import com.example.RobotServerMini.repository.SiteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/point") // Base URL
@CrossOrigin(origins = "*")
public class ParkPointController {

    @Autowired
    private ParkPointRepository parkPointRepository;

    @Autowired
    private SiteRepository siteRepository;

    // 1. Add stops
    // Endpoint: POST /api/point/addParkPoint
    @PostMapping("/addParkPoint")
    public ParkPointModel addParkPoint(@RequestBody ParkPointModel point) {
        if (point.getSiteId() != null && !point.getSiteId().isEmpty()) {
            if (!siteRepository.existsById(point.getSiteId())) {
                // Nếu Site ID không có thật -> Báo lỗi ngay
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lỗi: Site ID không tồn tại!");
            }
        }
        return parkPointRepository.save(point);
    }

    // 2. Modify the Stop
    // Endpoint: PUT /api/point/updateParkPoint
    @PutMapping("/updateParkPoint")
    public ParkPointModel updateParkPoint(@RequestBody ParkPointModel point) {
        if (point.getSiteId() != null && !point.getSiteId().isEmpty()) {
            if (!siteRepository.existsById(point.getSiteId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lỗi: Site ID không tồn tại!");
            }
        }

        if (point.getParkPointId() != null && parkPointRepository.existsById(point.getParkPointId())) {
            return parkPointRepository.save(point);
        }
        return null;
    }

    // 3. Delete a stop
    // Endpoint: DELETE /api/point/deleteParkPoint?parkPointId=...
    @DeleteMapping("/deleteParkPoint")
    public String deleteParkPoint(@RequestParam String parkPointId) {
        if (parkPointRepository.existsById(parkPointId)) {
            parkPointRepository.deleteById(parkPointId);
            return "Deleted";
        }
        return "Not Found";
    }

    // 4. Query the list of stops
    // Endpoint: GET /api/point/getParkPointPage?current=1&size=10&siteId=...
    @GetMapping("/getParkPointPage")
    public Map<String, Object> getParkPointPage(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String siteId
    ) {
        Pageable pageable = PageRequest.of(current - 1, size);
        Page<ParkPointModel> page;

        if (siteId != null && !siteId.isEmpty()) {
            page = parkPointRepository.findBySiteId(siteId, pageable);
        } else {
            page = parkPointRepository.findAll(pageable);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("records", page.getContent());
        data.put("total", page.getTotalElements());
        data.put("size", page.getSize());
        data.put("current", page.getNumber() + 1);
        data.put("pages", page.getTotalPages());

        Map<String, Object> response = new HashMap<>();
        response.put("data", data);

        return response;
    }

    // 5. Query details
    // Endpoint: GET /api/point/getParkPointDetails?parkPointId=...
    @GetMapping("/getParkPointDetails")
    public ParkPointModel getParkPointDetails(@RequestParam String parkPointId) {
        return parkPointRepository.findById(parkPointId).orElse(null);
    }
}