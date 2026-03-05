package com.example.RobotServerMini.controllers;

import com.example.RobotServerMini.models.User;
import com.example.RobotServerMini.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder; // Cần Bean này trong SecurityConfig
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*") // Cho phép React gọi
public class AuthController {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder; //  BCryptPasswordEncoder

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest.get("username");
        String rawPassword = loginRequest.get("password");

        Optional<User> userOpt = accountRepository.findByUsername(username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            if (passwordEncoder.matches(rawPassword, user.getPassword())) {

                // 3. Đăng nhập thành công -> Trả về Role
                Map<String, String> response = new HashMap<>();
                response.put("username", user.getUsername());
                response.put("role", user.getRole()); // Trả về "admin"
                return ResponseEntity.ok(response);
            }
        }

        // 4. Sai user hoặc sai pass
        return ResponseEntity.status(401).body("Sai tên đăng nhập hoặc mật khẩu!");
    }
    @GetMapping("/gen")
    public String gen() {
        return passwordEncoder.encode("123");
    }
}