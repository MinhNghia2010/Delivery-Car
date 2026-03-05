package com.example.RobotServerMini.repository;

import com.example.RobotServerMini.models.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface AccountRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);
}