import React, { useState, useEffect, useRef, useCallback } from "react";
import Chart from "chart.js/auto";
import axios from "axios";
import "../css/StatisticsPage.css";

const formatHourDay = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatWeek = (date) => {
  const year = date.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToAdd = Math.floor((date - firstDayOfYear) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((daysToAdd + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
};

const formatMonthYear = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};

const getHourArray = (startDate, endDate) => {
  const hours = [];
  let tempDate = new Date(startDate);
  while (tempDate <= endDate) {
    hours.push(tempDate.getHours());
    tempDate.setHours(tempDate.getHours() + 1);
  }
  return hours;
};

const getDayMonthArray = (startDate, endDate) => {
  const days = [];
  let tempDate = new Date(startDate);
  while (tempDate <= endDate) {
    days.push(formatDate(tempDate));
    tempDate.setDate(tempDate.getDate() + 1);
  }
  return days;
};

const getWeekYearArray = (startDate, endDate) => {
  const weeks = [];
  let tempDate = new Date(startDate);
  if (typeof startDate === "string" && startDate.includes("-W")) {
    tempDate = getDateFromWeekString(startDate);
  }
  const endTemp = typeof endDate === "string" && endDate.includes("-W") ? getDateFromWeekString(endDate) : new Date(endDate);

  while (tempDate <= endTemp) {
    weeks.push(formatWeek(tempDate));
    tempDate.setDate(tempDate.getDate() + 7);
  }
  return [...new Set(weeks)];
};

const getMonthYearArray = (startDate, endDate) => {
  const months = [];
  let tempDate = new Date(startDate.substring(0, 7) + "-02");
  let endTemp = new Date(endDate.substring(0, 7) + "-02");

  while (tempDate <= endTemp) {
    months.push(formatMonthYear(tempDate));
    tempDate.setMonth(tempDate.getMonth() + 1);
  }
  return [...new Set(months)];
};

const getDateFromWeekString = (weekString) => {
  const [year, week] = weekString.split("-W").map(Number);
  const d = new Date(year, 0, 1 + (week - 1) * 7);
  if (d.getDay() > 4) {
    d.setDate(d.getDate() + (1 - d.getDay()));
  } else {
    d.setDate(d.getDate() + (1 - d.getDay()));
  }
  return d;
};

export default function StatisticsPage() {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [activeButton, setActiveButton] = useState("Day");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contentPage, setContentPage] = useState("Task Throughput");
  const [activeMenuItem, setActiveMenuItem] = useState("Task Throughput");

  const menuItems = ["Task Throughput", "Device Usage", "Charging Statistic", "Task DU Statistic", "Device Efficacy"];

  const drawChart = useCallback((labels, chartTitleX, chartType) => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const chartData = {
      labels,
      datasets: [
        {
          label: "Sum",
          data: [12, 19, 10, 15, 20, 5, 25, 12, 19, 10, 15, 20, 5, 25],
          backgroundColor: "#7d7ffa",
        },
        {
          label: "Task Success Amount",
          data: [10, 14, 12, 18, 16, 4, 20, 10, 14, 12, 18, 16, 4, 20],
          backgroundColor: "#0075f6",
        },
        {
          label: "Task Cancellation Amount",
          data: [8, 12, 15, 10, 14, 3, 15, 8, 12, 15, 10, 14, 3, 15],
          backgroundColor: "#ffde21",
        },
        {
          label: "Task Failure Amount",
          data: [2, 1, 3, 5, 4, 1, 5, 2, 1, 3, 5, 4, 1, 5],
          backgroundColor: "#ff0100",
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        x: { stacked: true, title: { display: true, text: chartTitleX } },
        y: {
          stacked: true,
          title: { display: true, text: "Throughput (Unit)" },
        },
      },
    };

    const ctx = chartRef.current.getContext("2d");
    chartInstanceRef.current = new Chart(ctx, {
      type: chartType,
      data: chartData,
      options: chartOptions,
    });
  }, []);

  useEffect(() => {
    if (contentPage !== "Task Throughput") return;

    const now = new Date();
    let newStartDate, newEndDate;

    switch (activeButton) {
      case "Hour":
        newEndDate = formatHourDay(now);
        const past24Hours = new Date();
        past24Hours.setHours(now.getHours() - 24);
        newStartDate = formatHourDay(past24Hours);
        break;
      case "Day":
        newEndDate = formatDate(now);
        const past14Days = new Date();
        past14Days.setDate(now.getDate() - 14);
        newStartDate = formatDate(past14Days);
        break;
      case "Week":
        newEndDate = formatWeek(now);
        const past14Weeks = new Date();
        past14Weeks.setDate(now.getDate() - 14 * 7);
        newStartDate = formatWeek(past14Weeks);
        break;
      case "Month":
        newEndDate = formatMonthYear(now);
        const past12Months = new Date();
        past12Months.setMonth(now.getMonth() - 11);
        newStartDate = formatMonthYear(past12Months);
        break;
      default:
        break;
    }
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, [activeButton, contentPage]);

  useEffect(() => {
    if (contentPage !== "Task Throughput" || !startDate || !endDate || !chartRef.current) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    let newLabels;

    // Parse date an toàn hơn
    const start = activeButton === "Week" ? getDateFromWeekString(startDate) : new Date(startDate);
    const end = activeButton === "Week" ? getDateFromWeekString(endDate) : new Date(endDate);

    switch (activeButton) {
      case "Hour":
        newLabels = getHourArray(start, end);
        break;
      case "Day":
        newLabels = getDayMonthArray(start, end);
        break;
      case "Week":
        newLabels = getWeekYearArray(startDate, endDate);
        break;
      case "Month":
        newLabels = getMonthYearArray(startDate, endDate);
        break;
      default:
        newLabels = [];
    }

    drawChart(newLabels, activeButton, "bar");
  }, [startDate, endDate, activeButton, contentPage, drawChart]); // Theo dõi TẤT CẢ các state liên quan.

  const handleDateChange = () => {
    console.log("Applying new date range (handled by useEffect)");
  };
  return (
    <div className="statistics-container flex w-full h-full">
      <div className="sidebar">
        <ul className="menu">
          {menuItems.map((item) => (
            <li key={item} className={`menu-item ${activeMenuItem === item ? "active" : ""}`}>
              <a
                href="#"
                className="menu-link"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveMenuItem(item);
                  setContentPage(item);
                }}
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="content">
        {contentPage === "Task Throughput" && (
          <>
            <div className="toolbar-main">
              <div className="toolbar-group-top">
                <select className="px-4 py-2 rounded-md border-gray-300">
                  <option>Device No.</option>
                </select>
                <select className="px-4 py-2 rounded-md border-gray-300">
                  <option>Task Name</option>
                </select>
                <select className="px-4 py-2 rounded-md border-gray-300">
                  <option>Task Status</option>
                </select>
                <select className="px-4 py-2 rounded-md border-gray-300">
                  <option>Shift Group</option>
                </select>
                <select className="px-4 py-2 rounded-md border-gray-300">
                  <option>Shift</option>
                </select>
              </div>
              <div className="toolbar-group-bottom">
                <div className="toolbar-group">
                  <span className="font-semibold text-gray-700">For</span>
                  <input
                    type={activeButton === "Hour" ? "datetime-local" : activeButton === "Day" ? "date" : activeButton === "Week" ? "week" : "month"}
                    className="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className="font-semibold text-gray-700">To</span>
                  <input
                    type={activeButton === "Hour" ? "datetime-local" : activeButton === "Day" ? "date" : activeButton === "Week" ? "week" : "month"}
                    className="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="toolbar-group">
                  {["Hour", "Day", "Week", "Month"].map((btn) => (
                    <button
                      key={btn}
                      className={`${activeButton === btn ? "active" : ""} font-semibold`}
                      onClick={() => {
                        setActiveButton(btn);
                      }}
                    >
                      {btn}
                    </button>
                  ))}
                  <button
                    onClick={handleDateChange}
                    className="bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
            <div className="chart-container">
              <canvas id="stackedColumnChart" ref={chartRef}></canvas>
            </div>
          </>
        )}
        {contentPage !== "Task Throughput" && <h1>Welcome to {contentPage}</h1>}
      </div>
    </div>
  );
}
