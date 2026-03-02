import React, { useState, useEffect, useMemo } from "react";
import API from "../services/api";
import formatFileSize from "../utils/formatFileSize";

function AdminDashboard({ user }) {
  const [analytics, setAnalytics] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAnalytics = async () => {
    try {
      const res = await API.get("/admin/analytics");
      if (res.data.success) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      showToast("Failed to fetch analytics", "error");
    }
  };

  const fetchAllDocuments = async () => {
    try {
      const res = await API.get("/documents/all");
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      showToast("Failed to fetch documents", "error");
    }
  };

  const refreshAll = () => {
    fetchAnalytics();
    fetchAllDocuments();
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.owner && doc.owner.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === "all" || doc.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [documents, searchTerm, statusFilter]);

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

      {/* Header */}
      <div className="dash-header">
        <div className="dash-header-left">
          <h1>Admin Dashboard</h1>
          <p>System overview and document management.</p>
        </div>
        <div className="dash-header-right">
          <div className="dash-date">
            <span className="icon" style={{ fontSize: 16 }}>calendar_today</span>
            {today}
          </div>
          <button className="btn-refresh" onClick={refreshAll}>
            <span className="icon" style={{ fontSize: 16 }}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="analytics-grid">
          <div className="analytics-card total-users">
            <div className="analytics-card-icon">
              <span className="icon">group</span>
            </div>
            <h3>{analytics.totalUsers}</h3>
            <p>Total Users</p>
          </div>
          <div className="analytics-card total-docs">
            <div className="analytics-card-icon">
              <span className="icon">description</span>
            </div>
            <h3>{analytics.totalDocuments}</h3>
            <p>Total Documents</p>
          </div>
          <div className="analytics-card verified">
            <div className="analytics-card-icon">
              <span className="icon">check_circle</span>
            </div>
            <h3>{analytics.verifiedDocuments}</h3>
            <p>Verified</p>
          </div>
          <div className="analytics-card pending">
            <div className="analytics-card-icon">
              <span className="icon">schedule</span>
            </div>
            <h3>{analytics.pendingDocuments}</h3>
            <p>Pending</p>
          </div>
          <div className="analytics-card rejected">
            <div className="analytics-card-icon">
              <span className="icon">cancel</span>
            </div>
            <h3>{analytics.rejectedDocuments}</h3>
            <p>Rejected</p>
          </div>
        </div>
      )}

      {/* Documents Section */}
      <div className="section-header">
        <div className="section-title">
          <span className="icon">folder_open</span>
          All Documents
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
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      {filteredDocs.length === 0 ? (
        <div className="table-card">
          <div className="empty-state">
            <span className="icon">inbox</span>
            <h4>No documents found</h4>
            <p>{documents.length === 0 ? "No documents in the system yet." : "Try adjusting your search or filter."}</p>
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
                <th>Status</th>
                <th>Verified By</th>
                <th>Date</th>
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
                      {doc.originalName || "View"}
                    </a>
                  </td>
                  <td className="td-date">{formatFileSize(doc.fileSize)}</td>
                  <td>{doc.owner ? doc.owner.name : "Unknown"}</td>
                  <td>
                    <span className={`status-badge status-${doc.status}`}>
                      <span className="dot"></span>
                      {doc.status}
                    </span>
                  </td>
                  <td>{doc.verifiedBy ? doc.verifiedBy.name : "-"}</td>
                  <td className="td-date">{new Date(doc.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
