"""
Chat Engine Module for LLM Integration and Response Generation
"""

from typing import List, Generator
from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_classic.memory import ConversationBufferMemory
from langchain_core.messages import HumanMessage, AIMessage


class ChatEngine:
    """
    Manages LLM interactions with context-aware responses and token streaming.
    """
    
    def __init__(self, api_key: str, model: str = "gemini-3.5-flash-lite"):
        self.llm = ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=0.3,
            top_p=0.95,
            max_output_tokens=2048
        )
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )
        
        self.rag_prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                "You are a professional document analysis assistant. "
                "Answer questions based strictly on the provided context. "
                "Format your responses using structured Markdown: "
                "- Use **bold** for key terms and project names. "
                "- Use bullet points or numbered lists for multiple items. "
                "- Use tables for structured data like technologies or dates. "
                "If the answer is not in the context, say 'I cannot find this information in the document.' "
                "Do not hallucinate or invent information. "
                "Provide concise, accurate responses. "
                "Cite relevant sections when possible.\n\n"
                "Context from document:\n{context}"
            ),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}")
        ])
    
    def stream_response(
        self, 
        query: str, 
        relevant_docs: List[Document]
    ) -> Generator[str, None, None]:
        """
        Stream response tokens chunk-by-chunk using LangChain's stream method.
        """
        if not relevant_docs:
            yield "No relevant content found in the uploaded document. Please try a different question."
            return
        
        context = "\n\n---\n\n".join([doc.page_content for doc in relevant_docs])
        
        prompt = self.rag_prompt.format_messages(
            context=context,
            chat_history=self.memory.load_memory_variables({})["chat_history"],
            input=query
        )
        
        full_answer = []
        for chunk in self.llm.stream(prompt):
            token_text = ""
            if isinstance(chunk.content, str):
                token_text = chunk.content
            elif isinstance(chunk.content, list):
                for part in chunk.content:
                    if isinstance(part, dict) and "text" in part:
                        token_text += part["text"]
                    elif isinstance(part, str):
                        token_text += part
            
            if token_text:
                full_answer.append(token_text)
                yield token_text
        
        # Save completed response to memory
        complete_text = "".join(full_answer)
        self.memory.chat_memory.add_message(HumanMessage(content=query))
        self.memory.chat_memory.add_message(AIMessage(content=complete_text))

    def generate_response(
        self, 
        query: str, 
        relevant_docs: List[Document]
    ) -> str:
        """
        Fallback sync response generator.
        """
        return "".join(list(self.stream_response(query, relevant_docs)))
    
    def clear_memory(self) -> None:
        """
        Clear conversation memory.
        """
        self.memory.clear()
