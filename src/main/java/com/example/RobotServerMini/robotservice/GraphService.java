package com.example.RobotServerMini.robotservice;

import com.example.RobotServerMini.controllers.DataMapController;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class GraphService {

    // Cấu trúc Node cho đồ thị
    public static class GraphNode {
        public String id;
        public double x;
        public double y;
        public List<GraphEdge> neighbors = new ArrayList<>();

        public GraphNode(String id, double x, double y) {
            this.id = id;
            this.x = x;
            this.y = y;
        }
    }

    // Cấu trúc Cạnh (Đường nối)
    public static class GraphEdge {
        public GraphNode target;
        public double weight; // Độ dài đường đi
        public double radius;

        public GraphEdge(GraphNode target, double weight, double radius) {
            this.target = target;
            this.weight = weight;
            this.radius = radius;
        }
    }

    private Map<String, GraphNode> graph = new HashMap<>();

    // 1. HÀM DỰNG GRAPH TỪ DỮ LIỆU JSON MỚI (TOPO.JSON)
    public void buildGraph() {
        Map<String, Object> rawData = DataMapController.GLOBAL_MAP_DATA;
        if (rawData.isEmpty()) {
            System.err.println("❌ Chưa có dữ liệu Map! Hãy upload map từ Frontend trước.");
            return;
        }

        graph.clear();

        // Đọc mảng "points" và "lanes" từ payload Frontend gửi lên
        List<Map<String, Object>> points = (List<Map<String, Object>>) rawData.get("points");
        List<Map<String, Object>> lanes = (List<Map<String, Object>>) rawData.get("lanes");

        if (points == null || lanes == null) {
            System.err.println("❌ Dữ liệu points hoặc lanes bị null! Kiểm tra lại file topo.json");
            return;
        }

        // BƯỚC 1: Tạo các Node từ mảng "points"
        for (Map<String, Object> p : points) {
            // Lấy ID và tọa độ
            String id = String.valueOf(p.get("id"));
            double x = Double.parseDouble(String.valueOf(p.get("x")));
            double y = Double.parseDouble(String.valueOf(p.get("y")));

            graph.put(id, new GraphNode(id, x, y));
        }

        // BƯỚC 2: Liên kết các Node bằng mảng "lanes" (dựa vào start_node_id và end_node_id)
        for (Map<String, Object> lane : lanes) {
            if (lane.containsKey("start_node_id") && lane.containsKey("end_node_id")) {
                String startId = String.valueOf(lane.get("start_node_id"));
                String endId = String.valueOf(lane.get("end_node_id"));

                GraphNode nodeA = graph.get(startId);
                GraphNode nodeB = graph.get(endId);

                if (nodeA != null && nodeB != null) {
                    // Ưu tiên lấy length từ JSON, nếu không có mới tự tính
                    double dist = lane.containsKey("length") ?
                            Double.parseDouble(String.valueOf(lane.get("length"))) :
                            calculateDistance(nodeA.x, nodeA.y, nodeB.x, nodeB.y);

                    // ĐỌC RADIUS TỪ JSON (Mặc định là 0.0 nếu không có)
                    double laneRadius = 0.0;
                    if (lane.containsKey("radius")) {
                        laneRadius = Double.parseDouble(String.valueOf(lane.get("radius")));
                    }

                    // Đường 2 chiều thì chiều đi (A->B) radius giữ nguyên,
                    // nhưng chiều về (B->A) robot chạy ngược lại nên RẼ TRÁI sẽ thành RẼ PHẢI.
                    // Do đó, chiều về phải nhân radius với -1.
                    nodeA.neighbors.add(new GraphEdge(nodeB, dist, laneRadius));
                    nodeB.neighbors.add(new GraphEdge(nodeA, dist, -laneRadius));
                }
            }
        }
    }


    // 3. THUẬT TOÁN A* (A-STAR)
    public List<GraphNode> findPathAStar(String startNodeId, String endNodeId) {
        GraphNode start = graph.get(startNodeId);
        GraphNode end = graph.get(endNodeId);

        if (start == null || end == null) return new ArrayList<>();

        // PriorityQueue lưu các node cần duyệt, sắp xếp theo f_score
        PriorityQueue<NodeWrapper> openSet = new PriorityQueue<>(Comparator.comparingDouble(n -> n.fScore));
        Map<String, Double> gScore = new HashMap<>();
        Map<String, GraphNode> cameFrom = new HashMap<>(); // Để truy vết đường đi

        // Init khoảng cách ban đầu là vô cực
        for (String id : graph.keySet()) gScore.put(id, Double.MAX_VALUE);
        gScore.put(start.id, 0.0);

        openSet.add(new NodeWrapper(start, 0.0, calculateDistance(start.x, start.y, end.x, end.y)));

        while (!openSet.isEmpty()) {
            NodeWrapper currentWrapper = openSet.poll();
            GraphNode current = currentWrapper.node;

            // Nếu đã đến đích -> Truy vết lại đường đi
            if (current.id.equals(end.id)) {
                return reconstructPath(cameFrom, current);
            }

            for (GraphEdge edge : current.neighbors) {
                GraphNode neighbor = edge.target;
                double tentativeGScore = gScore.get(current.id) + edge.weight;

                if (tentativeGScore < gScore.get(neighbor.id)) {
                    cameFrom.put(neighbor.id, current);
                    gScore.put(neighbor.id, tentativeGScore);
                    double fScore = tentativeGScore + calculateDistance(neighbor.x, neighbor.y, end.x, end.y);

                    openSet.add(new NodeWrapper(neighbor, tentativeGScore, fScore));
                }
            }
        }

        System.out.println("⚠️ Không tìm thấy đường từ Node " + startNodeId + " đến Node " + endNodeId);
        return new ArrayList<>(); // Không tìm thấy đường
    }

    // --- HELPER ---
    private List<GraphNode> reconstructPath(Map<String, GraphNode> cameFrom, GraphNode current) {
        List<GraphNode> totalPath = new ArrayList<>();
        totalPath.add(current);
        while (cameFrom.containsKey(current.id)) {
            current = cameFrom.get(current.id);
            totalPath.add(0, current); // Thêm vào đầu danh sách (để list theo thứ tự Start -> End)
        }
        return totalPath;
    }

    private double calculateDistance(double x1, double y1, double x2, double y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    // Class phụ hỗ trợ thuật toán A*
    private static class NodeWrapper {
        GraphNode node;
        double gScore;
        double fScore;

        public NodeWrapper(GraphNode node, double gScore, double fScore) {
            this.node = node;
            this.gScore = gScore;
            this.fScore = fScore;
        }
    }

    public boolean isMapLoaded() {
        // Nếu graph đang trống, thử gọi hàm buildGraph() để lấy dữ liệu từ Controller sang
        if (graph == null || graph.isEmpty()) {
            buildGraph();
        }

        // Kiểm tra lại lần nữa sau khi đã thử build
        return graph != null && !graph.isEmpty();
    }

    public List<GraphNode> findKNearestNodes(double x, double y, int k) {
        if (graph.isEmpty()) buildGraph();

        // Dùng PriorityQueue để sắp xếp khoảng cách từ gần đến xa
        PriorityQueue<GraphNode> pq = new PriorityQueue<>(
                Comparator.comparingDouble(n -> calculateDistance(x, y, n.x, n.y))
        );
        pq.addAll(graph.values());

        List<GraphNode> result = new ArrayList<>();
        for (int i = 0; i < k && !pq.isEmpty(); i++) {
            result.add(pq.poll());
        }
        return result;
    }

    // 2. Tính tổng chiều dài của một lộ trình các Node dựa trên trọng số cạnh (Đường thực tế)
    private double calculatePathWeight(List<GraphNode> path) {
        if (path == null || path.size() < 2) return 0.0;
        double length = 0;
        for (int i = 0; i < path.size() - 1; i++) {
            GraphNode curr = path.get(i);
            GraphNode next = path.get(i+1);
            boolean edgeFound = false;
            for (GraphEdge edge : curr.neighbors) {
                if (edge.target.id.equals(next.id)) {
                    length += edge.weight;
                    edgeFound = true;
                    break;
                }
            }
            // Fallback nếu đồ thị lỗi không có cạnh nối
            if (!edgeFound) {
                length += calculateDistance(curr.x, curr.y, next.x, next.y);
            }
        }
        return length;
    }

    // 3. THUẬT TOÁN TỐI ƯU CHÍNH: Tìm đường ngắn nhất dựa trên tổ hợp các Node xung quanh
    public List<GraphNode> findOptimalPath(double startX, double startY, double endX, double endY) {
        // Lấy 3 Node gần Robot nhất và 3 Node gần Đích nhất
        List<GraphNode> startCandidates = findKNearestNodes(startX, startY, 3);
        List<GraphNode> endCandidates = findKNearestNodes(endX, endY, 3);

        List<GraphNode> bestPath = new ArrayList<>();
        double minTotalCost = Double.MAX_VALUE;

        // Duyệt qua tất cả các tổ hợp (StartNode -> EndNode)
        for (GraphNode sNode : startCandidates) {
            for (GraphNode eNode : endCandidates) {

                List<GraphNode> currentPath;
                if (sNode.id.equals(eNode.id)) {
                    currentPath = new ArrayList<>();
                    currentPath.add(sNode); // Nếu Start và End trùng nhau
                } else {
                    currentPath = findPathAStar(sNode.id, eNode.id);
                }

                if (!currentPath.isEmpty()) {
                    // TỔNG CHI PHÍ = (Robot -> StartNode) + (A* Path) + (EndNode -> Target)
                    double distToStart = calculateDistance(startX, startY, sNode.x, sNode.y);
                    double pathCost = calculatePathWeight(currentPath);
                    double distToEnd = calculateDistance(eNode.x, eNode.y, endX, endY);

                    double totalCost = distToStart + pathCost + distToEnd;

                    // Cập nhật đường đi ngắn nhất
                    if (totalCost < minTotalCost) {
                        minTotalCost = totalCost;
                        bestPath = currentPath;
                    }
                }
            }
        }

        return bestPath;
    }
}