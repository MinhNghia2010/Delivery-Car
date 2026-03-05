import React, { useEffect, useState } from "react";
import { Container, Button, Table, Modal, Form, Spinner, Toast, Row, Col, InputGroup, Card } from "react-bootstrap";
import { FaPlus, FaTrash, FaEdit, FaEye, FaMapMarkerAlt, FaBolt, FaBoxOpen, FaFilter, FaSearch, FaArrowLeft } from "react-icons/fa";
import axios from "axios";
import "../css/ParkPointManager.css";
import { API_POINT_BASE, API_SITE } from "../api";

export default function ParkPointManager({ setManagerTab }) {
  const [points, setPoints] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [selectedPoint, setSelectedPoint] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  // Pagination & Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPoints, setTotalPoints] = useState(0);
  const [filterSiteId, setFilterSiteId] = useState("");

  const initialForm = {
    parkPointId: "",
    dockName: "",
    dockShowName: "",
    longitude: "",
    latitude: "",
    azimuth: 0,
    regionId: 0,
    parkPointNum: 1,
    parkRange: 1,
    areaId: 0,
    siteId: "",
    isCharge: 1, // 1: No, 0: Yes (Backend Logic)
    isLoad: 1, // 1: No, 0: Yes
  };

  const [formData, setFormData] = useState(initialForm);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle Switch (Backend uses 0 for YES, 1 for NO)
  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setFormData({ ...formData, [name]: checked ? 0 : 1 });
  };

  const fetchSites = async () => {
    try {
      // Gọi Backend lấy danh sách Site thật
      const res = await axios.get(`${API_SITE}/getSitePage?current=1&size=100`);
      if (res.data && res.data.data) {
        setSites(res.data.data.records || []); // Lưu vào biến state 'sites'
      }
    } catch (e) {
      console.error("Lỗi load sites", e);
    }
  };

  useEffect(() => {
    fetchSites(); // 👈 Chạy hàm này ngay khi mở trang
  }, []);

  const fetchPoints = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_POINT_BASE}/getParkPointPage`, {
        params: { current: currentPage, size: pageSize, siteId: filterSiteId },
      });
      if (res.data && res.data.data) {
        setPoints(res.data.data.records || []);
        setTotalPoints(res.data.data.total || 0);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addPoint = async () => {
    try {
      setLoading(true);
      const payload = { ...formData };
      delete payload.parkPointId;
      await axios.post(`${API_POINT_BASE}/addParkPoint`, payload);

      showSuccessToast("Stop point added successfully!");
      fetchPoints();
      setShowAddModal(false);
      setFormData(initialForm);
    } catch (error) {
      showErrorToast("Failed to add stop point.");
    } finally {
      setLoading(false);
    }
  };

  const editPoint = async () => {
    try {
      setLoading(true);
      await axios.put(`${API_POINT_BASE}/updateParkPoint`, formData);
      showSuccessToast("Stop point updated successfully!");
      fetchPoints();
      setShowEditModal(false);
      setFormData(initialForm);
    } catch (error) {
      showErrorToast("Failed to update stop point.");
    } finally {
      setLoading(false);
    }
  };

  const deletePoint = async (id) => {
    if (!window.confirm("Are you sure you want to delete this stop point?")) return;
    try {
      await axios.delete(`${API_POINT_BASE}/deleteParkPoint`, {
        params: { parkPointId: id },
      });
      showSuccessToast("Stop point deleted!");
      fetchPoints();
    } catch (error) {
      showErrorToast("Failed to delete stop point.");
    }
  };

  const viewDetail = async (id) => {
    try {
      const res = await axios.get(`${API_POINT_BASE}/getParkPointDetails`, {
        params: { parkPointId: id },
      });
      setSelectedPoint(res.data);
      setShowDetailModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (point) => {
    setFormData({ ...point });
    setShowEditModal(true);
  };

  const showSuccessToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
  };
  const showErrorToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  useEffect(() => {
    fetchSites();
  }, []);
  useEffect(() => {
    fetchPoints();
  }, [currentPage, filterSiteId]);

  const getSiteName = (id) => {
    const s = sites.find((x) => x.siteId === id);
    return s ? s.siteName : <span className="text-muted">Unknown Site</span>;
  };

  // --- RENDER FORM FIELDS (Single Column Layout) ---
  const renderFormFields = () => (
    <div className="px-2">
      <Row>
        {/* === SECTION 1: BASIC INFO === */}
        <Col md={12}>
          <h6 className="text-uppercase text-muted fw-bold mb-3" style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>
            Basic Information
          </h6>
        </Col>

        <Col md={12} className="mb-3">
          <Form.Label className="form-label-custom">Dock Name</Form.Label>
          <Form.Control
            className="form-control-custom"
            name="dockName"
            value={formData.dockName}
            onChange={handleChange}
            placeholder="e.g., Charging Station 1"
          />
        </Col>

        <Col md={12} className="mb-3">
          <Form.Label className="form-label-custom">Display Name</Form.Label>
          <Form.Control className="form-control-custom" name="dockShowName" value={formData.dockShowName} onChange={handleChange} placeholder="e.g., CHG-01" />
        </Col>

        <Col md={12} className="mb-4">
          <Form.Label className="form-label-custom">
            Site <span className="text-danger">*</span>
          </Form.Label>
          <Form.Select className="form-select-custom" name="siteId" value={formData.siteId} onChange={handleChange}>
            <option value="">-- Select Site --</option>
            {sites.map((s) => (
              <option key={s.siteId} value={s.siteId}>
                {s.siteName}
              </option>
            ))}
          </Form.Select>
        </Col>

        {/* === SECTION 2: CAPABILITIES === */}
        <Col md={12}>
          <h6 className="text-uppercase text-muted fw-bold mb-3" style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>
            Capabilities
          </h6>
        </Col>

        <Col md={12} className="mb-2">
          <div className="switch-wrapper">
            <span className="switch-label">
              <FaBolt className="text-warning me-2" /> Charging Point
            </span>
            <Form.Check
              type="switch"
              id="switch-charge"
              name="isCharge"
              className="custom-switch"
              checked={formData.isCharge === 0}
              onChange={handleSwitchChange}
            />
          </div>
        </Col>

        <Col md={12} className="mb-4">
          <div className="switch-wrapper">
            <span className="switch-label">
              <FaBoxOpen className="text-primary me-2" /> Loading Point
            </span>
            <Form.Check type="switch" id="switch-load" name="isLoad" className="custom-switch" checked={formData.isLoad === 0} onChange={handleSwitchChange} />
          </div>
        </Col>

        {/* === SECTION 3: LOCATION === */}
        <Col md={12}>
          <h6 className="text-uppercase text-muted fw-bold mb-3" style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>
            Location & Coordinates
          </h6>
        </Col>

        <Col md={12} className="mb-3">
          <Form.Label className="form-label-custom">Longitude</Form.Label>
          <Form.Control type="number" className="form-control-custom" name="longitude" value={formData.longitude} onChange={handleChange} />
        </Col>

        <Col md={12} className="mb-3">
          <Form.Label className="form-label-custom">Latitude</Form.Label>
          <Form.Control type="number" className="form-control-custom" name="latitude" value={formData.latitude} onChange={handleChange} />
        </Col>

        <Col md={12} className="mb-3">
          <Form.Label className="form-label-custom">Azimuth (Heading)</Form.Label>
          <Form.Control type="number" className="form-control-custom" name="azimuth" value={formData.azimuth} onChange={handleChange} />
        </Col>

        <Col md={12} className="mb-4">
          <Form.Label className="form-label-custom">Point ID (Num)</Form.Label>
          <Form.Control type="number" className="form-control-custom" name="parkPointNum" value={formData.parkPointNum} onChange={handleChange} />
        </Col>

        {/* === SECTION 4: ADVANCED === */}
        <Col md={12}>
          <h6 className="text-uppercase text-muted fw-bold mb-3" style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>
            Advanced Config
          </h6>
        </Col>

        <Col md={12} className="mb-3">
          <Row>
            <Col xs={4}>
              <Form.Label className="form-label-custom">Region ID</Form.Label>
              <Form.Control type="number" className="form-control-custom" name="regionId" value={formData.regionId} onChange={handleChange} />
            </Col>
            <Col xs={4}>
              <Form.Label className="form-label-custom">Area ID</Form.Label>
              <Form.Control type="number" className="form-control-custom" name="areaId" value={formData.areaId} onChange={handleChange} />
            </Col>
            <Col xs={4}>
              <Form.Label className="form-label-custom">Range</Form.Label>
              <Form.Control type="number" className="form-control-custom" name="parkRange" value={formData.parkRange} onChange={handleChange} />
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );

  return (
    <div className="park-point-page">
      <Container fluid="lg">
        <Card className="modern-card">
          {/* HEADER */}
          <div className="card-header-custom">
            <div className="page-title">
              <Button variant="light" className="btn-icon me-3 border shadow-sm" onClick={() => setManagerTab("site")} title="Back to Site Manager">
                <FaArrowLeft color="#333" />
              </Button>
              <div>
                <h3>PointManager</h3>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <Col md={6} className="mb-1">
                <Form.Label className="form-label-custom">
                  Site <span className="text-danger">*</span>
                </Form.Label>

                <Form.Select className="form-select-custom" name="siteId" value={formData.siteId} onChange={handleChange}>
                  <option value="">-- Chọn Khu Vực --</option>

                  {/* 👇 Duyệt qua danh sách Site thật để tạo option */}
                  {sites.map((s) => (
                    <option key={s.siteId} value={s.siteId}>
                      {s.siteName} {/* Hiển thị Tên cho dễ nhìn */}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              {/* Add Button */}
              <Button
                variant="primary"
                onClick={() => {
                  setFormData(initialForm);
                  setShowAddModal(true);
                }}
                className="d-flex align-items-center gap-2 shadow-sm px-4 py-2"
                style={{ borderRadius: "10px", fontWeight: "600" }}
              >
                <FaPlus /> Add New
              </Button>
            </div>
          </div>

          {/* TABLE */}
          {loading && (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          )}

          <div className="table-responsive">
            <Table hover className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>#</th>
                  <th>Point Name</th>
                  <th>Site</th>
                  <th>Longitude</th>
                  <th>Latitude</th>
                  <th>Type</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {points.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No stop points found.
                    </td>
                  </tr>
                ) : (
                  points.map((p, idx) => (
                    <tr key={p.parkPointId || idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <div className="fw-bold text-dark">{p.dockName}</div>
                        <small className="text-muted">{p.dockShowName}</small>
                      </td>
                      <td>
                        <span className="fw-bold text-secondary">{getSiteName(p.siteId)}</span>
                      </td>
                      <td style={{ fontFamily: "monospace", color: "#64748b" }}>{p.longitude}</td>
                      <td style={{ fontFamily: "monospace", color: "#64748b" }}>{p.latitude}</td>
                      <td>
                        <div className="d-flex gap-2">
                          {p.isCharge === 0 && (
                            <span className="status-pill pill-charge">
                              <FaBolt size={10} /> Charge
                            </span>
                          )}
                          {p.isLoad === 0 && (
                            <span className="status-pill pill-load">
                              <FaBoxOpen size={10} /> Load
                            </span>
                          )}
                          {p.isCharge !== 0 && p.isLoad !== 0 && <span className="status-pill pill-normal">Normal</span>}
                        </div>
                      </td>
                      <td className="text-end">
                        <button className="btn-icon text-primary-hover" title="View" onClick={() => viewDetail(p.parkPointId)}>
                          <FaEye />
                        </button>
                        <button className="btn-icon text-warning-hover" title="Edit" onClick={() => openEditModal(p)}>
                          <FaEdit />
                        </button>
                        <button className="btn-icon text-danger-hover" title="Delete" onClick={() => deletePoint(p.parkPointId)}>
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* PAGINATION */}
          <div className="pagination-wrapper">
            <span className="text-muted small">
              Showing page {currentPage} of {Math.ceil(totalPoints / pageSize) || 1} ({totalPoints} items)
            </span>
            <div className="d-flex gap-2">
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                Previous
              </button>
              <button className="page-btn" disabled={points.length < pageSize} onClick={() => setCurrentPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </Card>

        {/* --- MODAL ADD --- */}
        <Modal show={showAddModal} onHide={() => setShowAddModal(false)} scrollable dialogClassName="modal-extra-wide" centered>
          <Modal.Header closeButton>
            <Modal.Title>Add New Stop Point</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-light px-4 py-3">{renderFormFields()}</Modal.Body>
          <Modal.Footer>
            <Button variant="link" className="text-muted text-decoration-none" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={addPoint} className="px-4 fw-bold">
              Create Point
            </Button>
          </Modal.Footer>
        </Modal>

        {/* --- MODAL EDIT --- */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} scrollable dialogClassName="modal-extra-wide" centered>
          <Modal.Header closeButton>
            <Modal.Title>Edit Stop Point</Modal.Title>
          </Modal.Header>
          <Modal.Body className="bg-light px-4 py-3">{renderFormFields()}</Modal.Body>
          <Modal.Footer>
            <Button variant="link" className="text-muted text-decoration-none" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="warning" onClick={editPoint} className="px-4 fw-bold text-white">
              Save Changes
            </Button>
          </Modal.Footer>
        </Modal>

        {/* --- MODAL DETAIL --- */}
        <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Point Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedPoint ? (
              <Table bordered hover className="mb-0">
                <tbody>
                  {Object.entries(selectedPoint).map(([k, v]) => (
                    <tr key={k}>
                      <td className="bg-light fw-bold text-secondary" style={{ width: "40%" }}>
                        {k}
                      </td>
                      <td style={{ wordBreak: "break-all" }}>{v?.toString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <div className="text-center p-4">
                <Spinner variant="primary" />
              </div>
            )}
          </Modal.Body>
        </Modal>

        <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide style={{ position: "fixed", bottom: 30, right: 30, zIndex: 9999 }}>
          <Toast.Header
            className={toastMessage.includes("Success") || toastMessage.includes("successfully") ? "bg-success text-white" : "bg-danger text-white"}
          >
            <strong className="me-auto">Notification</strong>
          </Toast.Header>
          <Toast.Body className="bg-white">{toastMessage}</Toast.Body>
        </Toast>
      </Container>
    </div>
  );
}
