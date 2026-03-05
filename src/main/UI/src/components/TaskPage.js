import React from "react";
import "../css/TagePage.css";

export default function TaskPage() {
  return (
    <div className="content task-full-width">
      <div className="div">
        <div className="overlap-2">
          <div className="rectangle-2">
            <div className="search-container">
              <input type="text" id="searchTaskID" placeholder="Search Task ID" />
              <input type="text" id="searchTaskName" placeholder="Search Task Name" />
              <input type="text" id="searchPriority" placeholder="Search Priority" />
              <input type="text" id="searchTaskState" placeholder="Search Task State" />
              <label htmlFor="searchTimeFrom">From:</label>
              <input type="datetime-local" className="startDate" id="searchTimeFrom" />
              <label htmlFor="searchTimeTo">To:</label>
              <input type="datetime-local" className="endDate" id="searchTimeTo" />
              <button className="filter">Search</button>
              <button className="clear-filter">Clear All Filters</button>
            </div>

            <div className="task-table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Select</th>
                    <th>Order ID</th>
                    <th>Task ID</th>
                    <th>Task Name</th>
                    <th>Rack No.</th>
                    <th>Location Code</th>
                    <th>Route</th>
                    <th>Device No.</th>
                    <th>Task Creation Time</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Execution</th>
                    <th>Priority</th>
                    <th>Task State</th>
                    <th>Task Process</th>
                    <th>Operation</th>
                  </tr>
                </thead>
                <tbody id="taskTableBody"></tbody>
              </table>
              <img
                id="noDataImage"
                src="../img/database_1104985.png"
                alt="No tasks available"
                style={{ display: "none", width: "600px", margin: "20px auto" }}
              />
            </div>
          </div>

          <div className="lowbut">
            <div className="left-buttons">
              <button>Cancel Selected</button>
              <button>Cancel All</button>
            </div>
            <div className="right-buttons">
              <button>Task Pool</button>
              <button>Export</button>
              <button>Import</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
