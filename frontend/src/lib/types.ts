export interface DocumentInfo {
    id: string;
    filename: string;
    company_name: string;
    document_title: string;
    document_date: string;
    status: "uploading" | "processing" | "ready" | "error";
    created_at: string;
    file_size: number;
    error_message: string;
}

export interface QueryRequest {
    question: string;
    document_id: string;
}

export interface QueryResponse {
    answer: string;
    sources: SourceInfo[];
}

export interface SourceInfo {
    page: string;
    section: string;
    is_table: boolean;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: SourceInfo[];
    timestamp: Date;
}
