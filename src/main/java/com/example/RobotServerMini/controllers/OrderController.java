package com.example.RobotServerMini.controllers;

import com.example.RobotServerMini.models.OrderModel;
import com.example.RobotServerMini.robotservice.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*") // Cho phép React gọi
public class OrderController {

    @Autowired
    private OrderService orderService;

    // API 1: Lấy danh sách đơn đang chạy (Tab 1)
    @GetMapping("/active")
    public List<OrderModel> getActiveOrders() {
        return orderService.getActiveOrders();
    }

    // API 2: Tìm kiếm lịch sử đơn hoàn thành (Tab 2 - 4 ô lọc)
    @GetMapping("/history")
    public List<OrderModel> searchHistory(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String compartment,
            @RequestParam(required = false) String orderCode
    ) {
        return orderService.searchCompletedOrders(date, name, phone, compartment ,orderCode);
    }

    // API 3: Hoàn thành đơn
    @PostMapping("/{id}/complete")
    public void completeOrder(@PathVariable String id) {
        orderService.completeOrder(id);
    }

    // API 4: Tạo đơn mới (Để test)
    @PostMapping("/create")
    public OrderModel createOrder(@RequestBody OrderModel order) {
        return orderService.createOrder(order);
    }
}