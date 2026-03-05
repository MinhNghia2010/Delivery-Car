package com.example.RobotServerMini.controllers;

import com.example.RobotServerMini.robotservice.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks") // Chuẩn RESTful
@CrossOrigin(origins = "*")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @PostMapping("/send")
    public Map<String, Object> sendTask(@RequestBody Map<String, Object> payload) {
        return taskService.sendAddTask(payload);
    }

    @PostMapping("/pause")
    public Map<String, Object> pauseTask(@RequestBody Map<String, Object> payload) {
        return taskService.sendControlCommand("pauseTask", payload);
    }

    @PostMapping("/resume")
    public Map<String, Object> resumeTask(@RequestBody Map<String, Object> payload) {
        return taskService.sendControlCommand("resumeTask", payload);
    }

    @PostMapping("/cancel")
    public Map<String, Object> cancelTask(@RequestBody Map<String, Object> payload) {
        return taskService.sendControlCommand("cancelTask", payload);
    }
}
