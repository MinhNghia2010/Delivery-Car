package com.example.RobotServerMini.robotservice;

import com.example.RobotServerMini.models.OrderModel;
import com.example.RobotServerMini.repository.OrderRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    // Lấy danh sách đang xử lý
    public List<OrderModel> getActiveOrders() {
        return orderRepository.findByStatus("PENDING");
    }

    // Hoàn thành đơn
    public void completeOrder(String id) {
        orderRepository.findById(id).ifPresent(order -> {
            order.setStatus("COMPLETED");
            order.setCompletedTime(LocalDateTime.now());
            orderRepository.save(order);
        });
    }

    // 🔥 LOGIC LỌC 4 Ô (Time, Name, Phone, Compartment)
    public List<OrderModel> searchCompletedOrders(String dateStr, String name, String phone, String compartment , String orderCode) {
        Query query = new Query();

        // Luôn chỉ lấy đơn ĐÃ HOÀN THÀNH
        query.addCriteria(Criteria.where("status").is("COMPLETED"));

        // 1. Lọc theo ngày (Nếu có chọn ngày)
        if (dateStr != null && !dateStr.isEmpty()) {
            LocalDate date = LocalDate.parse(dateStr);
            LocalDateTime startOfDay = date.atStartOfDay();
            LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();
            query.addCriteria(Criteria.where("createdTime").gte(startOfDay).lt(endOfDay));
        }

        // 2. Lọc tên (Gần đúng - regex)
        if (name != null && !name.isEmpty()) {
            query.addCriteria(Criteria.where("fullName").regex(name, "i"));
        }

        // 3. Lọc SĐT (Chính xác hoặc gần đúng)
        if (phone != null && !phone.isEmpty()) {
            query.addCriteria(Criteria.where("phone").regex(phone));
        }

        // 4. Lọc Ngăn tủ
        if (compartment != null && !compartment.isEmpty()) {
            query.addCriteria(Criteria.where("compartment").is(compartment)); // Hoặc dùng regex nếu muốn
        }
        // 👇 THÊM ĐOẠN NÀY
        if (orderCode != null && !orderCode.isEmpty()) {
            // Tìm chính xác hoặc gần đúng tùy bạn (ở đây dùng regex tìm gần đúng)
            query.addCriteria(Criteria.where("orderCode").regex(orderCode, "i"));
        }

        return mongoTemplate.find(query, OrderModel.class);
    }

    // Hàm tạo test data
    public OrderModel createOrder(OrderModel order) {
        order.setStatus("PENDING");
        OrderModel saved = orderRepository.save(order);
        publishOrderEvent();
        return saved;
    }

    private void publishOrderEvent() {
        try {
            String payload = objectMapper.writeValueAsString(getActiveOrders());
            stringRedisTemplate.convertAndSend("order_topic", payload);
        } catch (JsonProcessingException e) {
            // Nếu có lỗi serialize thì log ra cho dễ debug
            e.printStackTrace();
        }
    }
}
