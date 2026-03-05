package com.example.RobotServerMini.repository;

import com.example.RobotServerMini.models.SiteModel;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SiteRepository extends MongoRepository<SiteModel, String> {
    // Các hàm tìm kiếm thêm sau
}
