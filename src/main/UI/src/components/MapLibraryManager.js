import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_MAP_UPLOAD, API_MAP_LIBRARY, API_MAP_DELETE } from "../api";

export default function MapLibraryManager({ setManagerTab }) {
    const [maps, setMaps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [mapName, setMapName] = useState("");
    const [selectedFiles, setSelectedFiles] = useState(null);
    const [message, setMessage] = useState("");
    const fileInputRef = useRef(null);

    // Load map library on mount
    useEffect(() => {
        fetchMaps();
    }, []);

    const fetchMaps = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_MAP_LIBRARY);
            setMaps(res.data);
        } catch (err) {
            console.error("Error fetching map library:", err);
        }
        setLoading(false);
    };

    // Handle folder selection
    const handleDirectorySelect = (e) => {
        const files = Array.from(e.target.files);
        const yamlFile = files.find(
            (f) => f.name.endsWith(".yaml") || f.name.endsWith(".yml")
        );
        const jsonFile = files.find((f) => f.name.endsWith(".json"));
        const pngFile = files.find((f) => f.name.endsWith(".png"));

        if (pngFile && jsonFile && yamlFile) {
            setSelectedFiles({ mapFile: pngFile, topoFile: jsonFile, configFile: yamlFile });
            setMessage(`Selected: ${pngFile.name}, ${jsonFile.name}, ${yamlFile.name}`);
        } else {
            setSelectedFiles(null);
            setMessage("⚠️ Folder must contain .png, .json, and .yaml/.yml files");
        }
    };

    // Upload map
    const handleUpload = async () => {
        if (!selectedFiles || !mapName.trim()) {
            setMessage("⚠️ Please select a folder and enter a map name");
            return;
        }

        setUploading(true);
        setMessage("");
        try {
            const formData = new FormData();
            formData.append("mapFile", selectedFiles.mapFile);
            formData.append("topoFile", selectedFiles.topoFile);
            formData.append("configFile", selectedFiles.configFile);
            formData.append("mapName", mapName.trim());

            const res = await axios.post(API_MAP_UPLOAD, formData);
            if (res.data.success) {
                setMessage("✅ Map uploaded successfully!");
                alert("✅ Map '" + mapName.trim() + "' uploaded successfully!\n\nDownload link:\n" + res.data.fullDownloadUrl);
                setMapName("");
                setSelectedFiles(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                fetchMaps();
            } else {
                setMessage("❌ " + res.data.error);
            }
        } catch (err) {
            setMessage("❌ Upload failed: " + err.message);
        }
        setUploading(false);
    };

    // Delete map
    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete map "${name}"?`)) return;
        try {
            await axios.delete(API_MAP_DELETE(id));
            setMessage(`🗑️ Deleted "${name}"`);
            fetchMaps();
        } catch (err) {
            setMessage("❌ Delete failed: " + err.message);
        }
    };

    // Copy download link
    const handleCopyLink = (url) => {
        navigator.clipboard.writeText(url);
        setMessage("📋 Download link copied!");
        setTimeout(() => setMessage(""), 2000);
    };

    const formatDate = (iso) => {
        if (!iso) return "—";
        return new Date(iso).toLocaleString();
    };

    const formatSize = (bytes) => {
        if (!bytes) return "—";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.title}>🗺️ Map Library</h2>
                <button style={styles.closeBtn} onClick={() => setManagerTab(null)}>
                    ✕
                </button>
            </div>

            {/* Upload Section */}
            <div style={styles.uploadSection}>
                <h3 style={styles.sectionTitle}>Upload New Map</h3>
                <div style={styles.uploadForm}>
                    <div style={styles.formRow}>
                        <label style={styles.label}>Map Name:</label>
                        <input
                            type="text"
                            value={mapName}
                            onChange={(e) => setMapName(e.target.value)}
                            placeholder="e.g. Floor 1, Building A"
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.formRow}>
                        <label style={styles.label}>Map Folder:</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            webkitdirectory=""
                            directory=""
                            onChange={handleDirectorySelect}
                            style={styles.fileInput}
                        />
                    </div>
                    <button
                        style={{
                            ...styles.uploadBtn,
                            opacity: uploading || !selectedFiles || !mapName.trim() ? 0.5 : 1,
                        }}
                        onClick={handleUpload}
                        disabled={uploading || !selectedFiles || !mapName.trim()}
                    >
                        {uploading ? "Uploading..." : "📤 Upload Map"}
                    </button>
                </div>
                {message && <div style={styles.message}>{message}</div>}
            </div>

            {/* Map Library Table */}
            <div style={styles.tableSection}>
                <h3 style={styles.sectionTitle}>
                    Available Maps ({maps.length})
                    <button style={styles.refreshBtn} onClick={fetchMaps} disabled={loading}>
                        🔄
                    </button>
                </h3>

                {loading ? (
                    <p style={styles.loadingText}>Loading...</p>
                ) : maps.length === 0 ? (
                    <p style={styles.emptyText}>No maps uploaded yet.</p>
                ) : (
                    <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>#</th>
                                    <th style={styles.th}>Map Name</th>
                                    <th style={styles.th}>Size</th>
                                    <th style={styles.th}>Uploaded</th>
                                    <th style={styles.th}>Download Link</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {maps.map((m, idx) => (
                                    <tr key={m.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                                        <td style={styles.td}>{idx + 1}</td>
                                        <td style={{ ...styles.td, fontWeight: "bold" }}>{m.mapName}</td>
                                        <td style={styles.td}>{formatSize(m.fileSizeBytes)}</td>
                                        <td style={styles.td}>{formatDate(m.createdAt)}</td>
                                        <td style={styles.td}>
                                            <span
                                                style={styles.linkText}
                                                title={m.fullDownloadUrl}
                                                onClick={() => handleCopyLink(m.fullDownloadUrl)}
                                            >
                                                📋 Copy Link
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                style={styles.deleteBtn}
                                                onClick={() => handleDelete(m.id, m.mapName)}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        background: "#1e1e2e",
        color: "#cdd6f4",
        borderRadius: "12px",
        padding: "24px",
        width: "90%",
        maxWidth: "900px",
        margin: "20px auto",
        maxHeight: "85vh",
        overflowY: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        borderBottom: "1px solid #45475a",
        paddingBottom: "12px",
    },
    title: { margin: 0, fontSize: "20px", color: "#89b4fa" },
    closeBtn: {
        background: "none",
        border: "none",
        color: "#f38ba8",
        fontSize: "20px",
        cursor: "pointer",
        padding: "4px 8px",
    },
    uploadSection: {
        background: "#313244",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "20px",
    },
    sectionTitle: {
        margin: "0 0 12px 0",
        fontSize: "15px",
        color: "#a6adc8",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    uploadForm: { display: "flex", flexDirection: "column", gap: "10px" },
    formRow: { display: "flex", alignItems: "center", gap: "10px" },
    label: { minWidth: "100px", fontSize: "13px", color: "#bac2de" },
    input: {
        flex: 1,
        padding: "8px 12px",
        borderRadius: "6px",
        border: "1px solid #45475a",
        background: "#1e1e2e",
        color: "#cdd6f4",
        fontSize: "13px",
        outline: "none",
    },
    fileInput: { flex: 1, fontSize: "13px", color: "#cdd6f4" },
    uploadBtn: {
        alignSelf: "flex-start",
        padding: "8px 20px",
        borderRadius: "6px",
        border: "none",
        background: "#89b4fa",
        color: "#1e1e2e",
        fontWeight: "bold",
        fontSize: "13px",
        cursor: "pointer",
    },
    message: {
        marginTop: "10px",
        padding: "8px 12px",
        borderRadius: "6px",
        background: "#45475a",
        fontSize: "13px",
    },
    tableSection: { background: "#313244", borderRadius: "8px", padding: "16px" },
    refreshBtn: {
        background: "none",
        border: "none",
        fontSize: "14px",
        cursor: "pointer",
        padding: "2px 6px",
    },
    loadingText: { textAlign: "center", color: "#6c7086" },
    emptyText: { textAlign: "center", color: "#6c7086", fontStyle: "italic" },
    tableWrapper: { overflowX: "auto" },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "13px",
    },
    th: {
        textAlign: "left",
        padding: "10px 12px",
        borderBottom: "2px solid #45475a",
        color: "#89b4fa",
        fontWeight: "600",
        whiteSpace: "nowrap",
    },
    td: {
        padding: "8px 12px",
        borderBottom: "1px solid #313244",
        verticalAlign: "middle",
    },
    trEven: { background: "#1e1e2e" },
    trOdd: { background: "transparent" },
    linkText: {
        color: "#a6e3a1",
        cursor: "pointer",
        textDecoration: "underline",
        fontSize: "12px",
    },
    deleteBtn: {
        background: "#f38ba8",
        color: "#1e1e2e",
        border: "none",
        borderRadius: "4px",
        padding: "4px 10px",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: "bold",
    },
};
