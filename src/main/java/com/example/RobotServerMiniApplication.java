package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan; // <-- Import thêm
import org.springframework.context.annotation.FilterType;    // <-- Import thêm
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication


@ComponentScan(
        basePackages = "com.example",
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.REGEX,
                pattern = "com.example.robotserver.*"
        )
)
@EnableScheduling
public class RobotServerMiniApplication {

    public static void main(String[] args) {
        SpringApplication.run(RobotServerMiniApplication.class, args);
    }
}