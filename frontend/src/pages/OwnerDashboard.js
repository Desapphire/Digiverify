import React, { useState, useEffect, useMemo, useRef } from "react";
import API from "../services/api";
import formatFileSize from "../utils/formatFileSize";

function OwnerDashboard({ user }) {
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const fileInputRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDocuments = async () => {
    try {
      const res = await API.get("/documents/my");
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      showToast("Failed to fetch documents", "error");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (16MB max)
      if (file.size > 16 * 1024 * 1024) {
        showToast("File size must be less than 16MB", "error");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      showToast("Please select a file to upload", "error");
      return;
    }

    if (!title.trim()) {
      showToast("Please enter a document title", "error");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title);
      formData.append("description", description);

      const res = await API.post("/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        showToast("Document uploaded successfully!");
        setTitle("");
        setDescription("");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        fetchDocuments();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setTitle("");
    setDescription("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const res = await API.delete(`/documents/${docId}`);
      if (res.data.success) {
        showToast("Document deleted successfully!");
        fetchDocuments();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed.", "error");
    }
  };

  // Bug #10: formatFileSize is now imported from src/utils/formatFileSize.js

  const stats = useMemo(() => {
    const total = documents.length;
    const verified = documents.filter((d) => d.status === "verified").length;
    const pending = documents.filter((d) => d.status === "pending").length;
    const rejected = documents.filter((d) => d.status === "rejected").length;
    return { total, verified, pending, rejected };
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === "all" || doc.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [documents, searchTerm, statusFilter]);

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
          <h1>Owner Dashboard</h1>
          <p>Welcome back, {user.name}! Manage your documents here.</p>
        </div>
        <div className="dash-header-right">
          <div className="dash-date">
            <span className="icon" style={{ fontSize: 16 }}>calendar_today</span>
            {today}
          </div>
          <button className="btn-refresh" onClick={fetchDocuments}>
            <span className="icon" style={{ fontSize: 16 }}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue">
            <span className="icon">description</span>
          </div>
          <div className="stat-details">
            <h3>{stats.total}</h3>
            <p>Total Documents</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <span className="icon">check_circle</span>
          </div>
          <div className="stat-details">
            <h3>{stats.verified}</h3>
            <p>Verified</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">
            <span className="icon">schedule</span>
          </div>
          <div className="stat-details">
            <h3>{stats.pending}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <span className="icon">cancel</span>
          </div>
          <div className="stat-details">
            <h3>{stats.rejected}</h3>
            <p>Rejected</p>
          </div>
        </div>
      </div>

      {/* Upload Card */}
      <div className="upload-card">
        <div className="upload-card-header">
          <span className="icon">cloud_upload</span>
          <h3>Upload New Document</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="upload-form-grid">
            <div className="form-group">
              <label>Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Property Deed"
                required
              />
            </div>
            <div className="form-group">
              <label>Select File</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.txt"
                  required
                />
                {selectedFile && (
                  <div className="file-info">
                    <span className="icon" style={{ fontSize: 16, color: "var(--primary)" }}>attach_file</span>
                    <span className="file-name">{selectedFile.name}</span>
                    <span className="file-size">({formatFileSize(selectedFile.size)})</span>
                  </div>
                )}
              </div>
            </div>
            <div className="form-group full-width">
              <label>Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document..."
                rows="2"
              />
            </div>
          </div>
          <div className="upload-actions">
            <button type="button" className="btn-reset" onClick={handleReset} disabled={uploading}>
              <span className="icon" style={{ fontSize: 16 }}>restart_alt</span>
              Reset
            </button>
            <button type="submit" className="btn-upload" disabled={uploading}>
              {uploading ? (
                <>
                  <span className="icon" style={{ fontSize: 18 }}>hourglass_empty</span>
                  Uploading...
                </>
              ) : (
                <>
                  <span className="icon" style={{ fontSize: 18 }}>cloud_upload</span>
                  Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Documents Section */}
      <div className="section-header">
        <div className="section-title">
          <span className="icon">folder_open</span>
          My Documents
          <span className="count-badge">{filteredDocs.length}</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="search-filter-bar">
        <div className="search-box">
          <span className="icon">search</span>
          <input
            type="text"
            placeholder="Search documents..."
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
            <p>{documents.length === 0 ? "Upload your first document to get started." : "Try adjusting your search or filter."}</p>
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
                <th>Status</th>
                <th>Verified By</th>
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
                      {doc.originalName}
                    </a>
                  </td>
                  <td className="td-date">{formatFileSize(doc.fileSize)}</td>
                  <td>
                    <span className={`status-badge status-${doc.status}`}>
                      <span className="dot"></span>
                      {doc.status}
                    </span>
                  </td>
                  <td>{doc.verifiedBy ? doc.verifiedBy.name : "-"}</td>
                  <td className="td-date">{new Date(doc.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-btns">
                      <a
                        href={`${API.defaults.baseURL}/documents/file/${doc._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-action verify"
                        style={{ textDecoration: "none" }}
                      >
                        <span className="icon">visibility</span>
                        View
                      </a>
                      {doc.status === "pending" && (
                        <button
                          className="btn-action reject"
                          onClick={() => handleDelete(doc._id)}
                        >
                          <span className="icon">delete</span>
                          Delete
                        </button>
                      )}
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

export default OwnerDashboard;
