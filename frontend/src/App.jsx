import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('documents');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [documentProcessed, setDocumentProcessed] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [stats, setStats] = useState({ chunks: 0, time: 0 });
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Check health / restore active state
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => res.json())
      .then((data) => {
        if (data.has_document) {
          setDocumentProcessed(true);
          setDocumentName(data.document_name);
          setStats({ chunks: data.chunk_count, time: data.processing_time });
        }
      })
      .catch(() => { });
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError('');
    }
  };

  const handleUploadAndRead = async () => {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }

    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to upload document');
      }

      const data = await res.json();
      setDocumentProcessed(true);
      setDocumentName(data.document_name);
      setStats({ chunks: data.chunk_count, time: data.processing_time });
      setMessages([]);
      setSidebarOpen(false);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Improvement 1: Fast Token Streaming Handler
  const handleSendMessage = async (textToSend) => {
    const question = (textToSend || inputValue).trim();
    if (!question || isThinking) return;

    setInputValue('');
    const userMsg = { role: 'user', content: question, time: 'Just now' };
    const initialAssistantMsg = {
      role: 'assistant',
      content: '',
      time: 'Just now',
      verified: true,
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setIsThinking(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate response.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: updated[lastIdx].content + chunk,
              };
            }
            return updated;
          });
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: `I ran into an issue while reading: ${err.message}`,
            isError: true,
          };
        }
        return updated;
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleReset = async () => {
    await fetch(`${API_BASE}/api/reset`, { method: 'POST' }).catch(() => { });
    setDocumentProcessed(false);
    setDocumentName('');
    setSelectedFile(null);
    setMessages([]);
    setStats({ chunks: 0, time: 0 });
    setSidebarOpen(false);
  };

  const handleClearHistory = async () => {
    await fetch(`${API_BASE}/api/clear`, { method: 'POST' }).catch(() => { });
    setMessages([]);
  };

  return (
    <div className="flex h-screen w-screen bg-background font-sans select-none overflow-hidden text-on-surface">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* ==================== SIDEBAR ==================== */}
      <aside
        className={`fixed md:static inset-y-0 left-0 w-72 md:w-64 h-full bg-surface-container-lowest border-r border-outline-variant flex flex-col justify-between shrink-0 shadow-lg md:shadow-sm z-50 transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        <div className="p-4 flex flex-col gap-4 overflow-y-auto h-full">
          {/* Logo & Mobile Close Button */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-white shadow-sm shadow-primary/20">
                <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-lg text-on-surface leading-tight">DocQuery</span>
                <span className="text-[12px] text-outline font-normal">Intelligent Assistant</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1 mt-1">
            <button
              onClick={() => {
                setActiveTab('documents');
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${activeTab === 'documents'
                  ? 'text-primary bg-surface-container-high font-semibold border-l-2 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
            >
              <span className="material-symbols-outlined text-[20px]">folder_open</span>
              <span>Documents</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('queries');
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${activeTab === 'queries'
                  ? 'text-primary bg-surface-container-high font-semibold border-l-2 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
            >
              <span className="material-symbols-outlined text-[20px]">history</span>
              <span>Recent Queries</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('synthesis');
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${activeTab === 'synthesis'
                  ? 'text-primary bg-surface-container-high font-semibold border-l-2 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
            >
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              <span>Synthesis</span>
            </button>
          </nav>

          <div className="h-px bg-outline-variant/60 my-1"></div>

          {/* Document Upload or Active Document Panel */}
          {!documentProcessed ? (
            <div className="flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center p-4 border border-dashed border-outline hover:border-primary-container bg-surface-container-low hover:bg-surface-container-high rounded-xl cursor-pointer transition-all text-center"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-primary-container mb-2 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
                </div>
                <p className="text-xs font-semibold text-on-surface truncate max-w-[200px]">
                  {selectedFile ? selectedFile.name : 'Drop your PDF here'}
                </p>
                <p className="text-[11px] text-outline mt-0.5">
                  {selectedFile ? 'Click to change file' : 'or browse files'}
                </p>
                <span className="mt-2 inline-flex items-center text-[10px] font-medium px-2 py-0.5 bg-surface-container-lowest text-on-surface-variant rounded border border-outline-variant/60">
                  PDF up to 25MB
                </span>
              </div>

              {uploadError && (
                <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  {uploadError}
                </div>
              )}

              <button
                onClick={handleUploadAndRead}
                disabled={isUploading}
                className="w-full h-10 px-3.5 bg-primary-container hover:bg-primary text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span>{isUploading ? 'Preparing PDF...' : 'Read Document'}</span>
              </button>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/60 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">lightbulb</span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-on-surface">Quick Tip</span>
                  <p className="text-[11px] leading-4 text-on-surface-variant mt-0.5">
                    Upload contracts, reports, study guides, or manuals for instant answers.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Active Document Card */}
              <div className="rounded-xl border border-outline-variant bg-surface-bright p-3.5 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">description</span>
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-semibold text-on-surface truncate" title={documentName}>
                      {documentName}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-secondary"></span>
                      <span className="text-[11px] text-secondary font-semibold">Ready to chat</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-outline-variant/50 grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                  <div className="bg-surface-container-low rounded-lg p-2 flex flex-col">
                    <span className="text-[10px] text-outline">Sections Indexed</span>
                    <span className="text-xs font-bold text-on-surface">{stats.chunks} parts</span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-2 flex flex-col">
                    <span className="text-[10px] text-outline">Prep Speed</span>
                    <span className="text-xs font-bold text-on-surface">{stats.time}s</span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="mt-3 flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      handleSendMessage('Can you provide a clear, 3-bullet executive summary of this document?');
                      setSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface bg-surface-container-lowest border border-outline-variant hover:bg-surface-container transition-colors text-left"
                  >
                    <span>📝</span>
                    <span>Summary</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSendMessage('What are the most crucial takeaways and findings from this document?');
                      setSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface bg-surface-container-lowest border border-outline-variant hover:bg-surface-container transition-colors text-left"
                  >
                    <span>💡</span>
                    <span>Key Takeaways</span>
                  </button>
                  <button
                    onClick={() => {
                      handleClearHistory();
                      setSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-[15px]">refresh</span>
                    <span>Clear Messages</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full py-2 px-3 rounded-lg border border-outline-variant hover:bg-surface-container text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Upload New PDF</span>
              </button>
            </div>
          )}
        </div>


      </aside>

      {/* ==================== MAIN CONTENT CANVAS ==================== */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            {/* Hamburger button for mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container"
              title="Open Navigation"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>

            {/* Global Search Bar */}
            <div className="relative w-full max-w-xs sm:max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
              <input
                type="text"
                placeholder="Search topics or queries..."
                className="w-full h-8 pl-9 pr-4 bg-surface-container-low border border-outline-variant hover:border-outline focus:border-primary-container focus:ring-1 focus:ring-primary-container rounded-lg text-xs text-on-surface placeholder:text-outline outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Page link copied to clipboard!');
                }
              }}
              className="h-8 px-2.5 sm:px-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[17px]">share</span>
              <span className="hidden sm:inline">Share</span>
            </button>
            <div className="h-4 w-px bg-outline-variant mx-0.5"></div>
            <div className="w-7 h-7 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs">
              DQ
            </div>
          </div>
        </header>

        {/* Content View: Welcome Screen OR Chat View */}
        {!documentProcessed ? (
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center w-full">
            <div className="w-full max-w-5xl flex flex-col gap-6">
              {/* Stitch Hero Banner */}
              <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 lg:p-10 bg-gradient-to-br from-[#0f172a] via-[#131d36] to-[#1e293b] border border-slate-700/60 shadow-lg text-white">
                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary-container/20 blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col items-start max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 backdrop-blur-sm mb-4">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-container"></span>
                    </span>
                    <span className="text-xs text-slate-300 font-medium">Waiting for document</span>
                  </div>
                  <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                    Chat with any document
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2.5 max-w-xl leading-relaxed">
                    Ask questions, uncover summaries, and extract insights in clear, everyday language. No setup, no complicated settings.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          setSidebarOpen(true);
                        } else {
                          fileInputRef.current?.click();
                        }
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[18px] text-blue-300">upload_file</span>
                      <span>Select PDF Document</span>
                    </button>
                    <span className="text-[11px] sm:text-xs text-slate-400">or use the upload dropzone</span>
                  </div>
                </div>
              </div>

              {/* 3-Step Walkthrough */}
              <section className="flex flex-col gap-3">
                <h2 className="font-headline text-base sm:text-lg font-bold text-on-surface">How it works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-surface-container-lowest border border-outline-variant hover:border-outline hover:shadow-sm rounded-xl p-4 sm:p-5 transition-all">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
                    </div>
                    <h3 className="font-headline font-semibold text-sm text-on-surface">1. Choose your PDF</h3>
                    <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                      Upload any document you want to explore. From contracts to research reports.
                    </p>
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant hover:border-outline hover:shadow-sm rounded-xl p-4 sm:p-5 transition-all">
                    <div className="w-10 h-10 rounded-lg bg-secondary-container text-secondary flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[22px]">bolt</span>
                    </div>
                    <h3 className="font-headline font-semibold text-sm text-on-surface">2. Click Read Document</h3>
                    <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                      DocQuery prepares the content in seconds, structuring sections quietly.
                    </p>
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant hover:border-outline hover:shadow-sm rounded-xl p-4 sm:p-5 transition-all">
                    <div className="w-10 h-10 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[22px]">chat_bubble</span>
                    </div>
                    <h3 className="font-headline font-semibold text-sm text-on-surface">3. Ask Anything</h3>
                    <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                      Get natural answers and bullet summaries with clear, human explanations.
                    </p>
                  </div>
                </div>
              </section>

              {/* Sample Prompts */}
              <section className="flex flex-col gap-3 mb-8">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">tips_and_updates</span>
                  <h2 className="font-headline font-bold text-sm text-on-surface">Try asking things like</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-left">
                    <p className="text-xs font-semibold text-on-surface">"Can you give me a 3-bullet executive summary?"</p>
                    <p className="text-[11px] text-outline mt-0.5">Captures the essence of lengthy reports and briefings.</p>
                  </div>
                  <div className="p-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-left">
                    <p className="text-xs font-semibold text-on-surface">"What are the key terms or deadlines mentioned?"</p>
                    <p className="text-[11px] text-outline mt-0.5">Quickly identifies dates, obligations, and clauses.</p>
                  </div>
                </div>
              </section>
            </div>
          </main>
        ) : (
          /* Active Chat Stream View */
          <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
            {/* Context Subheader */}
            <div className="bg-surface-bright border-b border-outline-variant/70 px-4 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                </div>
                <div className="overflow-hidden">
                  <h1 className="font-headline text-xs sm:text-sm font-bold text-on-surface truncate max-w-xs sm:max-w-md">
                    Chatting with {documentName}
                  </h1>
                  <p className="text-[10px] sm:text-[11px] text-on-surface-variant truncate">
                    Ask questions, extract metrics, or synthesize conclusions below.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/40 border border-secondary/20 text-xs font-semibold text-secondary">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                  Ready
                </span>
              </div>
            </div>

            {/* Conversation Scroll Feed */}
            <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col items-center w-full">
              <div className="w-full max-w-4xl flex flex-col gap-4 sm:gap-5 pb-24">
                {messages.length === 0 && (
                  <div className="text-center py-10 sm:py-16 text-on-surface-variant flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[28px]">chat_bubble_outline</span>
                    </div>
                    <p className="font-headline font-semibold text-sm text-on-surface">Ready to answer your questions!</p>
                    <p className="text-xs text-outline mt-1 max-w-sm px-4">
                      Type below to ask anything about <span className="font-medium text-on-surface">{documentName}</span>.
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div key={idx} className="w-full">
                    {msg.role === 'user' ? (
                      <div className="flex flex-col items-end gap-1">
                        <div className="bg-primary-container text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl rounded-br-sm shadow-sm max-w-[85%] sm:max-w-[75%] text-xs sm:text-sm leading-relaxed">
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-outline mr-2">{msg.time}</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2.5 sm:gap-3 w-full">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary-container text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                          <span className="material-symbols-outlined text-[16px] sm:text-[18px]">auto_awesome</span>
                        </div>
                        <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2.5">
                            <span className="font-headline text-xs font-bold text-on-surface flex items-center gap-1.5">
                              <span>DocQuery Assistant</span>
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container text-primary">
                              Verified
                            </span>
                          </div>

                          {/* Beautifully Rendered Markdown Content */}
                          <div className="formatted-doc-content text-xs sm:text-[13px] text-on-surface leading-relaxed">
                            {msg.content ? (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({ node, ...props }) => (
                                    <h1 className="font-headline text-base font-bold text-on-surface mt-3 mb-1.5" {...props} />
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <h2 className="font-headline text-sm font-bold text-on-surface mt-3 mb-1.5" {...props} />
                                  ),
                                  h3: ({ node, ...props }) => (
                                    <h3 className="font-headline text-xs sm:text-[13px] font-bold text-primary mt-2.5 mb-1" {...props} />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p className="mb-2 leading-relaxed text-on-surface" {...props} />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul className="list-disc pl-5 mb-2.5 space-y-1 text-on-surface" {...props} />
                                  ),
                                  ol: ({ node, ...props }) => (
                                    <ol className="list-decimal pl-5 mb-2.5 space-y-1 text-on-surface" {...props} />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="leading-relaxed" {...props} />
                                  ),
                                  table: ({ node, ...props }) => (
                                    <div className="my-3 overflow-x-auto rounded-xl border border-outline-variant bg-surface-bright shadow-xs">
                                      <table className="w-full text-left border-collapse text-xs" {...props} />
                                    </div>
                                  ),
                                  thead: ({ node, ...props }) => (
                                    <thead className="bg-surface-container-low border-b border-outline-variant text-on-surface font-semibold" {...props} />
                                  ),
                                  th: ({ node, ...props }) => (
                                    <th className="py-2.5 px-3.5 text-xs font-bold text-on-surface uppercase tracking-wider" {...props} />
                                  ),
                                  td: ({ node, ...props }) => (
                                    <td className="py-2 px-3.5 border-b border-outline-variant/50 text-xs text-on-surface-variant" {...props} />
                                  ),
                                  strong: ({ node, ...props }) => (
                                    <strong className="font-bold text-on-surface" {...props} />
                                  ),
                                  blockquote: ({ node, ...props }) => (
                                    <blockquote className="border-l-3 border-primary bg-surface-container-low/70 py-1.5 px-3 rounded-r-lg text-xs italic text-on-surface-variant my-2" {...props} />
                                  ),
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            ) : (
                              <div className="flex items-center gap-2 text-xs text-outline italic">
                                <span className="material-symbols-outlined animate-spin text-[16px] text-primary">progress_activity</span>
                                <span>Thinking...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div ref={chatEndRef} />
              </div>
            </main>

            {/* Bottom Floating Omnibar Input */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4 sm:px-6 pointer-events-none z-30">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="w-full max-w-4xl pointer-events-auto bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-lg p-1.5 sm:p-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Ask anything about ${documentName || 'your document'}...`}
                  className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none px-2 sm:px-3"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isThinking}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary-container text-white flex items-center justify-center shadow hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">arrow_upward</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
