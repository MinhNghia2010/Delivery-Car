# VTmen ↔ DeliCar Server — API & Protocol Communication

## Architecture Overview

```
┌──────────────────┐        REST / WebSocket        ┌──────────────────┐
│   Admin React UI │ ◄──────────────────────────────► │  Spring Boot     │
│  (localhost:3000)│        HTTP :8081                │  Server :8081    │
└──────────────────┘                                  └────────┬─────────┘
                                                               │
                                                    TCP Socket │ :8095
                                                    (Huaray Protocol)
                                                               │
                                                      ┌────────▼─────────┐
                                                      │  VTmen Robot(s)  │
                                                      │  (simulationTaskStatus.py) │
                                                      └──────────────────┘
```

There are **two separate communication layers**:

| Layer | Protocol | Port | Direction |
|-------|----------|------|-----------|
| Admin UI ↔ Server | REST + WebSocket (STOMP) | `8081` | Bidirectional |
| Server ↔ VTmen Robot | Raw TCP socket (Huaray binary framing) | `8095` | Bidirectional |

---

## Layer 1 — Admin UI ↔ Spring Boot Server

### REST Endpoints (HTTP)

#### Auth
| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/auth/login` | Admin login |

#### Orders
| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/orders/active` | All non-completed orders |
| `GET` | `/api/orders/history` | Completed orders (filterable) |
| `POST` | `/api/orders/{id}/complete` | Mark order as COMPLETED |
| `POST` | `/api/orders/create` | Create a test order |

#### Robot / Fleet
| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/robot` | List all robots |
| `POST` | `/api/cars/connection-response` | Accept or reject a robot connection |

#### Task Control (sends commands down to robot via TCP)
| Method | URL | Body | Description |
|--------|-----|------|-------------|
| `POST` | `/api/tasks/send` | `{ vehicleId, taskPoints... }` | Send navigation task to robot |
| `POST` | `/api/tasks/pause` | `{ vehicleId, taskId }` | Pause running task |
| `POST` | `/api/tasks/resume` | `{ vehicleId, taskId }` | Resume paused task |
| `POST` | `/api/tasks/cancel` | `{ vehicleId, taskId }` | Cancel task |

#### Map & Sites
| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/datamap/upload` | Upload map node/control point data |
| `POST` | `/api/map-upload/upload` | Upload a map file |
| `GET` | `/api/map-upload/library` | List all uploaded maps |
| `POST` | `/api/map-upload/assign` | Assign a map to a robot |
| `GET` | `/api/map-upload/robot/{vehicleId}/map` | Get map assigned to robot |
| `DELETE` | `/api/map-upload/library/{id}` | Delete a map |
| `GET/POST/DELETE` | `/api/site` | Site (zone) management |
| `GET/POST/DELETE` | `/api/point` | Park point management |

---

### WebSocket (STOMP over SockJS)

**Connect to:** `ws://localhost:8081/ws`

| Topic | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `/topic/orders` | Server → UI | `List<OrderModel>` | Pushed when any active order changes (new order created) |
| `/topic/vehicle-status` | Server → UI | `{ vehicleId, connectionStatus }` | Robot connection accepted/rejected |
| `/topic/robot-signals` | Server → UI | Robot state JSON | Live robot position, battery, task state |

The UI connects via:
```js
// setupProxy.js proxies :3000 → :8081
const client = new Client({
  webSocketFactory: () => new SockJS("http://localhost:8081/ws"),
});
```

**Order update flow (Redis Pub/Sub bridge):**
```
createOrder() → orderRepository.save()
             → Redis publish("order_topic", allActiveOrders)
             → Redis subscriber → SimpMessagingTemplate.convertAndSend("/topic/orders")
             → React UI receives new list → toast notification
```

---

## Layer 2 — Spring Boot Server ↔ VTmen Robot (TCP)

### Transport: Huaray Binary Frame

All messages between the server and the robot are encoded in a **custom binary frame** that wraps a compact JSON payload.

**Frame structure:**

```
┌──────────────────────────────────────────────────┐
│  HEADER (28 bytes, little-endian)                │
│    STX     : 0x02                  (1 byte)      │
│    DIR     : 0x56                  (1 byte)      │
│    Reserved: 0x0000                (2 bytes)     │
│    Length  : uint32 (JSON body len)(4 bytes)     │
│    Version : 0x0000                (2 bytes)     │
│    Extended: 0x00 × 16             (16 bytes)    │
│    CRC16   : header checksum       (2 bytes)     │
├──────────────────────────────────────────────────│
│  BODY                                            │
│    MSG_TYPE: 0x00 0x00             (2 bytes)     │
│    JSON    : compact UTF-8         (N bytes)     │
│    NEWLINE : 0x0A                  (1 byte)      │
│    CRC16   : body checksum         (2 bytes)     │
├──────────────────────────────────────────────────│
│  ETX       : 0x03                  (1 byte)      │
└──────────────────────────────────────────────────┘
```

CRC algorithm: **CRC-16/IBM** (poly `0xA001`, init `0xFFFF`)

Implemented in:
- **Java (server):** [`RobotProtocolCodec.java`](../src/main/java/com/example/RobotServerMini/protocol/RobotProtocolCodec.java) — encode
- **Java (server):** [`RobotFrameDecoder.java`](../src/main/java/com/example/RobotServerMini/protocol/RobotFrameDecoder.java) — decode
- **Python (simulation):** [`simulationTaskStatus.py`](../simulationTaskStatus.py) — both

---

### Message Flow: Robot → Server

The robot connects to the server's TCP socket on **port 8095**.

#### 1. Registration (`RegDevice`)
Robot sends on first connection:
```json
{
  "Report": "RegDevice",
  "Body": { "Device": { "Ip": "...", "Port": 12345, "SerialNo": "Robot_1" } },
  "Device": "Robot_1",
  "ID": "REG_...",
  "Time": 1710000000000000
}
```
Server saves robot info to MongoDB and notifies the Admin UI via `/topic/vehicle-status`.

#### 2. Position & State (`DeviceState`) — every 0.5s
```json
{
  "Report": "DeviceState",
  "Body": {
    "robot": { "robotName": "v001", "siteId": "...", "State": "Navigating" },
    "statusDetail": {
      "x": 65.0, "y": 70.0, "azimuth": 45.0,
      "speed": 1.2, "driveMode": "Auto", "State": "InTask"
    },
    "fuelDetail": {
      "residualFuel": 98.5, "voltage": 48.0, "odometer": 125.5
    }
  },
  "Device": "Robot_1"
}
```

#### 3. Task Progress (`TaskState`) — every 1s while on a task
```json
{
  "Report": "TaskState",
  "Body": {
    "States": [{
      "TaskID": "TASK_001",
      "SliceID": "WP_5",
      "State": "Running",    // Running | Paused | Finished | Canceled
      "SliceState": "Running",
      "ErrorNumber": 0
    }]
  },
  "Device": "Robot_1"
}
```

State codes in simulation:
| Code | Meaning |
|------|---------|
| `0` | Idle |
| `40` | Running |
| `50` | Paused |
| `60` | Finished |
| `102` | Canceled |

#### 4. Heartbeat (`HeartBeating`)
Robot echoes back every heartbeat the server sends.

---

### Message Flow: Server → Robot

All outbound commands go through [`ProtocolService.sendToRobot(vehicleId, payload)`](../src/main/java/com/example/RobotServerMini/robotservice/ProtocolService.java).

#### 1. Login (`loginDevice`) — after admin accepts connection
```json
{
  "Action": "loginDevice",
  "Body": { "Username": "admin", "Password": "admin123456", "Ip": "192.168.x.x", "Port": 8095 },
  "Device": "Robot_1",
  "ID": "LOGIN_...",
  "Time": ...
}
```

#### 2. Send Task (`addTask` + `addTaskSlice`)
Admin clicks send task on map → `POST /api/tasks/send` → `TaskService` →

**Step 1 – Task header:**
```json
{
  "Action": "addTask",
  "Body": { "Task": [{ "ID": "TASK_001", ... }] },
  "Device": "Robot_1"
}
```

**Step 2 – Task slice with waypoints:**
```json
{
  "Action": "addTaskSlice",
  "Body": {
    "TaskSlice": {
      "ID": "SLICE_001",
      "WayPoints": [
        { "DestPoint": "NODE_A", "Position": [65000, 70000] },
        { "DestPoint": "NODE_B", "Position": [80000, 85000] }
      ]
    }
  },
  "Device": "Robot_1"
}
```
> `Position` values are in **millimetres** (÷ 1000 = metres).

#### 3. Task Controls
```json
// Pause
{ "Action": "pauseTask",  "Body": { "TaskID": "TASK_001" }, "Device": "Robot_1" }

// Resume
{ "Action": "resumeTask", "Body": { "TaskID": "TASK_001" }, "Device": "Robot_1" }

// Cancel
{ "Action": "cancelTask", "Body": { "TaskID": "TASK_001" }, "Device": "Robot_1" }
```

#### 4. Heartbeat (`HeartBeating`) — server sends, robot echoes
```json
{ "Action": "HeartBeating", "Device": "Robot_1", "ID": "HB_...", "Time": ... }
```

---

## Testing Without a Physical Robot

Run the Python simulation to emulate a VTmen robot:

```bash
# Edit SERVER_IP in simulationTaskStatus.py first
python simulationTaskStatus.py
```

The simulation will:
1. Connect to server TCP `:8095`
2. Register itself as `Robot_Python_Final`
3. Send `DeviceState` every 0.5s and `TaskState` every 1s
4. Respond correctly to `addTask`, `addTaskSlice`, `pauseTask`, `resumeTask`, `cancelTask`
5. Move along waypoints and auto-report `Finished` when it arrives

---

## Key Source Files

| File | Role |
|------|------|
| [`ProtocolService.java`](../src/main/java/com/example/RobotServerMini/robotservice/ProtocolService.java) | TCP server on :8095, socket management |
| [`RobotProtocolCodec.java`](../src/main/java/com/example/RobotServerMini/protocol/RobotProtocolCodec.java) | Binary frame encoder |
| [`RobotFrameDecoder.java`](../src/main/java/com/example/RobotServerMini/protocol/RobotFrameDecoder.java) | Binary frame decoder |
| [`RobotSignalService.java`](../src/main/java/com/example/RobotServerMini/robotservice/RobotSignalService.java) | Handles all incoming robot signals |
| [`TaskService.java`](../src/main/java/com/example/RobotServerMini/robotservice/TaskService.java) | Builds & sends task commands |
| [`RobotConnectionController.java`](../src/main/java/com/example/RobotServerMini/controllers/RobotConnectionController.java) | Handles accept/reject from UI |
| [`TaskController.java`](../src/main/java/com/example/RobotServerMini/controllers/TaskController.java) | REST entry point for task commands |
| [`OrderService.java`](../src/main/java/com/example/RobotServerMini/robotservice/OrderService.java) | Order CRUD + Redis pub/sub |
| [`simulationTaskStatus.py`](../simulationTaskStatus.py) | Robot emulator for local dev/testing |
| [`api.js`](../src/main/UI/src/api.js) | All frontend API URL constants |
