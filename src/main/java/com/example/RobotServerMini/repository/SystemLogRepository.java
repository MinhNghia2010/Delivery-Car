package com.example.RobotServerMini.repository;

import com.example.RobotServerMini.models.SystemLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SystemLogRepository extends MongoRepository<SystemLog, String> {
    // Tìm log theo mã đơn hàng (để xem lịch sử của 1 đơn)
    List<SystemLog> findByTargetIdOrderByTimestampDesc(String targetId);
}