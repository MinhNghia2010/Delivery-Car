import socket
import struct
import json
import time
import math

# ==============================================================================
# 1. CẤU HÌNH
# ==============================================================================
SERVER_IP = "192.168.29.22"   
SERVER_PORT = 8095
SERIAL_NO = "Robot_Python_Final"
ROBOT_NAME = "v001"
SITE_ID = "1587390918309453824"

SEND_INFO_INTERVAL = 0.5  # Gửi DeviceState mỗi 0.5s
SEND_TASK_INTERVAL = 1.0  # Gửi TaskState mỗi 1s

# CONSTANTS
STX = 0x02; DIR = 0x56; ETX = 0x03; NEWLINE = 0x0A

# ==============================================================================
# 2. STATE MACHINE (BỘ NHỚ TRẠNG THÁI CỦA XE)
# ==============================================================================
robot_state = {
    "x": 65.0, "y": 70.0, "z": 0.0, "theta": 0.0,
    "task_id": None,    
    "status_code": 0,   # 0: Idle, 40: Running, 50: Paused, 60: Finished
    "drive_mode": "Auto",
    "battery": 98.5,
    "odometer": 125.5,
    "waypoints": [],    # Chứa mảng lộ trình Server gửi xuống
    "current_wp_index": 0
}

def update_robot_movement():
    global robot_state
    if robot_state["status_code"] == 40 and robot_state["waypoints"]:
        idx = robot_state["current_wp_index"]
        
        if idx < len(robot_state["waypoints"]):
            target = robot_state["waypoints"][idx]
            target_x, target_y = target["x"], target["y"]
            curr_x, curr_y = robot_state["x"], robot_state["y"]
            
            dx = target_x - curr_x
            dy = target_y - curr_y
            dist = math.sqrt(dx*dx + dy*dy)
            
            speed = 1.5 # Vận tốc m/s
            step = speed * SEND_INFO_INTERVAL 
            
            if dist <= step:
                # Đã tới điểm -> Nhảy sang Slice tiếp theo
                robot_state["x"] = target_x
                robot_state["y"] = target_y
                robot_state["current_wp_index"] += 1
            else:
                # Đang đi -> Cập nhật nhích dần tới
                ratio = step / dist
                robot_state["x"] += dx * ratio
                robot_state["y"] += dy * ratio
                robot_state["theta"] = math.degrees(math.atan2(dy, dx))
                robot_state["odometer"] += (speed * SEND_INFO_INTERVAL) / 1000.0 
            
            robot_state["battery"] -= 0.002
        else:
            print("🏁 Đã đến đích! Chuyển trạng thái sang Finished (60).")
            robot_state["status_code"] = 60 
            robot_state["drive_mode"] = "Standby"
    
    if robot_state["status_code"] == 0 and robot_state["battery"] < 100:
        robot_state["battery"] += 0.01

# ==============================================================================
# 3. HELPER FUNCTIONS (ĐÓNG GÓI GIAO THỨC)
# ==============================================================================
def calculate_crc16(data):
    crc = 0xFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 1: crc = (crc >> 1) ^ 0xA001
            else: crc >>= 1
    return crc & 0xFFFF

def build_tcp_packet(json_dict):
    try:
        json_str = json.dumps(json_dict, separators=(',', ':'))
        json_bytes = json_str.encode('utf-8')
        body = b'\x00\x00' + json_bytes + bytes([NEWLINE])
        body_crc = calculate_crc16(body)
        header = struct.pack('<BBHIH16s', STX, DIR, 0, len(body), 0, b'\x00'*16)
        header_crc = calculate_crc16(header)
        return header + struct.pack('<H', header_crc) + body + struct.pack('>H', body_crc) + bytes([ETX])
    except Exception as e: 
        print("Lỗi build packet:", e)
        return None

def extract_json_from_packet(packet):
    try:
        start = packet.find(b'{'); end = packet.rfind(b'}')
        if start != -1 and end != -1: return json.loads(packet[start:end+1].decode('utf-8'))
    except: pass
    return None

# ==============================================================================
# 4. TẠO BẢN TIN TRẠNG THÁI (ĐÚNG CHUẨN JSON MỚI)
# ==============================================================================
def create_device_state_msg(serial_no):
    global robot_state
    now_ms = int(time.time() * 1000)
    now_us = int(time.time() * 1000000)
    update_robot_movement()

    fleet_state = "Idle"
    realtime_state = "Idle"
    
    if robot_state["status_code"] == 40:
        fleet_state = "Navigating"
        realtime_state = "InTask"
    elif robot_state["status_code"] == 50:
        fleet_state = "Paused"
        realtime_state = "Paused"
    elif robot_state["status_code"] == 60:
        fleet_state = "Arrived"
        realtime_state = "Idle"

    payload = {
        "Report": "DeviceState",
        "Body": {
            "robot": {
                "robotName": ROBOT_NAME,
                "robotModelName": ROBOT_NAME,
                "siteId": SITE_ID,
                "State ": fleet_state 
            },
            "statusDetail": {
                "longitude": robot_state["x"], 
                "latitude": robot_state["y"],  
                "x": robot_state["x"],         
                "y": robot_state["y"],         
                "altitude": 0,
                "steerAngle": 0,
                "azimuth": robot_state["theta"],
                "shift": 1 if robot_state["status_code"] == 40 else 0,
                "throttle": 0.5 if robot_state["status_code"] == 40 else 0,
                "brake": 0,
                "speed": 1.2 if robot_state["status_code"] == 40 else 0,
                "regionId": 0,
                "locationState": "Valid",
                "driveMode": robot_state["drive_mode"],
                "State": realtime_state,
                "statusDateTime": now_ms
            },
            "fuelDetail": {
                "residualFuel": robot_state["battery"],
                "voltage": 48.0,
                "ammeter": 2.5,
                "temperature": 35.0,
                "endurance": 23.2,
                "odometer": robot_state["odometer"]
            }
        },
        "Device": serial_no,
        "ID": f"DS_{now_us}",
        "Time": now_us
    }
    return payload

def create_task_state_msg(serial_no):
    global robot_state
    now_us = int(time.time() * 1000000)
    
    state_str = "Running"
    if robot_state["status_code"] == 50: state_str = "Paused"
    elif robot_state["status_code"] == 60: state_str = "Finished"
    elif robot_state["status_code"] == 102: state_str = "Canceled"
    elif robot_state["status_code"] == 0: return None

    if not robot_state["task_id"]: return None

    current_slice_id = ""
    idx = robot_state["current_wp_index"]
    wps = robot_state["waypoints"]
    
    if idx < len(wps): current_slice_id = wps[idx]["id"] 
    elif len(wps) > 0: current_slice_id = wps[-1]["id"]  

    return {
        "Report": "TaskState",
        "Body": {
            "States": [{
                "ErrorNumber": 0,
                "ReasonDesc": "Normal",
                "SliceID": str(current_slice_id),
                "SliceState": state_str,    
                "State": state_str,         
                "TaskID": robot_state["task_id"]
            }]
        },
        "Device": serial_no,
        "ID": f"TS_{now_us}",
        "Time": now_us
    }

# ==============================================================================
# 5. VÒNG LẶP CHÍNH (MAIN LOOP)
# ==============================================================================
def run_client():
    global robot_state
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.settimeout(0.1)
    print(f"⏳ Kết nối {SERVER_IP}:{SERVER_PORT}...")
    client.connect((SERVER_IP, SERVER_PORT))
    print("✅ Connected!")
    
    local_ip = client.getsockname()[0]; local_port = client.getsockname()[1]
    is_logged_in = False
    last_info_sent = 0
    last_task_sent = 0

    client.sendall(build_tcp_packet({
        "Report": "RegDevice", "Body": {"Device": {"Ip": local_ip, "Port": local_port, "SerialNo": SERIAL_NO}},
        "Device": SERIAL_NO, "ID": f"REG_{time.time()}", "Time": int(time.time()*1e6)
    }))

    while True:
        try:
            data = client.recv(4096)
            if not data: raise ConnectionResetError("Empty data")
            msg = extract_json_from_packet(data)
            
            if msg:
                action = msg.get("Action")
                cmd_id = msg.get("ID")
                
                if action == "loginDevice":
                    client.sendall(build_tcp_packet({
                        "Report": "loginDevice", "code": 1000, "data": {"result": True, "params": {"Device": {"Ip": local_ip, "SerialNo": SERIAL_NO}}}, 
                        "desc": "SUCCESS", "device": SERIAL_NO, "id": cmd_id, "time": int(time.time()*1e6)
                    }))
                    is_logged_in = True
                    print("✅ Login Success!")

                elif action == "HeartBeating":
                    client.sendall(build_tcp_packet({"Report": "HeartBeating", "data": {}, "device": SERIAL_NO, "id": cmd_id, "time": int(time.time()*1e6)}))

                elif action == "addTask":
                    print("🚜 NHẬN TASK HEADER -> Chờ Slice...")
                    tasks = msg.get("Body", {}).get("Task", [])
                    robot_state["task_id"] = tasks[0].get("ID") if tasks else "Unknown"
                    
                    # 🔥 BẢN TIN PHẢN HỒI addTask CHUẨN TÀI LIỆU
                    client.sendall(build_tcp_packet({
                        "Report": "addTask", 
                        "code": 1000, 
                        "data": {
                            "params": {
                                "FailedList": []
                            },
                            "result": True
                        }, 
                        "desc": "SUCCESS", 
                        "device": SERIAL_NO, 
                        "id": cmd_id, 
                        "time": int(time.time()*1e6)
                    }))

                elif action == "addTaskSlice":
                    print("🧩 NHẬN SLICE -> Bắt đầu chạy!")
                    body = msg.get("Body", {})
                    task_slice = body.get("TaskSlice", {})
                    waypoints_data = task_slice.get("WayPoints", [])
                    
                    path_queue = []
                    for wp in waypoints_data:
                        pos = wp.get("Position", [0, 0])
                        target_x = pos[0] / 1000.0 if isinstance(pos, list) else 0
                        target_y = pos[1] / 1000.0 if isinstance(pos, list) else 0
                        
                        # 🔥 CHUẨN TÀI LIỆU: Chỉ lấy DestPoint, KHÔNG đụng gì đến Radius
                        dest_id = wp.get("DestPoint", "")
                        
                        path_queue.append({"x": target_x, "y": target_y, "id": dest_id}) 
                    
                    if path_queue:
                        robot_state["waypoints"] = path_queue
                        robot_state["current_wp_index"] = 0
                        robot_state["status_code"] = 40     
                        robot_state["drive_mode"] = "Auto"
                        print(f"   🚀 Lộ trình: {len(path_queue)} điểm")
                    
                    slice_id = task_slice.get("ID", "")
                    
                    # 🔥 BẢN TIN PHẢN HỒI addTaskSlice CHUẨN TÀI LIỆU
                    client.sendall(build_tcp_packet({
                        "Report": "addTaskSlice", 
                        "code": 1000,
                        "data": { 
                            "params": { 
                                "AddTaskSliceResult": 0, 
                                "Reason": "Success",
                                "TaskSliceID": slice_id 
                            }, 
                            "result": True 
                        },
                        "desc": "SUCCESS", 
                        "device": SERIAL_NO, 
                        "id": cmd_id, 
                        "time": int(time.time()*1e6)
                    }))
                    last_task_sent = 0

                elif action == "pauseTask":
                    print("🛑 PAUSE -> Paused")
                    if robot_state["task_id"]: robot_state["status_code"] = 50
                    client.sendall(build_tcp_packet({"Report": "pauseTask", "code": 1000, "data": {"result": True}, "desc": "SUCCESS", "device": SERIAL_NO, "id": cmd_id, "time": int(time.time()*1e6)}))

                elif action == "resumeTask":
                    print("▶️ RESUME -> Running")
                    if robot_state["task_id"]: robot_state["status_code"] = 40
                    client.sendall(build_tcp_packet({"Report": "resumeTask", "code": 1000, "data": {"result": True}, "desc": "SUCCESS", "device": SERIAL_NO, "id": cmd_id, "time": int(time.time()*1e6)}))

                elif action == "cancelTask":
                    print("🚫 CANCEL -> Canceled")
                    robot_state["status_code"] = 102
                    pkt = create_task_state_msg(SERIAL_NO)
                    if pkt: client.sendall(build_tcp_packet(pkt))
                    
                    robot_state["task_id"] = None; robot_state["status_code"] = 0; robot_state["waypoints"] = []
                    client.sendall(build_tcp_packet({"Report": "cancelTask", "code": 1000, "data": {"result": True}, "desc": "SUCCESS", "device": SERIAL_NO, "id": cmd_id, "time": int(time.time()*1e6)}))

        except socket.timeout: pass
        except Exception as e: 
            if "WinError 10054" in str(e): raise

        if is_logged_in:
            cur_time = time.time()
            
            if cur_time - last_info_sent >= SEND_INFO_INTERVAL:
                state_pkt = create_device_state_msg(SERIAL_NO)
                client.sendall(build_tcp_packet(state_pkt))
                last_info_sent = cur_time

            is_time_to_send = (cur_time - last_task_sent >= SEND_TASK_INTERVAL)
            if robot_state["task_id"] is not None and (is_time_to_send or robot_state["status_code"] == 60):
                task_pkt = create_task_state_msg(SERIAL_NO)
                if task_pkt:
                    client.sendall(build_tcp_packet(task_pkt))
                    if robot_state["status_code"] == 60:
                        print("✅ Đã báo Finished cho Server. Dọn dẹp Task!")
                        robot_state["task_id"] = None
                        robot_state["status_code"] = 0
                        robot_state["waypoints"] = []
                last_task_sent = cur_time

def main():
    while True:
        try: run_client()
        except Exception as e:
            print("🔄 Reconnecting...", e)
            time.sleep(3)

if __name__ == "__main__": main()