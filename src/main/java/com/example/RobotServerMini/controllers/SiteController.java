package com.example.RobotServerMini.controllers;

import com.example.RobotServerMini.models.SiteModel;
import com.example.RobotServerMini.repository.SiteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/site")
@CrossOrigin(origins = "*")
public class SiteController {

    @Autowired
    private SiteRepository siteRepository;

    // --- CÁC API CŨ (Giữ lại Add/Update theo yêu cầu trước) ---
    @PostMapping("/addSite")
    public SiteModel addSite(@RequestBody SiteModel site) {
        return siteRepository.save(site);
    }

    @PutMapping("/updateSite")
    public SiteModel updateSite(@RequestBody SiteModel site) {
        // Kiểm tra xem ID có tồn tại không
        if (site.getSiteId() != null && siteRepository.existsById(site.getSiteId())) {
            return siteRepository.save(site);
        }
        return null;
    }

    // 1. Delete Site
    // Endpoint: /api/site/deleteSite
    // Key: siteId (Query Param)
    @DeleteMapping("/deleteSite")
    public String deleteSite(@RequestParam String siteId) {
        if (siteRepository.existsById(siteId)) {
            siteRepository.deleteById(siteId);
            return "Deleted";
        }
        return "Not Found";
    }

    // 2. Query Site Details
    // Endpoint: /api/site/querySiteDetails
    // Key: siteId (Query Param)
    @GetMapping("/querySiteDetails")
    public SiteModel querySiteDetails(@RequestParam String siteId) {
        return siteRepository.findById(siteId).orElse(null);
    }

    // 3. Query List (Phân trang)
    // Endpoint: /api/site/querySitePage
    // Keys: current, size
    @GetMapping("/querySitePage")
    public Map<String, Object> querySitePage(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size
    ) {
        // Lưu ý: Spring Boot phân trang bắt đầu từ 0, nên phải trừ 1
        Pageable pageable = PageRequest.of(current - 1, size);
        Page<SiteModel> page = siteRepository.findAll(pageable);

        // Tạo cấu trúc JSON trả về đúng như yêu cầu: { "data": { "records": [], "total": ... } }
        Map<String, Object> data = new HashMap<>();
        data.put("records", page.getContent());
        data.put("total", page.getTotalElements());
        data.put("size", page.getSize());
        data.put("current", page.getNumber() + 1); // Trả lại trang bắt đầu từ 1
        data.put("pages", page.getTotalPages());
        data.put("orders", new Object[]{}); // Mảng rỗng như mẫu

        Map<String, Object> response = new HashMap<>();
        response.put("data", data); // Bọc trong "data"

        return response;
    }
    @GetMapping("/getSitePage")
    public Map<String, Object> getSitePage(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageRequest pageable = PageRequest.of(current - 1, size);
        Page<SiteModel> page = siteRepository.findAll(pageable);

        Map<String, Object> data = new HashMap<>();
        data.put("records", page.getContent());
        data.put("total", page.getTotalElements());
        data.put("size", page.getSize());
        data.put("current", page.getNumber() + 1);
        data.put("pages", page.getTotalPages());

        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("data", data);
        return response;
    }

    // Thêm API get all cho dropdown nếu cần
    @GetMapping("/getAll")
    public Map<String, Object> getAllSites() {
        Map<String, Object> response = new HashMap<>();
        response.put("code", 0);
        response.put("data", siteRepository.findAll());
        return response;
    }

}