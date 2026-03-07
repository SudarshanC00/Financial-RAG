import { DocumentInfo, QueryRequest, QueryResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE) {
        this.baseUrl = baseUrl;
    }

    async healthCheck(): Promise<{ status: string; api_key_set: boolean }> {
        const res = await fetch(`${this.baseUrl}/api/health`);
        if (!res.ok) throw new Error("API health check failed");
        return res.json();
    }

    async listDocuments(): Promise<DocumentInfo[]> {
        const res = await fetch(`${this.baseUrl}/api/documents`);
        if (!res.ok) throw new Error("Failed to fetch documents");
        return res.json();
    }

    async getDocument(docId: string): Promise<DocumentInfo> {
        const res = await fetch(`${this.baseUrl}/api/documents/${docId}`);
        if (!res.ok) throw new Error("Document not found");
        return res.json();
    }

    async uploadDocument(
        file: File,
        companyName: string,
        documentTitle: string,
        documentDate: string,
    ): Promise<DocumentInfo> {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("company_name", companyName);
        formData.append("document_title", documentTitle);
        formData.append("document_date", documentDate);

        const res = await fetch(`${this.baseUrl}/api/documents/upload`, {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: "Upload failed" }));
            throw new Error(err.detail || "Upload failed");
        }
        return res.json();
    }

    async deleteDocument(docId: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/api/documents/${docId}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete document");
    }

    async queryDocument(request: QueryRequest): Promise<QueryResponse> {
        const res = await fetch(`${this.baseUrl}/api/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: "Query failed" }));
            throw new Error(err.detail || "Query failed");
        }
        return res.json();
    }
}

export const api = new ApiClient();
