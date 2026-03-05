package com.example.RobotServerMini.repository;

import com.example.RobotServerMini.models.RobotInformationModel;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RobotInformationRepository extends MongoRepository<RobotInformationModel, String> {
    // Tìm kiếm theo Serial Number để update
    Optional<RobotInformationModel> findBySerialNo(String serialNo);
}
