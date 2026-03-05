# Delivery Car System

The Delivery Car System is a comprehensive platform built with Spring Boot and React for managing autonomous delivery vehicles (robots/cars). It provides features such as map uploading, task management, robot status streaming, site management, and order processing.

## 🚀 Technologies Used

- **Backend:** Java, Spring Boot, Maven, MongoDB, MQTT, WebSockets
- **Frontend:** React, HTML/CSS, OpenLayers (for maps)
- **Other Scripts:** Python (simulation)

## 📁 Project Structure

- `src/main/java/com/example/RobotServerMini/`: Core Spring Boot backend application handling API requests, robot service, MQTT protocol, database integration, etc.
- `src/main/UI/`: React frontend application containing user interfaces for login, map features, mission control, robot status, and statistics (note: production build of this UI might be statically served by the backend).
- `simulationTaskStatus.py`: Python script for task status simulation.
- `MAP_UPLOAD_SYSTEM.md`: Documentation for the map uploading sequence.

## 🛠️ Setup & Installation

### Prerequisites
- Java (JDK 17 or higher recommended)
- Maven
- Node.js & npm (for frontend development)
- MongoDB

### Backend (Spring Boot)

1. Configure your MongoDB connection string and MQTT broker settings in `src/main/resources/application.properties`.
2. Build the project using Maven:
   ```bash
   mvn clean install
   ```
3. Run the application:
   ```bash
   mvn spring-boot:run
   ```

### Frontend (React)

1. Navigate to the UI source directory:
   ```bash
   cd src/main/UI
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm start
   ```

## 🚗 Core Features

- **Real-Time Monitoring:** Live tracking of robot statuses and connections via WebSockets.
- **Task Management:** Dispatch and monitor missions/tasks to different delivery vehicles.
- **Map System:** Map upload capabilities with visual representations using OpenLayers.
- **Site & Park Point Management:** Defining and organizing charging and waiting locations for robots.
- **Security:** Built-in authentication and authorization (`SecurityConfig`).

## 🤝 Contributing
1. Fork the repository
2. Create to a new feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request
