package com.example.RobotServerMini.protocol;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Encode JSON -> frame TCP theo đúng ProtocolCodec::build_tcp_message (C++).
 */
public class RobotProtocolCodec {

    private static final byte STX = 0x02;
    private static final byte DIR = 0x56;
    private static final byte ETX = 0x03;
    private static final byte NEWLINE = 0x0A;

    private static final byte[] MSG_TYPE = new byte[]{0x00, 0x00};
    private static final int RESERVED = 0x0000;
    private static final int VERSION = 0x0000;

    private static final ObjectMapper mapper = new ObjectMapper();

    public static byte[] buildTcpMessage(JsonNode data) {
        try {
            // JSON compact
            String jsonString = mapper.writeValueAsString(data);
            byte[] jsonBytes = jsonString.getBytes(StandardCharsets.UTF_8);

            // Body = MSG_TYPE + JSON + '\n'
            List<Byte> bodyList = new ArrayList<>();
            for (byte b : MSG_TYPE) bodyList.add(b);
            for (byte b : jsonBytes) bodyList.add(b);
            bodyList.add(NEWLINE);

            byte[] body = toByteArray(bodyList);

            // CRC body (big-endian)
            int crcBody = calculateCrc(body);
            bodyList.add((byte) ((crcBody >> 8) & 0xFF));  // high
            bodyList.add((byte) (crcBody & 0xFF));         // low
            body = toByteArray(bodyList);

            // length = MSG_TYPE + JSON + '\n'
            int length = MSG_TYPE.length + jsonBytes.length + 1;

            // Header without CRC (26B: <BBHIH16s>, little-endian)
            byte[] header = new byte[26];
            int idx = 0;
            header[idx++] = STX;
            header[idx++] = DIR;
            // RESERVED (uint16 LE)
            header[idx++] = (byte) (RESERVED & 0xFF);
            header[idx++] = (byte) ((RESERVED >> 8) & 0xFF);
            // length (uint32 LE)
            header[idx++] = (byte) (length & 0xFF);
            header[idx++] = (byte) ((length >> 8) & 0xFF);
            header[idx++] = (byte) ((length >> 16) & 0xFF);
            header[idx++] = (byte) ((length >> 24) & 0xFF);
            // VERSION (uint16 LE)
            header[idx++] = (byte) (VERSION & 0xFF);
            header[idx++] = (byte) ((VERSION >> 8) & 0xFF);
            // extended 16 byte = 0
            for (int i = 0; i < 16; i++) {
                header[idx++] = 0x00;
            }

            // CRC header (little-endian)
            int crcHeader = calculateCrc(header);
            List<Byte> headerList = new ArrayList<>();
            for (byte b : header) headerList.add(b);
            headerList.add((byte) (crcHeader & 0xFF));         // low
            headerList.add((byte) ((crcHeader >> 8) & 0xFF));  // high
            byte[] headerWithCrc = toByteArray(headerList);

            // Final packet = header + body + ETX
            byte[] packet = new byte[headerWithCrc.length + body.length + 1];
            System.arraycopy(headerWithCrc, 0, packet, 0, headerWithCrc.length);
            System.arraycopy(body, 0, packet, headerWithCrc.length, body.length);
            packet[packet.length - 1] = ETX;

            return packet;
        } catch (Exception e) {
            throw new RuntimeException("Failed to build TCP message", e);
        }
    }

    private static int calculateCrc(byte[] data) {
        int crc = 0xFFFF;
        for (byte b : data) {
            crc ^= (b & 0xFF);
            for (int i = 0; i < 8; i++) {
                if ((crc & 1) != 0) {
                    crc = (crc >> 1) ^ 0xA001;
                } else {
                    crc >>= 1;
                }
            }
        }
        return crc & 0xFFFF;
    }

    private static byte[] toByteArray(List<Byte> list) {
        byte[] arr = new byte[list.size()];
        for (int i = 0; i < list.size(); i++) {
            arr[i] = list.get(i);
        }
        return arr;
    }
}
