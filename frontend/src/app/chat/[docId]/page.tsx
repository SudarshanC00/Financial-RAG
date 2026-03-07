"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { DocumentInfo, ChatMessage as ChatMessageType } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import UploadModal from "@/components/UploadModal";
import ChatMessage, { LoadingMessage } from "@/components/ChatMessage";

const SUGGESTIONS = [
    "What was the total revenue for the latest quarter?",
    "Break down operating expenses by category",
    "What are the key risk factors mentioned?",
    "Compare net income year-over-year",
    "What is the current cash and equivalents position?",
    "Summarize the management discussion and analysis",
];

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const docId = params.docId as string;

    const [documents, setDocuments] = useState<DocumentInfo[]>([]);
    const [currentDoc, setCurrentDoc] = useState<DocumentInfo | null>(null);
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const fetchDocuments = useCallback(async () => {
        try {
            const docs = await api.listDocuments();
            setDocuments(docs);
        } catch {
            console.error("Failed to fetch documents");
        }
    }, []);

    const fetchCurrentDoc = useCallback(async () => {
        try {
            const doc = await api.getDocument(docId);
            setCurrentDoc(doc);
        } catch {
            router.push("/");
        }
    }, [docId, router]);

    useEffect(() => {
        fetchDocuments();
        fetchCurrentDoc();
        const interval = setInterval(fetchDocuments, 10000);
        return () => clearInterval(interval);
    }, [fetchDocuments, fetchCurrentDoc]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const handleSend = async (question?: string) => {
        const q = (question || input).trim();
        if (!q || loading) return;

        const userMsg: ChatMessageType = {
            id: crypto.randomUUID(),
            role: "user",
            content: q,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const response = await api.queryDocument({
                question: q,
                document_id: docId,
            });

            const assistantMsg: ChatMessageType = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: response.answer,
                sources: response.sources,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMsg]);
        } catch (err) {
            const errorMsg: ChatMessageType = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: `❌ Error: ${err instanceof Error ? err.message : "Something went wrong. Please try again."}`,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.deleteDocument(id);
            setDocuments((prev) => prev.filter((d) => d.id !== id));
            if (id === docId) router.push("/");
        } catch {
            console.error("Failed to delete");
        }
    };

    return (
        <div className="app-layout">
            <Sidebar
                documents={documents}
                activeDocId={docId}
                onUploadClick={() => setShowUpload(true)}
                onDeleteDoc={handleDelete}
            />

            <div className="main-content">
                <div className="chat-page">
                    {/* Header */}
                    <div className="chat-header">
                        <button
                            className="chat-header__back"
                            onClick={() => router.push("/")}
                        >
                            ← Back
                        </button>
                        <div>
                            <div className="chat-header__title">
                                {currentDoc?.document_title || "Loading..."}
                            </div>
                            <div className="chat-header__company">
                                {currentDoc?.company_name}
                                {currentDoc?.document_date && ` · ${currentDoc.document_date}`}
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <div className="chat-welcome">
                                <div className="chat-welcome__icon">💬</div>
                                <h2 className="chat-welcome__title">
                                    Ask about {currentDoc?.company_name || "this document"}
                                </h2>
                                <p className="chat-welcome__hint">
                                    Ask any question about the financial filing. The AI will provide
                                    cited answers with data from the document.
                                </p>
                                <div className="chat-welcome__suggestions">
                                    {SUGGESTIONS.map((s, i) => (
                                        <button
                                            key={i}
                                            className="chat-welcome__suggestion"
                                            onClick={() => handleSend(s)}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg) => (
                                    <ChatMessage key={msg.id} message={msg} />
                                ))}
                                {loading && <LoadingMessage />}
                            </>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="chat-input-area">
                        <form
                            className="chat-input-form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                        >
                            <textarea
                                ref={inputRef}
                                className="chat-input"
                                placeholder={`Ask about ${currentDoc?.company_name || "this document"}...`}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                disabled={loading}
                            />
                            <button
                                className="chat-send-btn"
                                type="submit"
                                disabled={!input.trim() || loading}
                            >
                                ➤
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {showUpload && (
                <UploadModal
                    onClose={() => setShowUpload(false)}
                    onUploaded={(doc) => {
                        setDocuments((prev) => [doc, ...prev]);
                    }}
                />
            )}
        </div>
    );
}
