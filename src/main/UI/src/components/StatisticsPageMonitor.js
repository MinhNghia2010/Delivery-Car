import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import "../css/StatisticsPageMonitor.css";

// Đăng ký các thành phần cần thiết cho ChartJS
ChartJS.register(ArcElement, Tooltip, Legend);

// --- Dữ liệu giả cho các biểu đồ ---
// Dữ liệu cho biểu đồ "Today"
const todayData = {
  labels: ["Completed", "In Progress", "Not Started", "Failed", "Cancelled"],
  datasets: [
    {
      label: "Tasks Today",
      data: [5, 2, 3, 1, 1], // Dữ liệu giả: 5 hoàn thành, 2 đang làm...
      backgroundColor: [
        "#36A2EB", // Completed (xanh dương)
        "#FFCE56", // In Progress (vàng)
        "#A162F7", // Not Started (tím)
        "#FF6384", // Failed (đỏ)
        "#C9CBCF", // Cancelled (xám)
      ],
      borderColor: "#FFF",
      borderWidth: 2,
      cutout: "70%", // Điều chỉnh độ dày của biểu đồ tròn
    },
  ],
};

// Dữ liệu cho "Last 7 Days"
const last7DaysData = {
  labels: ["Completed", "Other"],
  datasets: [
    {
      data: [78, 22], // Giả sử tỉ lệ hoàn thành là 78%
      backgroundColor: ["#36A2EB", "#E0E0E0"],
      borderColor: "#FFF",
      borderWidth: 2,
      cutout: "80%",
    },
  ],
};

// Dữ liệu cho "Last 30 Days"
const last30DaysData = {
  labels: ["Completed", "Other"],
  datasets: [
    {
      data: [85, 15], // Giả sử tỉ lệ hoàn thành là 85%
      backgroundColor: ["#36A2EB", "#E0E0E0"],
      borderColor: "#FFF",
      borderWidth: 2,
      cutout: "80%",
    },
  ],
};

// Tùy chọn để ẩn các tooltip và legend mặc định của biểu đồ
const chartOptions = {
  plugins: {
    tooltip: {
      enabled: true, // Bật/tắt tooltip khi hover
    },
    legend: {
      display: false,
    },
  },
  maintainAspectRatio: false,
};

const StatisticsPage = () => {
  const totalTasksToday = todayData.datasets[0].data.reduce((a, b) => a + b, 0);

  return (
    <div className="monitor-statistics-container">
      {/* KHỐI "TODAY" */}
      <div className="monitor-stat-section">
        <h3 className="monitor-stat-title">Today</h3>
        <div className="monitor-today-chart-wrapper">
          <div className="monitor-chart-container">
            <Doughnut data={todayData} options={chartOptions} />
            <div className="monitor-chart-center-text">
              <span className="monitor-total-number">{totalTasksToday}</span>
              <span className="monitor-total-label">Total</span>
            </div>
          </div>
          <div className="monitor-legend-container">
            <div className="monitor-legend-item">
              <span className="monitor-legend-color-box blue"></span>Completed 50% | 5
            </div>
            <div className="monitor-legend-item">
              <span className="monitor-legend-color-box purple"></span>Not Started 30% | 3
            </div>
            <div className="monitor-legend-item">
              <span className="monitor-legend-color-box gray"></span>Cancelled 10% | 1
            </div>
            <div className="monitor-legend-item">
              <span className="monitor-legend-color-box yellow"></span>In Progress 20% | 2
            </div>
            <div className="monitor-legend-item">
              <span className="monitor-legend-color-box red"></span>Failed 10% | 1
            </div>
          </div>
        </div>
      </div>

      <div className="monitor-stat-section">
        <h3 className="monitor-stat-title">Task Completion Rate</h3>
        <div className="monitor-completion-rate-wrapper">
          <div className="monitor-rate-chart-container">
            <h4 className="monitor-rate-title">Last 7 Days</h4>
            <div className="monitor-chart-container small-chart">
              <Doughnut data={last7DaysData} options={chartOptions} />
              <div className="monitor-chart-center-text small">
                <span className="monitor-total-number">{last7DaysData.datasets[0].data[0]}%</span>
              </div>
            </div>
            <div className="monitor-rate-legend">
              <p>
                <span className="monitor-legend-color-box blue"></span> Completed <strong>78</strong>
              </p>
              <p>
                <span className="monitor-legend-color-box gray"></span> Total <strong>100</strong>
              </p>
            </div>
          </div>
          <div className="monitor-rate-chart-container">
            <h4 className="monitor-rate-title">Last 30 Days</h4>
            <div className="monitor-chart-container small-chart">
              <Doughnut data={last30DaysData} options={chartOptions} />
              <div className="monitor-chart-center-text small">
                <span className="monitor-total-number">{last30DaysData.datasets[0].data[0]}%</span>
              </div>
            </div>
            <div className="monitor-rate-legend">
              <p>
                <span className="monitor-legend-color-box blue"></span> Completed <strong>255</strong>
              </p>
              <p>
                <span className="monitor-legend-color-box gray"></span> Total <strong>300</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
