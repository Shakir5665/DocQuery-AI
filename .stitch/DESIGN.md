# DESIGN SYSTEM SPECIFICATION: DocQuery Companion

## 1. Design Persona & Vibe
- **Character**: Friendly, approachable, deeply intelligent, yet calm and trustworthy.
- **Tone**: Clean, warm, non-technical, human. Avoid engineering jargon like "RAG", "Vector Search", "FAISS", "Embeddings", "Chunks".
- **Visual Feel**: Premium SaaS (Linear + Notion + Apple-like clarity), soft neutral backgrounds, elegant typography, warm subtle accents, crisp micro-borders.

## 2. Color Palette
- **Primary / Accent**: `#3B82F6` (Electric Trust Blue) & `#2563EB` (Deep Royal)
- **Primary Soft / Highlight**: `#EFF6FF` (Subtle Ice Blue)
- **Neutral Dark / Text Primary**: `#0F172A` (Slate 900 - rich ink, high readability)
- **Neutral Muted / Text Secondary**: `#475569` (Slate 600 - soft readable gray)
- **Neutral Subtle / Borders**: `#E2E8F0` (Slate 200 - subtle divider lines)
- **Canvas / App Background**: `#F8FAFC` (Slate 50 - fresh, spacious, warm off-white)
- **Surface / Card Background**: `#FFFFFF` (Pure White, elevated with light shadow)
- **Success / Status**: `#10B981` (Fresh Emerald Green)
- **Warm Welcome Glow**: Linear gradient `linear-gradient(135deg, #1E293B 0%, #0F172A 100%)` for hero branding card or crisp modern cards with subtle gradient borders.

## 3. Typography
- **Font Stack**: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Headings**: Semi-bold (600) to Bold (700), balanced letter-spacing (`-0.02em`)
- **Body**: Regular (400) and Medium (500), line-height `1.6` for comfortable reading

## 4. Copy & Terminology Guidelines (Friendly vs Technical)
- ❌ *Retrieval-Augmented Generation (RAG)* ➡️  *"Intelligent Document Assistant"*
- ❌ *Chunks / Vector Database / FAISS* ➡️  *"Pages indexed" / "Ready to chat"*
- ❌ *Density: 45.2 chunks/sec* ➡️  *"Ready in seconds"*
- ❌ *Similarity search k=4* ➡️  *"Reviewing relevant sections"*
- ❌ *Context-aware conversation memory* ➡️  *"Follow-up friendly"*
- ❌ *Submit query* ➡️  *"Ask anything"*

## 5. UI Components & Micro-interactions
- **Dropzone & Upload**: High-contrast, friendly iconography, clear instructions, visual pill badges showing file status.
- **Chat Bubbles**:
  - User: Friendly modern bubble (`#EFF6FF`, rounded-2xl, rounded-br-sm, crisp border)
  - DocQuery: Clean white card (`#FFFFFF`, rounded-2xl, rounded-bl-sm, soft shadow `0 2px 8px rgba(0,0,0,0.04)`)
- **Starter Prompts**: Interactive clickable suggestion cards ("Summarize this document", "Key takeaways", "Action items").

