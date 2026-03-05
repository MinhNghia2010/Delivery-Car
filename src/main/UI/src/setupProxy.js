const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/ws', // Chỉ proxy các đường dẫn /ws
    createProxyMiddleware({
      target: 'http://localhost:8081', // Trỏ đúng cổng 8081
      changeOrigin: true,
      ws: true, // Bật hỗ trợ WebSocket
    })
  );

  // Bạn cũng nên proxy cả các API (nếu có)
  app.use(
    '/api', 
    createProxyMiddleware({
      target: 'http://localhost:8081',
      changeOrigin: true,
    })
  );
};