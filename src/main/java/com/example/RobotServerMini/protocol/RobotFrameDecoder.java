package com.example.RobotServerMini.protocol;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Decoder bám sát giao thức C++ (ProtocolCodec):
 *
 * Layout gói:
 *  [0..25]  : header_without_crc (26B, <BBHIH16s>)
 *  [26..27] : header_crc (2B, LE)
 *  [28..29] : msg_type (2B)
 *  [30..? ] : JSON
 *  [...   ] : '\n'
 *  [...   ] : body_crc (2B, BE)
 *  [last]   : ETX = 0x03
 */
public class RobotFrameDecoder {

    private static final byte STX = 0x02;
    private static final byte DIR_V = 0x56;
    private static final byte ETX = 0x03;
    private static final int HEADER_SIZE = 26;      // <BBHIH16s>

    private final ObjectMapper mapper = new ObjectMapper();
    private final ByteArrayBuffer buffer = new ByteArrayBuffer();

    /**
     * Nạp thêm data nhận từ socket và trả về danh sách JSON message decode được.
     */
    public synchronized List<JsonNode> feed(byte[] data, int len) {
        if (len > 0) {
            buffer.write(data, 0, len);
        }
        List<JsonNode> out = new ArrayList<>();

        while (true) {
            byte[] buf = buffer.toByteArray();
            int size = buf.length;
            if (size < HEADER_SIZE + 1) {
                break; // chưa đủ header
            }

            // 1) Căn thẳng STX + DIR = 0x02 0x56
            int start = alignToHeader(buf);
            if (start > 0) {
                buffer.discardUpTo(start);
                continue;       // reload buf rồi xử lý tiếp
            }

            // Sau align, buffer[0] phải là STX, buffer[1] là DIR
            buf = buffer.toByteArray();
            size = buf.length;
            if (size < HEADER_SIZE + 1) {
                break;
            }

            // 2) Đọc length trong header (offset 4, 4 byte LE)
            ByteBuffer hbuf = ByteBuffer.wrap(buf, 0, HEADER_SIZE).order(ByteOrder.LITTLE_ENDIAN);
            byte stx = hbuf.get();
            byte dir = hbuf.get();
            hbuf.getShort();                // reserved
            int bodyLen = hbuf.getInt();    // length: MSG_TYPE + JSON + '\n'
            hbuf.getShort();                // version
            byte[] reserved = new byte[16];
            hbuf.get(reserved);

            if (stx != STX || dir != DIR_V) {
                // không đúng header, bỏ 1 byte và thử lại
                buffer.discardUpTo(1);
                continue;
            }

            // 3) Tính tổng số byte cần cho 1 frame đầy đủ
            // header_without_crc (26) + header_crc (2) + bodyLen + body_crc(2) + ETX(1)
            int totalNeeded = HEADER_SIZE + 2 + bodyLen + 2 + 1;
            if (size < totalNeeded) {
                // chưa nhận đủ frame
                break;
            }

            // 4) Kiểm tra ETX
            if (buf[totalNeeded - 1] != ETX) {
                // Sai ETX -> bỏ 1 byte (tránh kẹt)
                buffer.discardUpTo(1);
                continue;
            }

            // 5) Trích vùng chứa msg_type + JSON + '\n'
            int bodyRegionStart = HEADER_SIZE + 2;                 // sau header_crc
            int bodyRegionEnd   = bodyRegionStart + bodyLen;       // không gồm body_crc, ETX
            if (bodyRegionEnd > totalNeeded - 3) {
                // có gì đó sai -> drop frame này
                buffer.discardUpTo(totalNeeded);
                continue;
            }

            String rawBody = new String(
                    buf,
                    bodyRegionStart,
                    bodyRegionEnd - bodyRegionStart,
                    StandardCharsets.UTF_8
            );
            // rawBody = [2B msg_type][JSON][\n] (hoặc không có \n nếu robot bỏ)

            // 6) Tìm JSON bằng đếm dấu '{' '}' như C++
            String jsonStr = extractJsonFromRaw(rawBody);
            if (jsonStr == null) {
                // JSON lỗi, bỏ cả frame
                buffer.discardUpTo(totalNeeded);
                continue;
            }

            try {
                JsonNode node = mapper.readTree(jsonStr);
                out.add(node);
            } catch (Exception e) {
                // parse lỗi -> bỏ frame
            }

            // 7) Bỏ toàn bộ frame khỏi buffer
            buffer.discardUpTo(totalNeeded);
        }

        return out;
    }

    private static int alignToHeader(byte[] buf) {
        for (int i = 0; i <= buf.length - 2; i++) {
            if (buf[i] == STX && buf[i + 1] == DIR_V) {
                return i;
            }
        }
        // không có STX/DIR trong buffer -> bỏ hết
        return buf.length;
    }

    /**
     * Tìm JSON bằng cách đếm ngoặc nhọn, giống logic extract_data C++.
     */
    private static String extractJsonFromRaw(String raw) {
        int start = raw.indexOf('{');
        if (start == -1) return null;

        int braceCount = 0;
        int end = -1;
        for (int i = start; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c == '{') {
                braceCount++;
            } else if (c == '}') {
                braceCount--;
                if (braceCount == 0) {
                    end = i;
                    break;
                }
            }
        }
        if (end == -1) return null;
        return raw.substring(start, end + 1);
    }

    // ===== Helper buffer giống vector<Bytes> + erase(begin, begin+N) =====
// ===== Helper buffer giống vector<Bytes> + erase(begin, begin+N) =====
    private static class ByteArrayBuffer extends ByteArrayOutputStream {
        public void discardUpTo(int index) {
            byte[] data = this.toByteArray();
            if (index >= data.length) {
                this.reset();
                return;
            }
            this.reset();
            // ByteArrayOutputStream.write() không ném IOException,
            // nên không cần try/catch
            this.write(data, index, data.length - index);
        }
    }
}
