package com.example.RobotServerMini.robotservice;

import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MapDownloadService {

    // Token -> file path mapping (no expiry)
    private final ConcurrentHashMap<String, Path> tokenStore = new ConcurrentHashMap<>();

    /**
     * Register a ZIP file and return a UUID download token.
     */
    public String registerDownload(Path zipPath) {
        String token = UUID.randomUUID().toString();
        tokenStore.put(token, zipPath);
        System.out.println("📦 Registered download token: " + token + " → " + zipPath);
        return token;
    }

    /**
     * Get the file path for a token. Returns null if token is invalid.
     */
    public Path getFilePath(String token) {
        return tokenStore.get(token);
    }

    /**
     * Re-register a token (used when restoring from DB on startup).
     */
    public void restoreToken(String token, Path zipPath) {
        tokenStore.put(token, zipPath);
    }
}
