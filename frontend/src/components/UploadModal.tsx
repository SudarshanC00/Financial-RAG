"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/api";
import { DocumentInfo } from "@/lib/types";

interface UploadModalProps {
    onClose: () => void;
    onUploaded: (doc: DocumentInfo) => void;
}

export default function UploadModal({ onClose, onUploaded }: UploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [companyName, setCompanyName] = useState("");
    const [documentTitle, setDocumentTitle] = useState("");
    const [documentDate, setDocumentDate] = useState("");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setError("");
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "application/pdf": [".pdf"] },
        maxFiles: 1,
        multiple: false,
    });

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !companyName.trim()) return;

        setUploading(true);
        setError("");

        try {
            const doc = await api.uploadDocument(
                file,
                companyName.trim(),
                documentTitle.trim(),
                documentDate.trim(),
            );
            onUploaded(doc);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__title">
                    📄 Upload Financial Document
                    <button className="modal__close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div
                        {...getRootProps()}
                        className={`dropzone ${isDragActive ? "dropzone--active" : ""}`}
                    >
                        <input {...getInputProps()} />
                        {!file ? (
                            <>
                                <div className="dropzone__icon">📁</div>
                                <div className="dropzone__text">
                                    {isDragActive
                                        ? "Drop your PDF here..."
                                        : "Drag & drop a PDF, or click to select"}
                                </div>
                                <div className="dropzone__hint">
                                    Supports 10-K, 10-Q, Annual Reports, and other financial filings
                                </div>
                            </>
                        ) : (
                            <div className="dropzone__file">
                                <span>📄</span>
                                <span className="dropzone__file-name">{file.name}</span>
                                <span className="dropzone__file-size">
                                    {formatFileSize(file.size)}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Company Name *</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="e.g., Apple Inc."
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Document Title</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="e.g., 10-K Annual Report FY2025"
                            value={documentTitle}
                            onChange={(e) => setDocumentTitle(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Filing Date / Period</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="e.g., Sep 28, 2025"
                            value={documentDate}
                            onChange={(e) => setDocumentDate(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div style={{ color: "var(--error)", fontSize: "0.85rem", marginTop: "12px" }}>
                            ❌ {error}
                        </div>
                    )}

                    <button
                        className="form-submit"
                        type="submit"
                        disabled={!file || !companyName.trim() || uploading}
                    >
                        {uploading ? (
                            <>
                                <span className="spinner" /> Uploading...
                            </>
                        ) : (
                            "Upload & Process"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
