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

    def generate_synthesis(
        self,
        task: str,
        relevant_docs: List[Document]
    ) -> Generator[str, None, None]:
        """
        Stream synthesis response for executive summary, FAQ, or key metrics.
        """
        if not relevant_docs:
            yield "No relevant document excerpts found to synthesize. Please ensure a document is properly loaded."
            return

        context = "\n\n---\n\n".join([doc.page_content for doc in relevant_docs])

        task_instructions = {
            "summary": (
                "You are an elite enterprise document analyst. Synthesize a comprehensive Executive Brief based on the provided document context.\n"
                "Structure your output cleanly in Markdown with these specific sections:\n"
                "### 🎯 Executive Overview & Purpose\n"
                "A concise 2-3 sentence thesis explaining the background, context, and fundamental objective.\n\n"
                "### 🔍 Core Findings & Crucial Insights\n"
                "- 4-6 high-impact bullet points with **bold lead-ins** detailing key facts, findings, and arguments.\n\n"
                "### 📊 Notable Outcomes, Limitations or Constraints\n"
                "- Bullet points on quantitative results, risks, limitations, or boundary conditions.\n\n"
                "### ⚡ Strategic Recommendations / Next Steps\n"
                "- Actionable takeaways for stakeholders or readers."
            ),
            "faq": (
                "You are a technical document educator. Generate a high-yield FAQ (Frequently Asked Questions) guide from the provided document context.\n"
                "Create 6 to 8 essential questions with detailed, context-grounded answers that any reader or stakeholder must know.\n"
                "Format each entry clearly as:\n"
                "### Q: [Direct, realistic question?]\n"
                "**Answer:** [Accurate, grounded explanation. Use bullet points or bold text where appropriate.]\n"
            ),
            "metrics": (
                "You are a quantitative data and entity extraction engine. Extract all critical metrics, numbers, statistics, percentages, milestones, dates, key organizations, and technical specifications from the context.\n"
                "Format using structured Markdown tables:\n"
                "### 📈 Key Metrics & Quantitative Data\n"
                "| Metric / Parameter | Value / Quantity | Context & Significance |\n"
                "| :--- | :--- | :--- |\n\n"
                "### 🗓️ Critical Dates, Milestones & Deadlines\n"
                "| Event / Milestone | Date / Timeframe | Description |\n"
                "| :--- | :--- | :--- |\n\n"
                "### 🏛️ Key Entities, Stakeholders & Technologies\n"
                "- Categorized list of organizations, key people, frameworks, or tools mentioned in the context."
            )
        }

        system_instruction = task_instructions.get(task, task_instructions["summary"])
        prompt = [
            ("system", f"{system_instruction}\n\nStrict Rule: Answer solely based on the provided context. If certain fields or metrics have no data in the context, explicitly state so without hallucinating.\n\nDocument Context:\n{context}"),
            ("human", f"Please generate the complete, high-quality {task} analysis for the provided document context.")
        ]

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
                yield token_text
