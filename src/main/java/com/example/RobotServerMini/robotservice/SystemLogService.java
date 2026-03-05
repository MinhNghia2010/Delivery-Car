package com.example.RobotServerMini.robotservice;
import com.example.RobotServerMini.models.SystemLog;
import com.example.RobotServerMini.repository.SystemLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SystemLogService {

    @Autowired
    private SystemLogRepository logRepository;

    // Hàm ghi log dùng chung
    public void log(String actorId, String actorName, String action, String entity, String targetId, String details) {
        try {
            SystemLog log = new SystemLog(actorId, actorName, action, entity, targetId, details);
            logRepository.save(log);
            System.out.println("📝 LOG: " + action + " - " + details);
        } catch (Exception e) {
            System.err.println("❌ Lỗi ghi log: " + e.getMessage());
        }
    }
}
