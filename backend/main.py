import os
import time
import logging
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from backend.utils.pdf_processor import PDFProcessor
from backend.utils.vector_store import VectorStoreManager
from backend.utils.chat_engine import ChatEngine

# Load environment
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DocQuery API", version="2.1.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory session
session_data = {
    "vector_store": None,
    "chat_engine": None,
    "document_name": None,
    "chunk_count": 0,
    "processing_time": 0.0,
    "messages": [],
    "query_cache": {},  # In-memory QA Cache
    "synthesis_cache": {}  # In-memory Synthesis Cache (summary, faq, metrics)
}

class QueryRequest(BaseModel):
    question: str

class SynthesisRequest(BaseModel):
    task: str = "summary"  # "summary", "faq", "metrics"
    force_refresh: bool = False

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "has_document": session_data["vector_store"] is not None,
        "document_name": session_data["document_name"],
        "chunk_count": session_data["chunk_count"],
        "processing_time": session_data["processing_time"]
    }

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY is not configured in .env")

    start_time = time.time()
    try:
        processor = PDFProcessor(chunk_size=1000, chunk_overlap=200)
        chunks = processor.process_pdf(file.file)

        vector_manager = VectorStoreManager(api_key=api_key)
        vector_store = vector_manager.create_vector_store(chunks)
        chat_engine = ChatEngine(api_key=api_key)

        processing_time = time.time() - start_time

        session_data["vector_store"] = vector_store
        session_data["chat_engine"] = chat_engine
        session_data["document_name"] = file.filename
        session_data["chunk_count"] = len(chunks)
        session_data["processing_time"] = round(processing_time, 2)
        session_data["messages"] = []
        session_data["query_cache"] = {}  # Clear cache for the new document
        session_data["synthesis_cache"] = {}  # Clear synthesis for the new document

        logger.info(f"Successfully processed {file.filename} in {processing_time:.2f}s")

        return {
            "status": "success",
            "document_name": file.filename,
            "chunk_count": len(chunks),
            "processing_time": round(processing_time, 2)
        }
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

@app.post("/api/chat/stream")
def chat_query_stream(req: QueryRequest):
    """
    Stream answer tokens chunk-by-chunk using Server-Sent Events (SSE)
    with instant in-memory cache lookup.
    """
    if not session_data["vector_store"] or not session_data["chat_engine"]:
        raise HTTPException(status_code=400, detail="No active document. Please upload a PDF first.")

    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    normalized_key = question.lower().strip()

    # Improvement 4: Instant Cache Hit for repetitive questions
    if normalized_key in session_data["query_cache"]:
        cached_answer = session_data["query_cache"][normalized_key]
        def cached_generator():
            yield cached_answer
        return StreamingResponse(cached_generator(), media_type="text/plain")

    try:
        relevant_docs = session_data["vector_store"].similarity_search(question, k=4)
        
        # Improvement 1: Token Streaming Generator
        def token_generator():
            accumulated = []
            for token in session_data["chat_engine"].stream_response(question, relevant_docs):
                accumulated.append(token)
                yield token
            
            # Cache full response on completion
            session_data["query_cache"][normalized_key] = "".join(accumulated)

        return StreamingResponse(token_generator(), media_type="text/plain")
        
    except Exception as e:
        logger.error(f"Error streaming answer: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

@app.post("/api/synthesis/stream")
def synthesis_stream(req: SynthesisRequest):
    """
    Stream deep document synthesis (summary, faq, metrics) with automatic caching.
    """
    if not session_data["vector_store"] or not session_data["chat_engine"]:
        raise HTTPException(status_code=400, detail="No active document. Please upload a PDF first.")

    task = req.task.lower().strip()
    if task not in ["summary", "faq", "metrics"]:
        task = "summary"

    # Instant return if already synthesized and not forcing refresh
    if not req.force_refresh and task in session_data["synthesis_cache"]:
        cached_result = session_data["synthesis_cache"][task]
        def cached_generator():
            yield cached_result
        return StreamingResponse(cached_generator(), media_type="text/plain")

    try:
        query_map = {
            "summary": "executive summary background context objectives conclusions results recommendations",
            "faq": "frequently asked questions key definitions core principles methodology findings",
            "metrics": "quantitative metrics percentages statistics data dates deadlines milestones budget financials"
        }
        search_query = query_map.get(task, query_map["summary"])
        relevant_docs = session_data["vector_store"].similarity_search(search_query, k=6)

        def synthesis_generator():
            accumulated = []
            for token in session_data["chat_engine"].generate_synthesis(task, relevant_docs):
                accumulated.append(token)
                yield token
            session_data["synthesis_cache"][task] = "".join(accumulated)

        return StreamingResponse(synthesis_generator(), media_type="text/plain")

    except Exception as e:
        logger.error(f"Error generating synthesis for {task}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to synthesize {task}: {str(e)}")

@app.get("/api/synthesis/status")
def synthesis_status():
    return {
        "available_tasks": ["summary", "faq", "metrics"],
        "cached_tasks": list(session_data["synthesis_cache"].keys()),
        "has_document": session_data["vector_store"] is not None
    }

@app.post("/api/clear")
def clear_chat():
    session_data["messages"] = []
    if session_data["chat_engine"]:
        session_data["chat_engine"].clear_memory()
    return {"status": "cleared"}

@app.post("/api/reset")
def reset_document():
    session_data["vector_store"] = None
    session_data["chat_engine"] = None
    session_data["document_name"] = None
    session_data["chunk_count"] = 0
    session_data["processing_time"] = 0.0
    session_data["messages"] = []
    session_data["query_cache"] = {}
    session_data["synthesis_cache"] = {}
    return {"status": "reset"}
