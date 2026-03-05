package com.example.RobotServerMini.repository;



import com.example.RobotServerMini.models.ParkPointModel;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

@Repository
public interface ParkPointRepository extends MongoRepository<ParkPointModel, String> {
    // Tìm kiếm phân trang theo Site ID
    Page<ParkPointModel> findBySiteId(String siteId, Pageable pageable);

}
