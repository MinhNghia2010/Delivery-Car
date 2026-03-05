import React, { useState, useEffect, useRef } from "react";
import "../css/StreamVideoCar.css";
import HlsPlayer from "./HlsPlayer";
import RobotStatusStreamer from "./RobotStatusStreamer";

const StreamVideoCar = ({ vehicleId, onClose }) => {
  console.log("StreamVideoCar đã nhận được vehicleId:", vehicleId);
  const [streams, setStreams] = useState({
    wsFlvLookAroundUrl: null,
    wsFlvPushbackUrl: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // useEffect này đã được cải tiến để xử lý cleanup tốt hơn
  useEffect(() => {
    // AbortController giúp hủy yêu cầu fetch nếu component bị unmount
    if (!vehicleId) {
      setLoading(false);
      setError("Please select a robot from the map to view the stream.");
      return; // Dừng lại, không làm gì cả nếu chưa có ID
    }
    const controller = new AbortController();
    const signal = controller.signal;

    const startStreams = async () => {
      setLoading(true);
      setError(null);
      setStreams({ wsFlvLookAroundUrl: null, wsFlvPushbackUrl: null });

      try {
        const response = await fetch("/api/video/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicleId }),
          signal, // Gắn signal vào yêu cầu fetch
        });

        if (!response.ok) {
          throw new Error("Lỗi mạng hoặc server backend không phản hồi");
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // Chỉ cập nhật state nếu component vẫn còn tồn tại
        if (!signal.aborted) {
          setStreams({
            wsFlvLookAroundUrl: data.wsFlvLookAroundUrl,
            wsFlvPushbackUrl: data.wsFlvPushbackUrl,
          });
        }
      } catch (err) {
        // Bỏ qua lỗi AbortError vì đó là do chúng ta chủ động hủy
        if (err.name !== "AbortError") {
          setError(`Không thể bắt đầu luồng: ${err.message}`);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    startStreams();

    // --- Hàm cleanup ---
    // Sẽ được gọi khi component unmount (ví dụ: khi người dùng chuyển tab)
    return () => {
      console.log("StreamVideoCar unmounting, stopping streams...");
      // Hủy yêu cầu fetch nếu nó vẫn đang chạy
      controller.abort();

      // Gọi API để báo cho server dừng các luồng video lại
      // Điều này rất quan trọng để tiết kiệm tài nguyên server
      fetch("/api/video/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
        keepalive: true, // Giúp yêu cầu có khả năng được gửi ngay cả khi trang đang đóng
      });
    };
  }, [vehicleId]); // Effect này sẽ chạy lại khi vehicleId thay đổi

  // Component con để render từng khung video (giữ nguyên)
  const VideoFrame = ({ streamUrl, isLoading, isPlaceholder = false }) => {
    return (
      <div className="video-wrapper">
        <div className="video-content-area">
          {isPlaceholder ? (
            <div className="status-text">Trống</div>
          ) : isLoading ? (
            <div className="status-text">⏳ Đang tải...</div>
          ) : streamUrl ? (
            <HlsPlayer url={streamUrl} />
          ) : (
            <div className="status-text error">Không có tín hiệu</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="stream-container">
      <div>
        <button className="btn-backApp" onClick={onClose}>
          Back
        </button>
      </div>
      <div className="main-layout">
        <div className="top-row">
          <VideoFrame streamUrl={streams.wsFlvLookAroundUrl} isLoading={loading} />
        </div>
        <div className="bottom-row">
          <VideoFrame streamUrl={streams.wsFlvPushbackUrl} isLoading={loading} />
          <div className="video-wrapper">
            <RobotStatusStreamer />
          </div>
          <VideoFrame isLoading={false} isPlaceholder={true} />
        </div>
      </div>
    </div>
  );
};

export default React.memo(StreamVideoCar);
