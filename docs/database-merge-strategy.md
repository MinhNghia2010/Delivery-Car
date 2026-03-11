# Bidding & Syncing: DeliCar & VTmen Databases

Currently, the DeliCar Project has its own MongoDB database (collections: `orders`, `robots`, `sites`, etc.). The VTmen system also has its own internal database managing its fleet and task history.

Because the systems use two **separate** databases, you cannot natively run a simple SQL/Mongo `JOIN`. You must build a **sync layer** or **API bridge**.

Here are the 3 ways to merge/sync them, from easiest to most robust.

---

## Option 1: The "Single Source of Truth" API Bridge (Recommended)

Instead of truly "merging" the databases into one physical disk, you designate one system as the **Master** for Orders, and the other simply reads/writes to it via API.

In your current architecture, DeliCar acts as the Master for Orders:
1. **DeliCar DB** stores the `OrderModel` (Customer info, compartment, status).
2. When an order is ready, DeliCar sends an `addTask` command to VTmen via TCP (`ProtocolService`).
3. VTmen executes the task, and sends back `TaskState` updates.
4. DeliCar listens to `TaskState` and updates the order status in DeliCar's MongoDB.

**How to send an order from VTmen UI back to DeliCar:**
If someone creates an order inside the VTmen system, VTmen needs a webhook or API script that fires a POST request to your DeliCar server:
```http
POST http://<delicar-ip>:8081/api/orders/create
Content-Type: application/json

{
  "orderCode": "VT-001",
  "fullName": "Created from VTmen",
  "compartment": "A-01",
  "status": "PENDING"
}
```
This keeps all business logic inside DeliCar, making it the single source of truth.

---

## Option 2: Continuous Database Replication (MongoDB Change Streams)

If you absolutely must have the data exist in both databases in real-time, and both are MongoDB, you can use **Change Streams**.

You write a separate background worker (e.g., a small Node.js or Python script) that connects to **both** databases:

```javascript
// Pseudo-code for Sync Worker
const vtmenDb = await MongoClient.connect("mongodb://vtmen-ip:27017");
const delicarDb = await MongoClient.connect("mongodb://delicar-ip:27017");

// Watch VTmen for new tasks
vtmenDb.collection("tasks").watch().on("change", async (change) => {
  if (change.operationType === "insert") {
     // Transform VTmen task -> DeliCar Order
     const newOrder = transformToDeliCarFormat(change.fullDocument);
     await delicarDb.collection("orders").insertOne(newOrder);
  }
});

// Watch DeliCar for new orders
delicarDb.collection("orders").watch().on("change", async (change) => {
  if (change.operationType === "insert") {
     // Transform DeliCar Order -> VTmen task
     const newTask = transformToVtmenFormat(change.fullDocument);
     await vtmenDb.collection("tasks").insertOne(newTask);
  }
});
```
*Pros:* Data is instantly cloned.
*Cons:* High risk of infinite loops (A syncs to B, B sees the insert and syncs back to A). You must add strict `sync_source` flags to prevent this.

---

## Option 3: Physical Database Consolidation (Shared DB)

If you have control over the VTmen source code, you can configure VTmen's backend configuration to point directly at DeliCar's MongoDB instance.

1. Configure VTmen to use `mongodb://<delicar-ip>:27017/delicar_db`.
2. VTmen will create its collections (e.g., `vt_tasks`, `vt_robots`) right alongside DeliCar's (`orders`, `robots`).
3. You then modify the DeliCar source code (`OrderService.java`) to directly read the `vt_tasks` collection.

```java
// Inside DeliCar OrderService.java
public List<Document> getVtmenTasks() {
    // Read directly from the VTmen collection stored in the same DB
    return mongoTemplate.findAll(Document.class, "vt_tasks");
}
```

*Pros:* No sync scripts needed. Everything is backed up together.
*Cons:* Changes to VTmen's database schema could break DeliCar.

---

## Recommendation for your Delivery Car

**Go with Option 1.**

You have already built a beautiful robust TCP layer (`ProtocolService`, `RobotFrameDecoder`) that bridges DeliCar and VTmen.

Instead of writing directly to databases (which is messy and prone to schema conflicts), you should expose REST APIs on DeliCar, and have VTmen call those APIs when it has an update.

1. DeliCar wants VTmen to move: send `addTask` via TCP.
2. VTmen moves: sends `TaskState` via TCP → DeliCar updates DB.
3. User manually creates order in VTmen: VTmen fires `POST /api/orders/create` to DeliCar.
