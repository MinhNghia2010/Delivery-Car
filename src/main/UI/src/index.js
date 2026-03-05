// import React from "react";
// import ReactDOM from "react-dom/client";
// import "./index.css";
// import App from "./App";
// import reportWebVitals from "./reportWebVitals";
// import "bootstrap/dist/css/bootstrap.min.css";
// import "./App.css";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// // ❌ KHÔNG CẦN import LoginPage hay RobotMap ở đây

// // ✅ BƯỚC 2: GIẢ LẬP ĐĂNG NHẬP (QUAN TRỌNG)
// // Thêm 2 dòng này để App.js nghĩ rằng "ADMIN" đã đăng nhập
// localStorage.setItem("currentUser", "dev_user");
// localStorage.setItem("userRole", "ADMIN");

// const root = ReactDOM.createRoot(document.getElementById("root"));
// root.render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <Routes>
//         {/* ✅ CHỈ CẦN DÒNG NÀY: */}
//         {/* Route "/" sẽ render App.js, và App.js sẽ tự render RobotMap */}
//         <Route path="/" element={<App />} />

//         {/* ❌ XÓA CÁC DÒNG CŨ */}
//         {/* <Route path="/" element={<LoginPage />} /> */}
//         {/* <Route path="/" element={<RobotMap />} /> */}
//         {/* <Route path="/app" element={<App />} /> */}
//       </Routes>
//     </BrowserRouter>
//   </React.StrictMode>
// );

// reportWebVitals();


import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import LoginPage from "./components/LoginPage"; // Import trang Login
import reportWebVitals from "./reportWebVitals";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ❌ XÓA CÁC DÒNG localStorage.setItem("currentUser"...) CŨ ĐI
// Để hệ thống sạch sẽ khi mới vào

const root = ReactDOM.createRoot(document.getElementById("root"));

// Hàm kiểm tra bảo vệ (Nếu chưa đăng nhập thì đá về Login)
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem("currentUser");
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

root.render(
  // <React.StrictMode> // Có thể bỏ StrictMode nếu bị render 2 lần khó chịu
    <BrowserRouter>
      <Routes>
        {/* Route 1: Trang chủ mặc định là LOGIN */}
        <Route path="/" element={<LoginPage />} />

        {/* Route 2: Trang chính APP (Được bảo vệ) */}
        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  // </React.StrictMode>
);

reportWebVitals();
