//package com.example.RobotServerMini.scheduler;
//
//import com.example.RobotServerMini.models.OrderModel;
//import com.example.RobotServerMini.repository.OrderRepository;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.scheduling.annotation.Scheduled;
//import org.springframework.stereotype.Component;
//
//import java.time.LocalDateTime;
//import java.util.List;
//
//@Component
//public class OrderDispatchScheduler {
//
//    @Autowired
//    private OrderRepository orderRepository;
//
//    // Chạy mỗi 30 giây một lần (30000 ms)
//    @Scheduled(fixedRate = 30000)
//    public void scanAndDispatchOrders() {
//        // 1. Lấy tất cả đơn đang PENDING
//        // (Lưu ý: Nếu data lớn nên viết hàm findByStatus trong Repository, nhưng tạm thời dùng findAll lọc cho nhanh)
//        List<OrderModel> allOrders = orderRepository.findAll();
//
//        LocalDateTime now = LocalDateTime.now();
//
//        for (OrderModel order : allOrders) {
//            // Chỉ quan tâm đơn PENDING
//            if (!"PENDING".equalsIgnoreCase(order.getStatus())) {
//                continue;
//            }
//
//            // 2. Lấy thời gian giao sớm nhất
//            LocalDateTime earliest = order.getEarliestDeliveryTime();
//
//            // Nếu không có thời gian sớm nhất, bỏ qua hoặc xử lý ngay tùy logic (ở đây mình bỏ qua cho an toàn)
//            if (earliest == null) continue;
//
//            // 3. Tính mốc thời gian kích hoạt (Trước 10 phút)
//            LocalDateTime triggerTime = earliest.minusMinutes(10);
//
//            // 4. So sánh: Nếu Hiện tại >= (Sớm nhất - 10p)
//            if (now.isAfter(triggerTime) || now.isEqual(triggerTime)) {
//
//                // --- 🔥 HÀNH ĐỘNG GỬI LỆNH (MÔ PHỎNG) ---
//                System.out.println("=============================================");
//                System.out.println("🚀 [AUTO-DISPATCH] ĐẾN GIỜ HOÀNG ĐẠO! GỬI LỆNH XE!");
//                System.out.println("   Mã Đơn: " + order.getOrderId());
//                System.out.println("   Khách hẹn: " + earliest);
//                System.out.println("   Giờ kích hoạt (-10p): " + triggerTime);
//                System.out.println("   Giờ thực tế: " + now);
//                System.out.println("   >> Sending JSON to Robot: { \"action\": \"GIAO_HANG\", \"dest\": \"" + order.getDestination() + "\" }");
//                System.out.println("=============================================");
//
//                // 5. QUAN TRỌNG: Đổi trạng thái để vòng lặp sau không quét lại đơn này nữa
//                order.setStatus("ASSIGNED"); // Đã gán/Đã gửi lệnh
//                orderRepository.save(order);
//            }
//        }
//    }
//}