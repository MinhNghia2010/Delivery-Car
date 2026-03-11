import React, { useState, useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { Toast } from "react-bootstrap";
import "../css/PageMission.css";
import { API_ORDERS_ACTIVE, API_ORDERS_HISTORY, API_ORDER_COMPLETE, WS_URL } from "../api";

export default function OrderPage() {
  const [activeOrders, setActiveOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ACTIVE");

  // Toast state
  const [toasts, setToasts] = useState([]);
  // Refs for toast diffing — a Set/Map that only grows, never resets
  const knownIdsRef = useRef(new Set());       // all order IDs ever seen
  const knownStatusesRef = useRef(new Map());  // id → last known status

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // State 4 ô lọc
  const [filterDate, setFilterDate] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterCompartment, setFilterCompartment] = useState("");
  const [filterOrderCode, setFilterOrderCode] = useState("");

  const stompClientRef = useRef(null);

  // 1. Fetch Đơn Active — silently sync state + seed known IDs (no toast)
  const fetchActiveOrders = async () => {
    try {
      const res = await fetch(API_ORDERS_ACTIVE);
      if (res.ok) {
        const latest = await res.json();
        // Seed the known set so existing orders are never treated as "new"
        latest.forEach((o) => {
          knownIdsRef.current.add(o.id);
          knownStatusesRef.current.set(o.id, o.status);
        });
        setActiveOrders(latest);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Fetch Lịch Sử (Gọi API có tham số)
  // Lưu ý: Không dùng setIsLoading(true) ở đây để tránh nháy màn hình liên tục khi gõ
  const fetchHistoryOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDate) params.append("date", filterDate);
      if (filterName) params.append("name", filterName);
      if (filterPhone) params.append("phone", filterPhone);
      if (filterCompartment) params.append("compartment", filterCompartment);
      if (filterOrderCode) params.append("orderCode", filterOrderCode);

      const res = await fetch(`${API_ORDERS_HISTORY}?${params.toString()}`);
      if (res.ok) {
        setHistoryOrders(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    if (!window.confirm("Xác nhận hoàn thành đơn này?")) return;
    try {
      await fetch(API_ORDER_COMPLETE(orderId), { method: "POST" });
      showToast("✅ Đơn hàng đã hoàn thành!", "success");
      fetchActiveOrders();
      if (activeTab === "HISTORY") fetchHistoryOrders();
    } catch (e) {
      showToast("❌ Lỗi kết nối server!", "danger");
    }
  };

  // Toast diff — only called from WS handler, uses the ever-growing Sets
  const diffAndToast = (latest) => {
    // Skip if we haven't seeded known IDs yet
    if (knownIdsRef.current.size === 0) return;
    latest.forEach((order) => {
      if (!knownIdsRef.current.has(order.id)) {
        // Genuinely new order
        showToast(`📦 Đơn mới: ${order.orderCode || order.fullName || order.id}`, "info");
      } else if (knownStatusesRef.current.get(order.id) !== order.status) {
        // Status changed
        showToast(`🔄 Đơn ${order.orderCode || order.id}: ${knownStatusesRef.current.get(order.id)} → ${order.status}`, "warning");
      }
      // Always update known status
      knownIdsRef.current.add(order.id);
      knownStatusesRef.current.set(order.id, order.status);
    });
  };

  // --- 🔥 LOGIC TỰ ĐỘNG LỌC (AUTO FILTER) ---
  useEffect(() => {
    // Chỉ tự động gọi API nếu đang ở Tab HISTORY
    if (activeTab === "HISTORY") {
      // Kỹ thuật Debounce: Chờ 500ms sau khi ngừng gõ mới gọi API
      const timer = setTimeout(() => {
        fetchHistoryOrders();
      }, 500);
      return () => clearTimeout(timer); // Xóa timer nếu gõ tiếp
    }
    // Nếu ở Tab ACTIVE: React tự render lại theo state, không cần gọi API
  }, [filterDate, filterName, filterPhone, filterCompartment, activeTab, filterOrderCode]);

  useEffect(() => {
    // 1. Gọi dữ liệu ngay khi vào trang
    fetchActiveOrders();
    fetchHistoryOrders();

    const intervalId = setInterval(() => {
      fetchActiveOrders();
      if (activeTab === "HISTORY") {
        // Lưu ý: Nếu lịch sử quá nặng thì không nên auto-fetch cái này liên tục
      }
    }, 2000); // 2000ms = 2 giây

    // 3. Kết nối WebSocket (Realtime ưu tiên)
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      onConnect: () => {
        console.log("WebSocket Connected");
        // Lắng nghe mọi thay đổi danh sách đơn đang xử lý
        client.subscribe("/topic/orders", (msg) => {
          const latestOrders = JSON.parse(msg.body);
          console.log("📦 [WS] Cập nhật danh sách đơn:", latestOrders);
          diffAndToast(latestOrders);   // only WS triggers toast
          setActiveOrders(latestOrders);
        });
      },
    });
    client.activate();

    // 4. Dọn dẹp (Clear Interval) khi thoát trang để tránh tràn bộ nhớ
    return () => {
      clearInterval(intervalId); // 👈 Quan trọng: Dừng bộ đếm 2s
      if (client.active) client.deactivate();
    };
  }, [activeTab]); // Thêm activeTab vào dependency để React biết khi nào đổi tab

  const formatDateTime = (str) => {
    if (!str) return "--";
    return new Date(str).toLocaleString("vi-VN");
  };

  return (
    <div className="order-page-layout">

      {/* ── TOAST STACK ── */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map((t) => (
          <Toast
            key={t.id}
            show
            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            delay={4000}
            autohide
            style={{ minWidth: 280 }}
          >
            <Toast.Header className={
              t.type === "success" ? "bg-success text-white" :
              t.type === "danger"  ? "bg-danger text-white"  :
              t.type === "warning" ? "bg-warning text-dark"  :
              "bg-primary text-white"
            }>
              <strong className="me-auto">
                {t.type === "success" ? "✅ Thành công" :
                 t.type === "danger"  ? "❌ Lỗi" :
                 t.type === "warning" ? "🔄 Cập nhật" :
                 "📦 Đơn hàng"}
              </strong>
            </Toast.Header>
            <Toast.Body>{t.message}</Toast.Body>
          </Toast>
        ))}
      </div>

      <div className="panel-container list-panel" style={{ width: "100%" }}>
        <div className="list-header-wrapper">
          <div className="list-header-top">
            <h2 className="panel-title">{activeTab === "ACTIVE" ? "📦 Đơn Hàng Đang Xử Lý" : "✅ Lịch Sử Đơn Hàng"}</h2>
            <div className="tab-navigation">
              <button className={`tab-btn ${activeTab === "ACTIVE" ? "active" : ""}`} onClick={() => setActiveTab("ACTIVE")}>
                Đang Xử Lý <span className="count-badge yellow">{activeOrders.length}</span>
              </button>
              <button className={`tab-btn ${activeTab === "HISTORY" ? "active" : ""}`} onClick={() => setActiveTab("HISTORY")}>
                Lịch Sử <span className="count-badge green">{historyOrders.length}</span>
              </button>
            </div>
          </div>

          <div className="filter-section">
            <div className="advanced-filter-bar">
              <div className="filter-group">
                <label>📅 Thời gian tạo:</label>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              </div>
              <div className="filter-group">
                <label>🔖 Mã Đơn:</label>
                <input
                  type="text"
                  placeholder="Mã..."
                  value={filterOrderCode}
                  onChange={(e) => setFilterOrderCode(e.target.value)}
                  style={{ width: "100px" }}
                />
              </div>
              <div className="filter-group">
                <label>👤 Tên khách:</label>
                <input type="text" placeholder="Nhập tên..." value={filterName} onChange={(e) => setFilterName(e.target.value)} />
              </div>
              <div className="filter-group">
                <label>📞 SĐT:</label>
                <input type="text" placeholder="Nhập SĐT..." value={filterPhone} onChange={(e) => setFilterPhone(e.target.value)} />
              </div>
              <div className="filter-group">
                <label>🗄️ Ngăn tủ:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: A-01"
                  value={filterCompartment}
                  onChange={(e) => setFilterCompartment(e.target.value)}
                  style={{ width: "100px" }}
                />
              </div>

              {/* 🔥 ĐÃ XÓA NÚT TÌM KIẾM, CHỈ CÒN NÚT XÓA */}
              <button
                className="btn-clear-filter"
                onClick={() => {
                  setFilterDate("");
                  setFilterName("");
                  setFilterPhone("");
                  setFilterCompartment("");
                  setFilterOrderCode("");
                }}
              >
                ❌ Xóa
              </button>
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
            </div>
          ) : (
            <table className="order-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã Đơn</th>
                  <th>Thời Gian Tạo Đơn</th>
                  <th>Tên Khách</th>
                  <th>SĐT</th>
                  <th style={{ textAlign: "center" }}>Ngăn Tủ</th>
                  <th>Địa Chỉ</th>
                  <th>Ghi Chú</th>
                  <th style={{ textAlign: "center" }}>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === "ACTIVE" ? activeOrders : historyOrders)
                  .filter((item) => {
                    // 🔥 LOGIC LỌC TẠI CHỖ CHO TAB ACTIVE
                    if (activeTab === "ACTIVE") {
                      if (filterDate && !item.createdTime?.startsWith(filterDate)) return false;
                      if (filterName && !item.fullName?.toLowerCase().includes(filterName.toLowerCase())) return false;
                      if (filterPhone && !item.phone?.includes(filterPhone)) return false;
                      if (filterCompartment && !item.compartment?.toLowerCase().includes(filterCompartment.toLowerCase())) return false;
                      if (filterOrderCode && !item.orderCode?.toLowerCase().includes(filterOrderCode.toLowerCase())) return false;
                    }
                    // Tab History đã được lọc từ Server nên luôn return true
                    return true;
                  })
                  .map((order, index) => (
                    <tr key={order.id || index}>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: "bold",
                          color: "#888",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td
                        style={{
                          fontWeight: "bold",
                          color: "#2b6cb0",
                          fontFamily: "monospace",
                        }}
                      >
                        {order.orderCode || "--"}
                      </td>
                      <td className="col-time">
                        {formatDateTime(order.createdTime)}
                        {activeTab === "HISTORY" && <div style={{ fontSize: "10px", color: "green" }}>Xong: {formatDateTime(order.completedTime)}</div>}
                      </td>
                      <td className="col-name">
                        <div className="avatar-placeholder">{order.fullName?.charAt(0)}</div>
                        {order.fullName}
                      </td>
                      <td className="col-phone">{order.phone}</td>
                      <td style={{ textAlign: "center" }}>{order.compartment ? <span className="badge-compartment">{order.compartment}</span> : "--"}</td>
                      <td className="col-address">{order.address}</td>
                      <td className="col-note">{order.note}</td>
                      <td style={{ textAlign: "center" }}>
                        {activeTab === "ACTIVE" ? (
                          <button className="status-btn pending" onClick={() => handleCompleteOrder(order.id)}>
                            ⏳ Hoàn thành ngay
                          </button>
                        ) : (
                          <span className="status-label completed">✅ Thành công</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
          {!isLoading && (activeTab === "ACTIVE" ? activeOrders : historyOrders).length === 0 && (
            <div className="empty-state">📭 Không tìm thấy dữ liệu phù hợp</div>
          )}
        </div>
      </div>
    </div>
  );
}
