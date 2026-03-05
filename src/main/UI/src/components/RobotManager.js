import React, { useEffect, useState } from "react";
import { Container, Button, Table, Modal, Form, Spinner, Toast, Row, Col, InputGroup, Card, Badge } from "react-bootstrap";
import { FaPlus, FaTrash, FaEdit, FaRobot, FaMicrochip, FaCalendarAlt, FaArrowLeft, FaLink, FaUnlink, FaBuilding, FaInfoCircle } from "react-icons/fa";
import axios from "axios";
import "../css/ParkPointManager.css"; // Using shared CSS with ParkPoint for consistent UI
import { API_ROBOT, API_SITE , API_RELATION } from "../api";

export default function RobotManager({ setManagerTab }) {
  // --- DATA STATE ---
  const [robots, setRobots] = useState([]);
  const [sites, setSites] = useState([]); // Site list from DB
  const [loading, setLoading] = useState(false);

  // --- MODAL STATE ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false); // Quick Site Link Modal

  // --- TEMP DATA STATE ---
  const [selectedRobotForLink, setSelectedRobotForLink] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState("");

  // --- NOTIFICATION STATE ---
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  // --- DEFAULT FORM DATA ---
  const initialForm = {
    robotId: "",
    robotObjectId: "", // MAC Address / Hardware ID
    robotName: "",
    robotModelName: "",
    robotType: 0, // 0: Delivery, 1: Patrol...
    serviceStartTime: "", // YYYY-MM-DD
    serviceEndTime: "", // YYYY-MM-DD
    remark: "",
    siteId: "", // Select from Dropdown
  };

  const [formData, setFormData] = useState(initialForm);

  // --- 1. LOAD DATA FROM SERVER ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1.1 Load Robot list
      const resRobots = await axios.get(`${API_ROBOT}?current=1&size=100`);
      if (resRobots.data.code === 0) {
        setRobots(resRobots.data.data.records || []);
      }

      // 1.2 Load Site list (to populate Dropdown)
      const resSites = await axios.get(`${API_SITE}/getSitePage?current=1&size=100`);
      if (resSites.data && resSites.data.data) {
        setSites(resSites.data.data.records || []);
      }
    } catch (e) {
      console.error("Error loading data:", e);
      showError("Unable to connect to server!");
    } finally {
      setLoading(false);
    }
  };

  // Run once on mount
  useEffect(() => {
    fetchData();
  }, []);

  // --- 2. FORM HANDLING (ADD / EDIT) ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addRobot = async () => {
    try {
      setLoading(true);
      // Convert date to Timestamp (Long) if entered
      const payload = {
        ...formData,
        serviceStartTime: formData.serviceStartTime ? new Date(formData.serviceStartTime).getTime() : null,
        serviceEndTime: formData.serviceEndTime ? new Date(formData.serviceEndTime).getTime() : null,
      };

      const res = await axios.post(API_ROBOT, payload);
      if (res.data.code === 0) {
        showSuccess("Robot added successfully!");
        fetchData();
        setShowAddModal(false);
        setFormData(initialForm);
      } else {
        showError(res.data.msg || "Failed to add robot!");
      }
    } catch (e) {
      showError("System error when adding Robot!");
    } finally {
      setLoading(false);
    }
  };

  const editRobot = async () => {
    try {
      setLoading(true);
      const payload = {
        ...formData,
        serviceStartTime: formData.serviceStartTime ? new Date(formData.serviceStartTime).getTime() : null,
        serviceEndTime: formData.serviceEndTime ? new Date(formData.serviceEndTime).getTime() : null,
      };

      const res = await axios.put(`${API_ROBOT}/${formData.robotId}`, payload);
      if (res.data.code === 0) {
        showSuccess("Update successful!");
        fetchData();
        setShowEditModal(false);
      } else {
        showError(res.data.msg || "Update failed!");
      }
    } catch (e) {
      showError("System error when updating Robot!");
    } finally {
      setLoading(false);
    }
  };

  const deleteRobot = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Robot?")) return;
    try {
      const res = await axios.delete(`${API_ROBOT}/${id}`);
      if (res.data.code === 0) {
        showSuccess("Robot deleted!");
        fetchData();
      } else {
        showError("Delete failed!");
      }
    } catch (e) {
      showError("System error when deleting!");
    }
  };

  const openEditModal = (robot) => {
    // Convert timestamp to YYYY-MM-DD for date input display
    const toDateInput = (ts) => (ts ? new Date(ts).toISOString().split("T")[0] : "");

    setFormData({
      ...robot,
      serviceStartTime: toDateInput(robot.serviceStartTime),
      serviceEndTime: toDateInput(robot.serviceEndTime),
      siteId: robot.siteId || "", // Ensure not null
    });
    setShowEditModal(true);
  };

  // --- 3. SITE RELATION MANAGEMENT (QUICK LINK/UNLINK) ---

  // Open quick link modal
  const openLinkModal = (robot) => {
    setSelectedRobotForLink(robot);
    setSelectedSiteId(""); // Reset selection
    setShowLinkModal(true);
  };

  // Call Link API
  const handleLinkSite = async () => {
    if (!selectedSiteId || !selectedRobotForLink) return;
    try {
      // PUT /api/sites/{siteId}/robots/{robotId}
      await axios.put(`${API_RELATION}/${selectedSiteId}/robots/${selectedRobotForLink.robotId}`);
      showSuccess(`Robot successfully linked to Site!`);
      fetchData();
      setShowLinkModal(false);
    } catch (e) {
      showError("Failed to link Site!");
    }
  };

  // Call Unlink API
  const handleUnlinkSite = async (robot) => {
    if (!robot.siteId) return;
    if (!window.confirm(`Unlink Robot [${robot.robotName}] from current Site?`)) return;
    try {
      // DELETE /api/sites/{siteId}/robots/{robotId}
      await axios.delete(`${API_RELATION}/${robot.siteId}/robots/${robot.robotId}`);
      showSuccess("Robot unlinked from Site!");
      fetchData();
    } catch (e) {
      showError("Failed to unlink Site!");
    }
  };

  // --- HELPER FUNCTIONS ---
  const getSiteName = (id) => {
    const s = sites.find((x) => x.siteId === id);
    return s ? s.siteName : <span className="text-muted fst-italic">No Site Assigned</span>;
  };

  const showSuccess = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
  };
  const showError = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  // --- RENDER FORM (Used for both Add and Edit - Single Column) ---
  const renderForm = () => (
    <div className="px-3">
      {/* Identification Group */}
      <h6 className="text-primary fw-bold mb-3 border-bottom pb-2">
        <FaInfoCircle className="me-2" /> Basic Information
      </h6>

      <Row>
        <Col md={12} className="mb-3">
          <Form.Label className="fw-bold text-secondary">Hardware ID (Object ID / MAC)</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FaMicrochip />
            </InputGroup.Text>
            <Form.Control name="robotObjectId" value={formData.robotObjectId} onChange={handleChange} placeholder="e.g., 00-00-00-A1-B2-C3" />
          </InputGroup>
        </Col>

        <Col md={12} className="mb-3">
          <Form.Label className="fw-bold text-secondary">Robot Name</Form.Label>
          <Form.Control className="form-control-lg" name="robotName" value={formData.robotName} onChange={handleChange} placeholder="e.g., Delivery Robot 01" />
        </Col>

        <Col md={12} className="mb-3">
          <Form.Label className="fw-bold text-secondary">Robot Model</Form.Label>
          <Form.Control name="robotModelName" value={formData.robotModelName} onChange={handleChange} placeholder="e.g., AGV-X100" />
        </Col>

        <Col md={12} className="mb-3">
          <Form.Label className="fw-bold text-secondary">Robot Type</Form.Label>
          <Form.Select name="robotType" value={formData.robotType} onChange={handleChange}>
            <option value="0">Delivery</option>
            <option value="1">Patrol</option>
            <option value="2">Cleaning</option>
            <option value="3">Guide</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Operation & Config Group */}
      <h6 className="text-primary fw-bold mb-3 mt-3 border-bottom pb-2">
        <FaCalendarAlt className="me-2" /> Operations & Config
      </h6>

      <Row>
        {/* --- IMPORTANT: SELECT SITE FROM DATABASE --- */}
        <Col md={12} className="mb-3">
          <Form.Label className="fw-bold text-danger">Assigned Site</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FaBuilding />
            </InputGroup.Text>
            <Form.Select name="siteId" value={formData.siteId} onChange={handleChange}>
              <option value="">-- Select Site --</option>
              {sites.map((s) => (
                <option key={s.siteId} value={s.siteId}>
                  {s.siteName}
                </option>
              ))}
            </Form.Select>
          </InputGroup>
          <Form.Text className="text-muted">Select the operating area for the Robot from the available list.</Form.Text>
        </Col>

        <Col md={12} className="mb-3">
          <Form.Label className="fw-bold text-secondary">Service Start Date</Form.Label>
          <Form.Control type="date" name="serviceStartTime" value={formData.serviceStartTime} onChange={handleChange} />
        </Col>

        <Col md={12} className="mb-3">
          <Form.Label className="fw-bold text-secondary">End Date</Form.Label>
          <Form.Control type="date" name="serviceEndTime" value={formData.serviceEndTime} onChange={handleChange} />
        </Col>

        <Col md={12} className="mb-3">
          <Form.Label className="fw-bold text-secondary">Remark</Form.Label>
          <Form.Control as="textarea" rows={3} name="remark" value={formData.remark} onChange={handleChange} />
        </Col>
      </Row>
    </div>
  );

  return (
    <div className="park-point-page">
      <Container fluid="lg">
        <Card className="modern-card">
          {/* --- HEADER --- */}
          <div className="card-header-custom">
            <div className="page-title">
              {/* Back button to Site Manager */}
              <Button variant="light" className="btn-icon me-3 border shadow-sm" onClick={() => setManagerTab("site")} title="Back">
                <FaArrowLeft color="#333" />
              </Button>
              <div>
                <h3>Robot Manager</h3>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => {
                setFormData(initialForm);
                setShowAddModal(true);
              }}
              className="shadow-sm px-4 fw-bold"
            >
              <FaPlus className="me-2" /> Add New Robot
            </Button>
          </div>

          {loading && (
            <div className="text-center py-5">
              <Spinner animation="border" variant="success" />
            </div>
          )}

          {/* --- TABLE --- */}
          <div className="table-responsive">
            <Table hover className="custom-table align-middle">
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>#</th>
                  <th>Robot Name</th>
                  <th>Model / MAC</th>
                  <th>Type</th>
                  <th style={{ minWidth: "200px" }}>Site</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {robots.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No robot data available.
                    </td>
                  </tr>
                ) : (
                  robots.map((r, idx) => (
                    <tr key={r.robotId}>
                      <td>{idx + 1}</td>
                      <td>
                        <div className="fw-bold text-dark" style={{ fontSize: "1.05rem" }}>
                          {r.robotName}
                        </div>
                        {r.remark && (
                          <small className="text-muted d-block text-truncate" style={{ maxWidth: "150px" }}>
                            {r.remark}
                          </small>
                        )}
                      </td>
                      <td>
                        <div className="fw-bold text-secondary">{r.robotModelName}</div>
                        <small className="text-muted font-monospace bg-light px-1 rounded border">{r.robotObjectId}</small>
                      </td>
                      <td>
                        {r.robotType === 0 && <Badge bg="primary">Delivery</Badge>}
                        {r.robotType === 1 && (
                          <Badge bg="warning" text="dark">
                            Patrol
                          </Badge>
                        )}
                        {r.robotType === 2 && <Badge bg="info">Cleaning</Badge>}
                        {r.robotType > 2 && <Badge bg="secondary">Other</Badge>}
                      </td>

                      {/* SITE MANAGEMENT COLUMN - QUICK LINK/UNLINK */}
                      <td>
                        {r.siteId ? (
                          <div className="d-flex align-items-center justify-content-between p-2 rounded border bg-light">
                            <div className="fw-bold text-primary text-truncate" style={{ maxWidth: "140px" }}>
                              <FaBuilding className="me-1" /> {getSiteName(r.siteId)}
                            </div>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="py-0 px-2 border-0"
                              title="Unlink from Site"
                              onClick={() => handleUnlinkSite(r)}
                            >
                              <FaUnlink size={14} />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline-success" size="sm" className="w-100 dashed-border" onClick={() => openLinkModal(r)}>
                            <FaLink className="me-1" /> Link Site
                          </Button>
                        )}
                      </td>

                      <td>
                        <Badge bg="success">{r.status || "IN_SERVICE"}</Badge>
                      </td>
                      <td className="text-end">
                        <button className="btn-icon text-warning-hover me-2" title="Edit" onClick={() => openEditModal(r)}>
                          <FaEdit size={18} />
                        </button>
                        <button className="btn-icon text-danger-hover" title="Delete" onClick={() => deleteRobot(r.robotId)}>
                          <FaTrash size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card>

        {/* --- QUICK SITE LINK MODAL --- */}
        <Modal show={showLinkModal} onHide={() => setShowLinkModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Assign Operating Area</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              Selecting site for robot: <strong className="text-primary">{selectedRobotForLink?.robotName}</strong>
            </p>
            <Form.Group>
              <Form.Label className="fw-bold">Select Site from Database:</Form.Label>
              <Form.Select className="form-select-lg" value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)}>
                <option value="">-- Please select a Site --</option>
                {sites.map((s) => (
                  <option key={s.siteId} value={s.siteId}>
                    {s.siteName}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowLinkModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!selectedSiteId} onClick={handleLinkSite}>
              <FaLink className="me-2" /> Confirm Link
            </Button>
          </Modal.Footer>
        </Modal>

        {/* --- MODAL ADD/EDIT ROBOT --- */}
        <Modal
          show={showAddModal || showEditModal}
          onHide={() => {
            setShowAddModal(false);
            setShowEditModal(false);
          }}
          dialogClassName="modal-extra-wide" // CSS Class for wide modal
          centered
          backdrop="static"
        >
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="text-primary fw-bold">
              {showAddModal ? (
                <>
                  <FaPlus className="me-2" /> Add New Robot
                </>
              ) : (
                <>
                  <FaEdit className="me-2" /> Update Robot Information
                </>
              )}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-white px-4 py-3">{renderForm()}</Modal.Body>
          <Modal.Footer className="bg-light">
            <Button
              variant="outline-secondary"
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
              }}
            >
              Close
            </Button>
            <Button variant={showAddModal ? "primary" : "warning"} onClick={showAddModal ? addRobot : editRobot} className="px-4 fw-bold">
              {loading ? <Spinner size="sm" /> : showAddModal ? "Create" : "Save Changes"}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* --- TOAST NOTIFICATION --- */}
        <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide style={{ position: "fixed", bottom: 30, right: 30, zIndex: 9999 }}>
          {/* Updated condition to check English keywords */}
          <Toast.Header
            className={
              toastMessage.toLowerCase().includes("failed") || toastMessage.toLowerCase().includes("error") ? "bg-danger text-white" : "bg-success text-white"
            }
          >
            <strong className="me-auto">System Notification</strong>
          </Toast.Header>
          <Toast.Body className="bg-white fs-6">{toastMessage}</Toast.Body>
        </Toast>
      </Container>
    </div>
  );
}
