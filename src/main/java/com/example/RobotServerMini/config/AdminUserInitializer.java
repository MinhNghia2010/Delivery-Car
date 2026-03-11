package com.example.RobotServerMini.config;

import com.example.RobotServerMini.models.User;
import com.example.RobotServerMini.repository.AccountRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminUserInitializer implements ApplicationRunner {
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminUserInitializer(AccountRepository accountRepository, PasswordEncoder passwordEncoder) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        String username = "admin";

        if (accountRepository.findByUsername(username).isPresent()) {
            return;
        }

        User admin = new User();
        admin.setUsername(username);
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setRole("ADMIN");
        accountRepository.save(admin);
    }
}