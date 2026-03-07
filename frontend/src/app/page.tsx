"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { DocumentInfo } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import UploadModal from "@/components/UploadModal";

export default function HomePage() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
    } catch {
      console.error("Failed to fetch documents");
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    // Poll for status updates every 5 seconds
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const handleUploaded = (doc: DocumentInfo) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleDelete = async (docId: string) => {
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      console.error("Failed to delete document");
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        documents={documents}
        onUploadClick={() => setShowUpload(true)}
        onDeleteDoc={handleDelete}
      />

      <div className="main-content">
        <header className="app-header">
          <div className="app-header__logo">
            <div className="app-header__logo-icon">📊</div>
            Financial RAG Analyst
            <span className="app-header__badge">AI Powered</span>
          </div>
        </header>

        <div className="landing">
          <div className="landing__icon">🏦</div>
          <h1 className="landing__title">
            Analyze Any Financial Document
          </h1>
          <p className="landing__subtitle">
            Upload SEC filings, annual reports, or financial statements from any company.
            Ask questions and get cited, data-driven answers powered by AI.
          </p>
          <button
            className="landing__cta"
            onClick={() => setShowUpload(true)}
          >
            📄 Upload Your First Document
          </button>
        </div>
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
}
