package com.example.RobotServerMini.repository;

import com.example.RobotServerMini.models.RobotModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface RobotRepository extends MongoRepository<RobotModel, String> {
    // Tìm kiếm theo Site ID
    Page<RobotModel> findBySiteId(String siteId, Pageable pageable);

    // Tìm kiếm nâng cao (Keyword tìm trong name hoặc objectId)
    @Query("{$or: [ { 'robotName': { $regex: ?0, $options: 'i' } }, { 'robotObjectId': { $regex: ?0, $options: 'i' } } ]}")
    Page<RobotModel> searchByKeyword(String keyword, Pageable pageable);
}
