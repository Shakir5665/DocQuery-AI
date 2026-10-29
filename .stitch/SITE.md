# SITE SPECIFICATION: DocQuery App Architecture

## Overview
DocQuery transforms dense, complex PDF documents into clear, human conversations. It removes all technical jargon (RAG, FAISS, embeddings) and replaces them with an inviting, modern workspace interface.

## Flow & Screens

### Screen 1: Welcome & Document Setup (Pre-upload State)
- **Goal**: Inspire confidence, guide the user warmly to pick or drop a PDF, and showcase what they can ask once uploaded.
- **Components**:
  - Minimal top navigation / brand header with active status
  - Clean hero area with clear benefits (Quick Summaries, Instant Answers, Key Takeaways)
  - Friendly upload drop-card with format guidance
  - Sample prompt inspiration chips

### Screen 2: Interactive Conversation & Insights (Post-upload State)
- **Goal**: Provide an effortless chat experience with transparent citations and quick action suggestions.
- **Components**:
  - Sticky clean header showing the active document name with a friendly badge (e.g. "Ready to answer questions")
  - Sidebar showing clean document summary stats (Pages Analyzed, Reading Time, Quick Actions)
  - Rich chat feed with avatar badges, formatted markdown, and copy buttons
  - Fixed intuitive prompt input with pre-filled question suggestion pills

