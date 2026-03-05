import React, { useEffect, useState } from "react";
import { Container, Button, Table, Modal, Form, Card, Row, Col, ListGroup, Badge } from "react-bootstrap";
import { FaArrowLeft, FaExchangeAlt, FaTrash, FaPlus, FaLink } from "react-icons/fa";
import axios from "axios";
import "../css/ParkPointManager.css";
import { API_ROBOT, API_SITE , API_RELATION } from "../api";


export default function SiteRelationRobot({ setManagerTab }) {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [siteRobots, setSiteRobots] = useState([]); // Robot đã thuộc site này
  const [availableRobots, setAvailableRobots] = useState([]); // Robot chưa thuộc site nào

  const [showAddModal, setShowAddModal] = useState(false);

  // 1. Load Sites
  useEffect(() => {
    axios.get(`${API_SITE}/getSitePage?current=1&size=100`).then((res) => {
      if (res.data && res.data.data) setSites(res.data.data.records || []);
    });
  }, []);

  // 2. Load Robots của Site được chọn
  useEffect(() => {
    if (!selectedSite) return;
    axios.get(`${API_RELATION}/${selectedSite.siteId}/robots?current=1&size=100`).then((res) => {
      if (res.data.code === 0) setSiteRobots(res.data.data.records || []);
    });
  }, [selectedSite]);

  // 3. Load Available Robots (để thêm vào site)
  const fetchAvailableRobots = () => {
    // Lấy tất cả robot, sau đó client-side filter những con chưa có siteId hoặc siteId rỗng
    // (Cách này tạm thời vì API search chưa hỗ trợ filter siteId=null chuẩn)
    axios.get(`${API_ROBOT}?current=1&size=100`).then((res) => {
      if (res.data.code === 0) {
        const all = res.data.data.records || [];
        const free = all.filter((r) => !r.siteId); // Lọc robot tự do
        setAvailableRobots(free);
        setShowAddModal(true);
      }
    });
  };

  // 4. Thêm Robot vào Site (PUT)
  const addRobotToSite = async (robotId) => {
    if (!selectedSite) return;
    try {
      // PUT /api/sites/{siteId}/robots/{robotId}
      await axios.put(`${API_RELATION}/${selectedSite.siteId}/robots/${robotId}`);

      // Refresh list
      const res = await axios.get(`${API_RELATION}/${selectedSite.siteId}/robots?current=1&size=100`);
      setSiteRobots(res.data.data.records || []);

      // Remove form available list
      setAvailableRobots((prev) => prev.filter((r) => r.robotId !== robotId));
    } catch (e) {
      alert("Error adding robot");
    }
  };

  // 5. Xóa Robot khỏi Site (DELETE)
  const removeRobotFromSite = async (robotId) => {
    if (!window.confirm("Remove this robot from current site?")) return;
    try {
      await axios.delete(`${API_RELATION}/${selectedSite.siteId}/robots/${robotId}`);

      // Refresh
      setSiteRobots((prev) => prev.filter((r) => r.robotId !== robotId));
    } catch (e) {
      alert("Error removing robot");
    }
  };

  return (
    <div className="park-point-page">
      <Container fluid="lg">
        <Card className="modern-card" style={{ minHeight: "80vh" }}>
          <div className="card-header-custom">
            <div className="page-title">
              <Button variant="light" className="btn-icon me-3 border shadow-sm" onClick={() => setManagerTab("site")}>
                <FaArrowLeft color="#333" />
              </Button>
              <h3>
                <FaExchangeAlt className="me-2 text-primary" /> Site & Robot Relationship
              </h3>
            </div>
          </div>

          <Row className="g-0 h-100">
            {/* --- CỘT TRÁI: DANH SÁCH SITE --- */}
            <Col md={4} className="border-end bg-light p-3">
              <h6 className="text-muted fw-bold mb-3">SELECT A SITE</h6>
              <ListGroup variant="flush" className="shadow-sm rounded-3 overflow-hidden">
                {sites.map((site) => (
                  <ListGroup.Item
                    key={site.siteId}
                    action
                    active={selectedSite?.siteId === site.siteId}
                    onClick={() => setSelectedSite(site)}
                    className="d-flex justify-content-between align-items-center py-3"
                  >
                    <div>
                      <div className="fw-bold">{site.siteName}</div>
                      <small className="opacity-75">{site.siteDetailAddress || "No Address"}</small>
                    </div>
                    <FaLink opacity={selectedSite?.siteId === site.siteId ? 1 : 0.2} />
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Col>

            {/* --- CỘT PHẢI: ROBOT TRONG SITE --- */}
            <Col md={8} className="p-4 bg-white">
              {selectedSite ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <h5 className="mb-1 text-dark fw-bold">
                        Robots in: <span className="text-primary">{selectedSite.siteName}</span>
                      </h5>
                      <small className="text-muted">Managed {siteRobots.length} robots</small>
                    </div>
                    <Button variant="success" className="shadow-sm" onClick={fetchAvailableRobots}>
                      <FaPlus className="me-2" /> Add Robot to Site
                    </Button>
                  </div>

                  <Table hover className="custom-table">
                    <thead className="bg-light">
                      <tr>
                        <th>Robot Name</th>
                        <th>Model</th>
                        <th>Status</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siteRobots.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-5 text-muted">
                            No robots in this site yet.
                          </td>
                        </tr>
                      ) : (
                        siteRobots.map((r) => (
                          <tr key={r.robotId}>
                            <td className="fw-bold text-primary">{r.robotName}</td>
                            <td>{r.robotModelName}</td>
                            <td>
                              <Badge bg="info">{r.status}</Badge>
                            </td>
                            <td className="text-end">
                              <Button variant="outline-danger" size="sm" onClick={() => removeRobotFromSite(r.robotId)}>
                                <FaTrash className="me-1" /> Unlink
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </>
              ) : (
                <div className="text-center mt-5 pt-5 text-muted">
                  <FaArrowLeft size={30} className="mb-3" />
                  <h5>Please select a Site from the left list</h5>
                </div>
              )}
            </Col>
          </Row>
        </Card>

        {/* --- MODAL ADD ROBOT --- */}
        <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Add Robot to Site</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: "400px", overflowY: "auto" }}>
            {availableRobots.length === 0 ? (
              <p className="text-center text-muted">No free robots available.</p>
            ) : (
              <ListGroup>
                {availableRobots.map((r) => (
                  <ListGroup.Item key={r.robotId} className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{r.robotName}</strong> <span className="text-muted">({r.robotModelName})</span>
                    </div>
                    <Button size="sm" variant="outline-success" onClick={() => addRobotToSite(r.robotId)}>
                      Add <FaPlus />
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Modal.Body>
        </Modal>
      </Container>
    </div>
  );
}
