<div align="center">
  <img src="docquery-logo.png" alt="DocQuery AI Logo" width="128" style="border-radius: 28px; box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.3);" />
  <h1>DocQuery AI</h1>
  <p><strong>Intelligent Document Assistant & Semantic RAG Engine</strong></p>
  <p>Production-grade PDF Analysis application powered by Google Gemini AI, FastAPI, and React 19 (Vite). Designed with <strong>Google Stitch Design Tokens</strong>.</p>
</div>

---

## 🏗️ Architecture

```
├── backend/
│   ├── main.py              # FastAPI server (upload, chat, memory endpoints)
│   └── utils/               # PDF processing, vector store, Gemini chat engine
├── frontend/
│   ├── src/App.jsx          # React app matching Google Stitch design
│   ├── index.html           # Fonts, Material Symbols, Tailwind setup
│   └── package.json
├── requirements.txt         # Python dependencies
└── .env                     # GOOGLE_API_KEY
```

---

## 🚀 Local Development

### 1. Start the Backend API
```powershell
# In the project root directory
.\venv\Scripts\python -m uvicorn backend.main:app --reload --port 8000
```
API Documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Start the React Frontend
```powershell
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---
