"use client";

import React from "react";
import Link from "next/link";
import { DocumentInfo } from "@/lib/types";

interface SidebarProps {
    documents: DocumentInfo[];
    activeDocId?: string;
    onUploadClick: () => void;
    onDeleteDoc: (docId: string) => void;
}

const statusIcons: Record<string, string> = {
    ready: "✅",
    processing: "⏳",
    uploading: "📤",
    error: "❌",
};

export default function Sidebar({
    documents,
    activeDocId,
    onUploadClick,
    onDeleteDoc,
}: SidebarProps) {
    return (
        <aside className="sidebar">
            <div className="sidebar__header">
                <div className="sidebar__title">Documents</div>
                <button className="sidebar__upload-btn" onClick={onUploadClick}>
                    ＋ Upload Document
                </button>
            </div>

            <div className="sidebar__list">
                {documents.length === 0 ? (
                    <div className="sidebar__empty">
                        <div className="sidebar__empty-icon">📂</div>
                        <div>No documents yet.</div>
                        <div>Upload a financial filing to get started.</div>
                    </div>
                ) : (
                    documents.map((doc) => (
                        <Link
                            key={doc.id}
                            href={doc.status === "ready" ? `/chat/${doc.id}` : "#"}
                            className={`doc-card ${activeDocId === doc.id ? "doc-card--active" : ""}`}
                            onClick={(e) => {
                                if (doc.status !== "ready") e.preventDefault();
                            }}
                        >
                            <div
                                className={`doc-card__icon doc-card__icon--${doc.status}`}
                            >
                                {statusIcons[doc.status] || "📄"}
                            </div>
                            <div className="doc-card__info">
                                <div className="doc-card__name">{doc.company_name}</div>
                                <div className="doc-card__meta">
                                    {doc.filename}
                                </div>
                            </div>
                            <span className={`doc-card__status doc-card__status--${doc.status}`}>
                                {doc.status}
                            </span>
                            <button
                                className="doc-card__delete"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (confirm(`Delete "${doc.company_name}" document?`)) {
                                        onDeleteDoc(doc.id);
                                    }
                                }}
                                title="Delete document"
                            >
                                🗑
                            </button>
                        </Link>
                    ))
                )}
            </div>
        </aside>
    );
}
