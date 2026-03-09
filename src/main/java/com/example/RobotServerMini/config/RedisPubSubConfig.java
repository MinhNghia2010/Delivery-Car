package com.example.RobotServerMini.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Configuration
public class RedisPubSubConfig {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Called whenever Redis receives a message on "order_topic"
    // Message body is already a JSON list of active orders from the publishing backend
    public void handleOrderEvent(String message) {
        System.out.println("[Redis] Received order event — broadcasting raw payload to WebSocket clients");
        messagingTemplate.convertAndSend("/topic/orders", message);
    }

    @Bean
    public MessageListenerAdapter orderListenerAdapter() {
        return new MessageListenerAdapter(this, "handleOrderEvent");
    }

    @Bean
    public RedisMessageListenerContainer redisListenerContainer(
            RedisConnectionFactory connectionFactory,
            MessageListenerAdapter orderListenerAdapter) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(orderListenerAdapter, new PatternTopic("order_topic"));
        return container;
    }
}
