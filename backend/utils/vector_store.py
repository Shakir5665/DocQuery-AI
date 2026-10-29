"""
Vector Store Module for Semantic Search using FAISS
"""

import pickle
import tempfile
from pathlib import Path
from typing import List, Optional, Tuple

from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import numpy as np


class VectorStoreManager:
    """
    Manages FAISS vector store for document embedding and similarity search.
    """
    
    def __init__(self, api_key: str, embedding_model: str = "models/gemini-embedding-2"):
        """
        Initialize vector store manager with embedding model.
        
        Args:
            api_key: Google API key for Gemini embeddings
            embedding_model: Model name for generating embeddings
        """
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=embedding_model,
            google_api_key=api_key
        )
        self.vector_store: Optional[FAISS] = None
    
    def create_vector_store(self, documents: List[Document]) -> FAISS:
        """
        Create FAISS vector store from document chunks.
        
        Args:
            documents: List of chunked Document objects
            
        Returns:
            FAISS vector store instance
        """
        self.vector_store = FAISS.from_documents(documents, self.embeddings)
        return self.vector_store
    
    def add_documents(self, documents: List[Document]) -> None:
        """
        Add new documents to existing vector store.
        
        Args:
            documents: List of Document objects to add
        """
        if self.vector_store is None:
            self.create_vector_store(documents)
        else:
            self.vector_store.add_documents(documents)
    
    def similarity_search(
        self, 
        query: str, 
        k: int = 4
    ) -> List[Document]:
        """
        Perform similarity search for relevant document chunks.
        
        Args:
            query: User question text
            k: Number of relevant chunks to retrieve
            
        Returns:
            List of relevant Document objects
        """
        if self.vector_store is None:
            return []
        
        return self.vector_store.similarity_search(query, k=k)
    
    def similarity_search_with_score(
        self, 
        query: str, 
        k: int = 4
    ) -> List[Tuple[Document, float]]:
        """
        Perform similarity search with relevance scores.
        
        Args:
            query: User question text
            k: Number of relevant chunks to retrieve
            
        Returns:
            List of tuples (Document, similarity_score)
        """
        if self.vector_store is None:
            return []
        
        return self.vector_store.similarity_search_with_score(query, k=k)
    
    def save_local(self, path: str) -> None:
        """
        Save vector store to local disk.
        
        Args:
            path: Directory path to save the vector store
        """
        if self.vector_store:
            self.vector_store.save_local(path)
    
    def load_local(self, path: str) -> None:
        """
        Load vector store from local disk.
        
        Args:
            path: Directory path containing saved vector store
        """
        self.vector_store = FAISS.load_local(
            path, 
            self.embeddings,
            allow_dangerous_deserialization=True
        )