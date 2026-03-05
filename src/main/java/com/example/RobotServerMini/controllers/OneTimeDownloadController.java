package com.example.RobotServerMini.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.example.RobotServerMini.robotservice.MapDownloadService;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/download")
@CrossOrigin(origins = "*")
public class OneTimeDownloadController {

    @Autowired
    private MapDownloadService mapDownloadService;

    @GetMapping("/{token}")
    public ResponseEntity<StreamingResponseBody> downloadZip(@PathVariable String token) {
        // 1. Look up the file path from the token
        Path zipPath = mapDownloadService.getFilePath(token);

        if (zipPath == null) {
            System.out.println("⛔ Token invalid or not found: " + token);
            return ResponseEntity.status(HttpStatus.GONE)
                    .body(out -> out.write("{\"error\":\"Download link not found\"}".getBytes()));
        }

        // 2. Check file exists on disk
        if (!Files.exists(zipPath)) {
            System.err.println("⚠️ File not found on disk: " + zipPath);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(out -> out.write("{\"error\":\"File not found on server\"}".getBytes()));
        }

        try {
            long fileSize = Files.size(zipPath);
            System.out.println("📥 Serving download: token=" + token + ", size=" + fileSize);

            // 3. Stream the file
            StreamingResponseBody responseBody = outputStream -> {
                try (InputStream inputStream = Files.newInputStream(zipPath)) {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                    }
                    outputStream.flush();
                }
            };

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDisposition(
                    ContentDisposition.builder("attachment")
                            .filename("map_package.zip")
                            .build());
            headers.setContentLength(fileSize);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(responseBody);

        } catch (Exception e) {
            System.err.println("❌ Error serving download: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(out -> out.write("{\"error\":\"Server error\"}".getBytes()));
        }
    }
}
