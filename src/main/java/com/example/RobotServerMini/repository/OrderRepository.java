package com.example.RobotServerMini.repository;

import com.example.RobotServerMini.models.OrderModel;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OrderRepository extends MongoRepository<OrderModel, String> {
    // Tìm đơn chưa hoàn thành để hiện ở Tab Active
    List<OrderModel> findByStatus(String status);
    boolean existsByOrderCode(String orderCode);
}