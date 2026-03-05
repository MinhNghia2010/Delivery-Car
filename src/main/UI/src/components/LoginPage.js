import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/LoginPage.css";
import { API_LOGIN } from "../api";

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="icon" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
    <path
      fillRule="evenodd"
      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
      clipRule="evenodd"
    />
  </svg>
);

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="icon" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
    <path
      fillRule="evenodd"
      d="M.664 10.59a1.651 1.651 0 010-1.18l.88-1.472a1.651 1.651 0 012.86-.379L5.21 8.53a8.128 8.128 0 00-1.77.296.5.5 0 00-.25.886l-.02.035a11.455 11.455 0 00-1.522 2.192.5.5 0 01-.866-.513l.22-1.32a.5.5 0 00-.416-.583A11.54 11.54 0 00.664 10.59zM10 3a7 7 0 00-7 7c0 .59.08 1.157.233 1.693l.22-1.32a.5.5 0 00-.416-.583A11.54 11.54 0 00.664 10.59a1.651 1.651 0 010-1.18l.88-1.472A1.651 1.651 0 014.21 6.14l1.522 2.537a.5.5 0 00.866-.514L6.39 6.28A7.002 7.002 0 0010 3zm4.79 4.53a.5.5 0 00-.866.514l.22 1.32a.5.5 0 00.416.583 11.54 11.54 0 012.493 1.403 1.651 1.651 0 010 1.18l-.88 1.472a1.651 1.651 0 01-2.86.379l-1.522-2.537a.5.5 0 00-.866.514l1.522 2.537a1.651 1.651 0 01-2.86.379l-.88-1.472a1.651 1.651 0 010-1.18 11.455 11.455 0 011.522-2.192.5.5 0 00.25-.886l.02-.035a8.128 8.128 0 001.77-.296l.808-.476a.5.5 0 00.25-.886l-1.522-2.537a1.651 1.651 0 012.86-.379l.88 1.472z"
      clipRule="evenodd"
    />
  </svg>
);

const LoadingPopup = () => (
  <div className="loading-popup-overlay">
    <div className="loading-popup-content">
      <div className="spinner"></div>
      <p className="loading-text">Loading Main Page...</p>
    </div>
  </div>
);

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const slides = ["/img/imgCar1.jpg", "/img/imgCar2.jpg", "/img/imgCar3.jpg", "/img/imgCar4.jpg", "/img/imgCar5.jpg"];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 1. Gửi User/Pass xuống Backend
      const response = await axios.post(API_LOGIN, {
        username,
        password,
      });

      if (response.status === 200) {
        console.log("Login Success:", response.data);

        // 2. Lưu thông tin Backend trả về (Role từ MongoDB)
        localStorage.setItem("currentUser", response.data.username);
        localStorage.setItem("userRole", response.data.role); // Role chuẩn từ DB

        // 3. Chuyển hướng vào trang chính
        setTimeout(() => {
          navigate("/app");
        }, 1000);
      }
    } catch (err) {
      console.error("Login Failed:", err);
      // Hiển thị lỗi từ backend hoặc lỗi mặc định
      setError(err.response?.data || "Sai tên đăng nhập hoặc mật khẩu!");
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="image-column">
          <img src="/img/viettelpost-logo.png" alt="Viettel Post Logo" className="logo-on-image" />

          <div className="description-text">
            <div>
              <p
                style={{
                  fontFamily: "Poppins",
                  fontSize: "35px",
                  fontWeight: "bold",
                }}
              >
                Welcome to Delivery Car Control System
              </p>
            </div>

            <p className="long-text">
              We’ve built a smart delivery car that drives itself and delivers goods right where they’re needed. Using AI, GPS, and smart sensors, it handles
              short-distance deliveries in urban areas — faster, safer, and without the need for a driver.
            </p>
          </div>

          {slides.map((slide, index) => (
            <div key={index} className={`slide ${index === currentSlide ? "active" : ""}`} style={{ backgroundImage: `url(${slide})` }}></div>
          ))}
        </div>
        <div className="form-column">
          <div className="main-title-container">
            <h1 className="main-title-text">Delivery Car Control System</h1>
          </div>

          <div className="form-content-wrapper">
            {/* 👇 THÊM DIV BAO BỌC VỚI CLASS MỚI TẠI ĐÂY 👇 */}
            <div className="login-box">
              <div className="form-header">
                <h1 className="title">Login</h1>
              </div>
              <form onSubmit={handleSubmit} className="login-form">
                <div className="input-group">
                  <input
                    type="text"
                    id="username"
                    name="username"
                    placeholder="Username"
                    autoComplete="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle-btn">
                    {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                  </button>
                </div>

                {error && <p className="error-message">{error}</p>}

                <div className="input-group">
                  <button type="submit" className="submit-btn" disabled={isLoading}>
                    Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      {isLoading && <LoadingPopup />}
    </div>
  );
}
