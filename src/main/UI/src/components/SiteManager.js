import React, { useEffect, useState } from "react";
import { Dropdown } from "react-bootstrap";
import { Container, Button, Table, Modal, Form, Spinner, Toast, Row, Col } from "react-bootstrap";
import { FaPlus, FaTrash, FaEye, FaEdit } from "react-icons/fa";
import axios from "axios";
import "../css/SiteManager.css";
import { API_SITE } from "../api";


export default function SiteManager({ setManagerTab }) {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false); // Modal chi tiết

  const [selectedSite, setSelectedSite] = useState(null); // Lưu site đang xem chi tiết
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalSites, setTotalSites] = useState(0);

  const initialForm = {
    siteId: "",
    siteName: "",
    longitude: 0,
    latitude: 0,
    deflectionX: 0,
    deflectionY: 0,
    height: 0,
    siteDetailAddress: "",
    siteRemark: "",
    siteStatus: 0,
  };

  const [formData, setFormData] = useState(initialForm);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // LẤY DANH SÁCH (Query Site Page)
  const fetchSites = async () => {
    setLoading(true);
    try {
      // Gọi API: /api/site/querySitePage?current=1&size=10
      const res = await axios.get(`${API_SITE}/querySitePage`, {
        params: {
          current: currentPage,
          size: pageSize,
        },
      });

      if (res.data && res.data.data) {
        setSites(res.data.data.records || []);
        setTotalSites(res.data.data.total || 0);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách site:", error);
    } finally {
      setLoading(false);
    }
  };

  const addSite = async () => {
    try {
      setLoading(true);
      const payload = { ...formData };
      delete payload.siteId;

      await axios.post(`${API_SITE}/addSite`, payload);

      setToastMessage("Add site successfully!");
      setShowToast(true);
      fetchSites();
      setShowAddModal(false);
      setFormData(initialForm);
    } catch (error) {
      setToastMessage("Add failed!");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const editSite = async () => {
    try {
      setLoading(true);
      await axios.put(`${API_SITE}/updateSite`, formData);

      setToastMessage("Update site successfully!");
      setShowToast(true);
      fetchSites();
      setShowEditModal(false);
      setFormData(initialForm);
    } catch (error) {
      setToastMessage("Update failed!");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const deleteSite = async (id) => {
    if (!window.confirm("Are you sure delete this site?")) return;
    try {
      // Gọi API: DELETE /api/site/deleteSite?siteId=...
      await axios.delete(`${API_SITE}/deleteSite`, {
        params: { siteId: id },
      });

      setToastMessage("Delete successfully");
      setShowToast(true);
      fetchSites();
    } catch (error) {
      console.error(error);
      setToastMessage("Delete failed!");
      setShowToast(true);
    }
  };

  // XEM CHI TIẾT (Query Site Details) - SỬA LẠI
  const viewDetail = async (site) => {
    try {
      setLoading(true);
      // Gọi API: /api/site/querySiteDetails?siteId=...
      const res = await axios.get(`${API_SITE}/querySiteDetails`, {
        params: { siteId: site.siteId },
      });

      setSelectedSite(res.data); // Backend trả về Object SiteModel trực tiếp
      setShowDetailModal(true);
    } catch (error) {
      console.error("Lỗi xem chi tiết:", error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (site) => {
    setFormData({ ...site });
    setShowEditModal(true);
  };

  useEffect(() => {
    fetchSites();
  }, [currentPage]); // Load lại khi chuyển trang

  const renderStatus = (status) => {
    switch (status) {
      case 0:
        return <span className="badge bg-success">In Service</span>;
      case 1:
        return <span className="badge bg-warning text-dark">Maintenance</span>;
      case 2:
        return <span className="badge bg-danger">Down</span>;
      default:
        return status;
    }
  };

  return (
    <div className="site-manager-page">
      <Container style={{ maxWidth: "95%" }}>
        <div className="content-frame">
          <div className="d-flex justify-content-between align-items-center mb-4 site-header">
            <h2 className="mb-0">Site Manager</h2>
            <div className="d-flex align-items-center">
              <Dropdown>
                <Dropdown.Toggle className="manager-dropdown-toggle" variant="outline-secondary">
                  Basic Manager
                </Dropdown.Toggle>

                <Dropdown.Menu className="manager-dropdown-menu">
                  <Dropdown.Item onClick={() => setManagerTab("car")}>RobotManager</Dropdown.Item>
                  <Dropdown.Item onClick={() => setManagerTab("parkpoint")}>ParkPointManager</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              <Button
                variant="primary"
                onClick={() => {
                  setFormData(initialForm);
                  setShowAddModal(true);
                }}
                className="ms-2"
              >
                <FaPlus className="me-2" /> Add Site
              </Button>
            </div>
          </div>

          {loading && (
            <div className="text-center">
              <Spinner animation="border" className="mb-3" />
            </div>
          )}

          <Table striped bordered hover responsive size="sm">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Address</th>
                <th>Longitude</th>
                <th>Latitude</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site, idx) => (
                <tr key={site.siteId || idx}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: "bold" }}>{site.siteName}</td>
                  <td>{site.siteDetailAddress}</td>
                  <td>{site.longitude}</td>
                  <td>{site.latitude}</td>
                  <td>{renderStatus(site.siteStatus)}</td>
                  <td>
                    <Button variant="info" size="sm" className="me-2" onClick={() => viewDetail(site)}>
                      <FaEye />
                    </Button>
                    <Button variant="warning" size="sm" className="me-2" onClick={() => openEditModal(site)}>
                      <FaEdit />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => deleteSite(site.siteId)}>
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {/* PHÂN TRANG ĐƠN GIẢN */}
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
              Prev
            </Button>
            <span className="align-self-center">
              Page {currentPage} (Total: {totalSites})
            </span>
            <Button disabled={sites.length < pageSize} onClick={() => setCurrentPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>

        {/* --- MODAL FORM (Add/Edit) --- */}
        {[showAddModal, showEditModal].some(Boolean) && (
          <Modal
            show={showAddModal || showEditModal}
            onHide={() => {
              setShowAddModal(false);
              setShowEditModal(false);
            }}
            size="lg"
          >
            <Modal.Header closeButton>
              <Modal.Title>{showAddModal ? "Add New Site" : "Edit Site"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Label>Site Name</Form.Label>
                    <Form.Control name="siteName" value={formData.siteName} onChange={handleChange} />
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Label>Address</Form.Label>
                    <Form.Control name="siteDetailAddress" value={formData.siteDetailAddress} onChange={handleChange} />
                  </Col>
                  <Col md={4} className="mb-3">
                    <Form.Label>Longitude</Form.Label>
                    <Form.Control type="number" name="longitude" value={formData.longitude} onChange={handleChange} />
                  </Col>
                  <Col md={4} className="mb-3">
                    <Form.Label>Latitude</Form.Label>
                    <Form.Control type="number" name="latitude" value={formData.latitude} onChange={handleChange} />
                  </Col>
                  <Col md={4} className="mb-3">
                    <Form.Label>Height</Form.Label>
                    <Form.Control type="number" name="height" value={formData.height} onChange={handleChange} />
                  </Col>
                  <Col md={4} className="mb-3">
                    <Form.Label>Deflection X</Form.Label>
                    <Form.Control type="number" name="deflectionX" value={formData.deflectionX} onChange={handleChange} />
                  </Col>
                  <Col md={4} className="mb-3">
                    <Form.Label>Deflection Y</Form.Label>
                    <Form.Control type="number" name="deflectionY" value={formData.deflectionY} onChange={handleChange} />
                  </Col>
                  <Col md={4} className="mb-3">
                    <Form.Label>Status</Form.Label>
                    <Form.Select name="siteStatus" value={formData.siteStatus} onChange={handleChange}>
                      <option value="0">In Service (0)</option>
                      <option value="1">Maintenance (1)</option>
                      <option value="2">Down (2)</option>
                    </Form.Select>
                  </Col>
                  <Col md={12}>
                    <Form.Label>Remark</Form.Label>
                    <Form.Control as="textarea" rows={2} name="siteRemark" value={formData.siteRemark} onChange={handleChange} />
                  </Col>
                </Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
              >
                Close
              </Button>
              <Button variant={showAddModal ? "primary" : "warning"} onClick={showAddModal ? addSite : editSite}>
                {loading ? <Spinner size="sm" /> : showAddModal ? "Add Site" : "Save Changes"}
              </Button>
            </Modal.Footer>
          </Modal>
        )}

        {/* --- MODAL DETAIL (Xem chi tiết) --- */}
        <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Site Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedSite ? (
              <Table bordered size="sm">
                <tbody>
                  {Object.entries(selectedSite).map(([key, value]) => (
                    <tr key={key}>
                      <td style={{ fontWeight: "bold", width: "30%" }}>{key}</td>
                      <td>{value === null ? "null" : value.toString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Spinner />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        <Toast
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={3000}
          autohide
          bg="info"
          style={{ position: "fixed", bottom: 20, right: 20, color: "white" }}
        >
          <Toast.Body>{toastMessage}</Toast.Body>
        </Toast>
      </Container>
    </div>
  );
}
