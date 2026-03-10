package com.example.RobotServerMini.config;

import com.example.RobotServerMini.models.OrderModel;
import com.example.RobotServerMini.repository.OrderRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;

@Configuration
public class RedisPubSubConfig {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ObjectMapper objectMapper;

    // Called whenever Redis receives a message on "order_topic"
    // Message body is a JSON list of active orders from the publishing backend
    public void handleOrderEvent(String message) {
        System.out.println("[Redis] Received order event — saving to DB and broadcasting to WebSocket clients");
        try {
            List<OrderModel> orders = objectMapper.readValue(message, new TypeReference<List<OrderModel>>() {});
            for (OrderModel order : orders) {
                if (order.getOrderCode() != null && !orderRepository.existsByOrderCode(order.getOrderCode())) {
                    orderRepository.save(order);
                }
            }
        } catch (Exception e) {
            System.err.println("[Redis] Failed to parse/save orders: " + e.getMessage());
        }
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
