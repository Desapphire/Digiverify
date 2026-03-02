import React, { useState, useEffect, useMemo } from "react";
import API from "../services/api";
import formatFileSize from "../utils/formatFileSize";

function VerifierDashboard({ user }) {
  const [documents, setDocuments] = useState([]);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState(null); // { id, action: 'verify'|'reject', title }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPendingDocuments = async () => {
    try {
      const res = await API.get("/documents/pending");
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      showToast("Failed to fetch pending documents", "error");
    }
  };

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  const handleVerify = async (id) => {
    try {
      const res = await API.put(`/documents/verify/${id}`);
      if (res.data.success) {
        showToast("Document verified successfully!");
        fetchPendingDocuments();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Verification failed.", "error");
    }
    setModal(null);
  };

  const handleReject = async (id) => {
    try {
      const res = await API.put(`/documents/reject/${id}`);
      if (res.data.success) {
        showToast("Document rejected.");
        fetchPendingDocuments();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Rejection failed.", "error");
    }
    setModal(null);
  };

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      return (
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.owner && doc.owner.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [documents, searchTerm]);

  // Bug #10: formatFileSize is now imported from src/utils/formatFileSize.js

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="dashboard">
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span className="icon">{toast.type === "success" ? "check_circle" : "error"}</span>
          {toast.message}
        </div>
      )}

      {/* Confirmation Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{modal.action === "verify" ? "Verify Document" : "Reject Document"}</h3>
            <p>
              Are you sure you want to <strong>{modal.action}</strong> the document
              "<strong>{modal.title}</strong>"? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                className={`btn-confirm ${modal.action}`}
                onClick={() =>
                  modal.action === "verify"
                    ? handleVerify(modal.id)
                    : handleReject(modal.id)
                }
              >
                {modal.action === "verify" ? "Verify" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="dash-header">
        <div className="dash-header-left">
          <h1>Verifier Dashboard</h1>
          <p>Review and verify pending document submissions.</p>
        </div>
        <div className="dash-header-right">
          <div className="dash-date">
            <span className="icon" style={{ fontSize: 16 }}>calendar_today</span>
            {today}
          </div>
          <button className="btn-refresh" onClick={fetchPendingDocuments}>
            <span className="icon" style={{ fontSize: 16 }}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon yellow">
            <span className="icon">pending_actions</span>
          </div>
          <div className="stat-details">
            <h3>{documents.length}</h3>
            <p>Pending Reviews</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">
            <span className="icon">rate_review</span>
          </div>
          <div className="stat-details">
            <h3>{filteredDocs.length}</h3>
            <p>Showing Results</p>
          </div>
        </div>
      </div>

      {/* Section Header + Search */}
      <div className="section-header">
        <div className="section-title">
          <span className="icon">assignment</span>
          Pending Documents
          <span className="count-badge">{filteredDocs.length}</span>
        </div>
      </div>

      <div className="search-filter-bar">
        <div className="search-box">
          <span className="icon">search</span>
          <input
            type="text"
            placeholder="Search by title, description, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {filteredDocs.length === 0 ? (
        <div className="table-card">
          <div className="empty-state">
            <span className="icon">task_alt</span>
            <h4>No pending documents</h4>
            <p>{documents.length === 0 ? "All documents have been reviewed. Great job!" : "No documents match your search."}</p>
          </div>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>File</th>
                <th>Size</th>
                <th>Owner</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc, index) => (
                <tr key={doc._id}>
                  <td>{index + 1}</td>
                  <td className="td-title">{doc.title}</td>
                  <td className="td-link">
                    <a
                      href={`${API.defaults.baseURL}/documents/file/${doc._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="icon" style={{ fontSize: 14 }}>attachment</span>
                      {doc.originalName || "View File"}
                    </a>
                  </td>
                  <td className="td-date">{formatFileSize(doc.fileSize)}</td>
                  <td>{doc.owner ? doc.owner.name : "Unknown"}</td>
                  <td className="td-date">{new Date(doc.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="btn-action verify"
                        onClick={() => setModal({ id: doc._id, action: "verify", title: doc.title })}
                      >
                        <span className="icon">check_circle</span>
                        Verify
                      </button>
                      <button
                        className="btn-action reject"
                        onClick={() => setModal({ id: doc._id, action: "reject", title: doc.title })}
                      >
                        <span className="icon">cancel</span>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default VerifierDashboard;
