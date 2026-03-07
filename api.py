"""
FastAPI REST API for the Financial RAG Pipeline.

Exposes ingestion, querying, and document management as REST endpoints
that the Next.js frontend consumes.
"""

import json
import logging
import os
import shutil
import uuid
from datetime import datetime
from typing import Optional

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import OPENAI_API_KEY

logger = logging.getLogger(__name__)

# ─── App Setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Financial RAG API",
    description="API for uploading and querying financial documents",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://financial-rag-k397.onrender.com",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Storage Paths ────────────────────────────────────────────────────────────

DOCUMENTS_DIR = "./storage/documents"
UPLOADS_DIR = "./storage/uploads"
os.makedirs(DOCUMENTS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)


# ─── Models ───────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    document_id: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[dict] = []


class DocumentInfo(BaseModel):
    id: str
    filename: str
    company_name: str
    document_title: str
    document_date: str
    status: str  # "uploading", "processing", "ready", "error"
    created_at: str
    file_size: int = 0
    error_message: str = ""


# ─── Document Metadata Helpers ────────────────────────────────────────────────

def _get_doc_meta_path(doc_id: str) -> str:
    return os.path.join(DOCUMENTS_DIR, f"{doc_id}.json")


def _save_doc_meta(doc: DocumentInfo):
    with open(_get_doc_meta_path(doc.id), "w") as f:
        json.dump(doc.model_dump(), f, indent=2)


def _load_doc_meta(doc_id: str) -> Optional[DocumentInfo]:
    path = _get_doc_meta_path(doc_id)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return DocumentInfo(**json.load(f))


def _get_collection_name(doc_id: str) -> str:
    """Generate a Qdrant collection name from document ID."""
    return f"doc_{doc_id.replace('-', '_')}"


# ─── Background Ingestion Task ───────────────────────────────────────────────

def _run_ingestion(doc_id: str, pdf_path: str, document_title: str, document_date: str):
    """Background task: ingest PDF and build vector index."""
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    # Set up logging for background tasks
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )

    doc = _load_doc_meta(doc_id)
    if not doc:
        logger.error(f"Document {doc_id} not found during ingestion")
        return

    try:
        doc.status = "processing"
        _save_doc_meta(doc)

        # Step 1: Ingest PDF
        from ingest import ingest_pdf
        nodes = ingest_pdf(
            pdf_path=pdf_path,
            document_title=document_title,
            document_date=document_date,
        )

        if not nodes:
            doc.status = "error"
            doc.error_message = "No content extracted from PDF"
            _save_doc_meta(doc)
            return

        # Step 2: Build index
        from indexer import create_index
        collection_name = _get_collection_name(doc_id)
        create_index(nodes, collection_name=collection_name)

        doc.status = "ready"
        _save_doc_meta(doc)
        logger.info(f"Document {doc_id} ingestion complete: {len(nodes)} nodes indexed")

    except Exception as e:
        logger.error(f"Ingestion failed for {doc_id}: {e}", exc_info=True)
        doc.status = "error"
        doc.error_message = str(e)
        _save_doc_meta(doc)


# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "api_key_set": bool(OPENAI_API_KEY)}


@app.get("/api/documents", response_model=list[DocumentInfo])
async def list_documents():
    """List all ingested documents."""
    documents = []
    if os.path.exists(DOCUMENTS_DIR):
        for filename in sorted(os.listdir(DOCUMENTS_DIR)):
            if filename.endswith(".json"):
                path = os.path.join(DOCUMENTS_DIR, filename)
                with open(path) as f:
                    documents.append(DocumentInfo(**json.load(f)))
    # Sort by created_at descending
    documents.sort(key=lambda d: d.created_at, reverse=True)
    return documents


@app.get("/api/documents/{doc_id}", response_model=DocumentInfo)
async def get_document(doc_id: str):
    """Get a specific document's details."""
    doc = _load_doc_meta(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.post("/api/documents/upload", response_model=DocumentInfo)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    company_name: str = Form(...),
    document_title: str = Form(""),
    document_date: str = Form(""),
):
    """
    Upload a financial PDF document for processing.
    Ingestion runs in the background.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    doc_id = str(uuid.uuid4())[:8]

    # Determine document title
    if not document_title:
        document_title = f"{company_name} - {file.filename}"

    # Save uploaded file
    upload_path = os.path.join(UPLOADS_DIR, f"{doc_id}_{file.filename}")
    with open(upload_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Create document metadata
    doc = DocumentInfo(
        id=doc_id,
        filename=file.filename,
        company_name=company_name,
        document_title=document_title,
        document_date=document_date,
        status="uploading",
        created_at=datetime.now().isoformat(),
        file_size=len(content),
    )
    _save_doc_meta(doc)

    # Start background ingestion
    background_tasks.add_task(
        _run_ingestion,
        doc_id=doc_id,
        pdf_path=upload_path,
        document_title=document_title,
        document_date=document_date,
    )

    return doc


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and its index."""
    doc = _load_doc_meta(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove metadata
    meta_path = _get_doc_meta_path(doc_id)
    if os.path.exists(meta_path):
        os.remove(meta_path)

    # Remove upload file
    for f in os.listdir(UPLOADS_DIR):
        if f.startswith(doc_id):
            os.remove(os.path.join(UPLOADS_DIR, f))

    # Remove index persist dir
    from indexer import get_persist_dir
    collection_name = _get_collection_name(doc_id)
    persist_dir = get_persist_dir(collection_name)
    if os.path.exists(persist_dir):
        shutil.rmtree(persist_dir)

    # Try to delete Qdrant collection
    try:
        from indexer import get_qdrant_client
        client = get_qdrant_client()
        client.delete_collection(collection_name)
    except Exception:
        pass

    return {"status": "deleted", "id": doc_id}


@app.post("/api/query", response_model=QueryResponse)
async def query_document(request: QueryRequest):
    """Query a specific document."""
    doc = _load_doc_meta(request.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(
            status_code=400,
            detail=f"Document is not ready for querying (status: {doc.status})"
        )

    try:
        from indexer import build_recursive_retriever, load_index
        from query_engine import build_query_engine, format_response

        collection_name = _get_collection_name(request.document_id)
        index = load_index(collection_name=collection_name)
        if index is None:
            raise HTTPException(status_code=500, detail="Index not found for this document")

        retriever = build_recursive_retriever(index)
        engine = build_query_engine(
            retriever,
            document_title=doc.document_title,
            document_date=doc.document_date,
        )

        response = engine.query(request.question)
        formatted = format_response(response)

        # Extract source info
        sources = []
        if hasattr(response, 'source_nodes') and response.source_nodes:
            for node in response.source_nodes:
                meta = node.metadata if hasattr(node, 'metadata') else {}
                sources.append({
                    "page": meta.get("page_label", "?"),
                    "section": meta.get("section_title", "?"),
                    "is_table": meta.get("is_table", False),
                })

        return QueryResponse(answer=formatted, sources=sources)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Query failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


# ─── Run with Uvicorn ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
