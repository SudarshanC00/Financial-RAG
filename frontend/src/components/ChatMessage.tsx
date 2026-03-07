"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage as ChatMessageType } from "@/lib/types";

interface ChatMessageProps {
    message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <div className={`message message--${message.role}`}>
            <div className="message__avatar">
                {isUser ? "👤" : "🤖"}
            </div>
            <div className="message__content">
                {isUser ? (
                    <p>{message.content}</p>
                ) : (
                    <>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                        </ReactMarkdown>
                        {message.sources && message.sources.length > 0 && (
                            <div className="message__sources">
                                {message.sources.map((src, i) => (
                                    <span key={i} className="message__source">
                                        {src.is_table ? "📊" : "📄"} Page {src.page}
                                        {src.section !== "?" && ` · ${src.section}`}
                                    </span>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export function LoadingMessage() {
    return (
        <div className="message message--assistant">
            <div className="message__avatar">🤖</div>
            <div className="message__content">
                <div className="loading-dots">
                    <span />
                    <span />
                    <span />
                </div>
            </div>
        </div>
    );
}
