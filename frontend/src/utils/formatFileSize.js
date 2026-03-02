/**
 * Formats a byte count into a human-readable string (e.g. "2.5 MB").
 * Bug #10 — Extracted from duplicated code in all three dashboards.
 */
const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default formatFileSize;
