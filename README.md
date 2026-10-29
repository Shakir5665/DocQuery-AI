# DocQuery - Intelligent Document Assistant

Modern, production-grade PDF Analysis application powered by Google Gemini AI, FastAPI, and React (Vite). Designed with **Google Stitch Design Tokens** (Linear/Notion aesthetic).

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

## 🌐 Deploy to Render

### Option A: Deploy Both as Separate Web Services (Recommended)

#### 1. Backend Web Service on Render:
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables:**
  - `GOOGLE_API_KEY`: Your Gemini API Key

#### 2. Frontend Static Site on Render:
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Root Directory:** `frontend`
- **Environment Variables:**
  - `VITE_API_URL`: URL of your deployed backend (e.g. `https://docquery-backend.onrender.com`)

---

### Option B: Render Blueprint (render.yaml)
Deploy both frontend and backend automatically with a single click using Render Blueprints.
