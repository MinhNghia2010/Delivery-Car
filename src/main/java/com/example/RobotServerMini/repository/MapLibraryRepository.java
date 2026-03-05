package com.example.RobotServerMini.repository;

import com.example.RobotServerMini.models.MapLibraryEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MapLibraryRepository extends MongoRepository<MapLibraryEntry, String> {
    Optional<MapLibraryEntry> findByMapName(String mapName);

    Optional<MapLibraryEntry> findByToken(String token);
}
