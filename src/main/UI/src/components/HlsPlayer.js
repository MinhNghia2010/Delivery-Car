import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

const HlsPlayer = ({ url }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // ✅ BƯỚC 1: TẠO MỘT REF ĐỂ THEO DÕI TRẠNG THÁI MOUNT
  // useRef được dùng để giá trị của nó không thay đổi giữa các lần render
  const isMounted = useRef(false);

  useEffect(() => {
    // ✅ BƯỚC 2: ĐÁNH DẤU COMPONENT ĐÃ ĐƯỢC MOUNT
    isMounted.current = true;

    if (!url) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const videoElement = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 4,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
      });

      hls.loadSource(url);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // ✅ BƯỚC 3: KIỂM TRA COMPONENT CÓ CÒN TỒN TẠI KHÔNG TRƯỚC KHI PLAY
        if (isMounted.current) {
          console.log("Manifest parsed. Bắt đầu phát với chất lượng tự động.");
          videoElement.play().catch((e) => {
            // Chỉ log lỗi nếu không phải là AbortError do unmount
            if (e.name !== "AbortError") {
              console.error("Lỗi khi autoplay:", e);
            }
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error("Lỗi HLS nghiêm trọng:", data.type, data.details);
          // Logic khôi phục lỗi giữ nguyên
        }
      });

      hlsRef.current = hls;
    } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      videoElement.src = url;
      videoElement.addEventListener("loadedmetadata", () => {
        if (isMounted.current) {
          videoElement
            .play()
            .catch((e) => console.error("Autoplay bị chặn trên Safari:", e));
        }
      });
    }

    return () => {
      // ✅ BƯỚC 4: ĐÁNH DẤU COMPONENT ĐÃ BỊ UNMOUNT
      isMounted.current = false;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url]);

  return (
    <video
      ref={videoRef}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        background: "#000",
      }}
      controls={false}
      disablePictureInPicture
      controlsList="nodownload nofullscreen noremoteplayback"
      muted
      autoPlay
      playsInline
    />
  );
};

export default React.memo(HlsPlayer);
