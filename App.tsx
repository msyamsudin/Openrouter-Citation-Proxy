import React, { useState, useEffect } from 'react';
import { Radar, CheckCircle2, Settings, AlertCircle, Loader2 } from 'lucide-react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ResultView } from './components/ResultView';
import { fetchOpenRouterResponse, parseClaimsFromResponse } from './services/openRouterService';
import { AVAILABLE_MODELS, AppState } from './types';
import { API_ENDPOINTS } from './utils/api';

export default function App() {
  const [state, setState] = useState<AppState>({
    apiKey: '', // Now represents backend status/config
    query: '',
    model: AVAILABLE_MODELS[0].id,
    isLoading: false,
    error: null,
    result: null,
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackendConfigured, setIsBackendConfigured] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Check backend key status on mount
  useEffect(() => {
    fetchBackendStatus();
  }, []);

  const fetchBackendStatus = async () => {
    setIsInitialLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.STATUS);
      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Backend returned non-JSON response:", text.substring(0, 100));
        throw new Error("Backend did not return JSON. Is the server running on port 3001?");
      }

      const data = await response.json();
      setIsBackendConfigured(data.isConfigured);
      if (!data.isConfigured) {
        setIsSettingsOpen(true);
      }
    } catch (err: any) {
      console.error("Failed to fetch backend status:", err);
      // If backend is down, we must show settings because we can't operate
      setIsBackendConfigured(false);
      setIsSettingsOpen(true);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleSaveKey = async (key: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Backend returned non-JSON response during save:", text.substring(0, 100));
        throw new Error("Gagal menyimpan key: Server tidak memberikan respon JSON yang valid. Pastikan backend server berjalan di port 3001.");
      }

      const data = await response.json();

      if (response.ok) {
        setIsBackendConfigured(true);
        setIsSettingsOpen(false);
      } else {
        throw new Error(data.error || "Failed to save key to server");
      }
    } catch (err: any) {
      throw err; // Re-throw to be handled by the Modal UI
    }
  };

  const handlePurgeKey = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.KEY, {
        method: "DELETE"
      });
      if (response.ok) {
        setIsBackendConfigured(false);
      }
    } catch (err) {
      alert("Failed to delete key from server");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.query.trim()) return;

    if (!isBackendConfigured) {
      setIsSettingsOpen(true);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, result: null }));
    setLogs([`Fetching sources for topic: ${state.query}`, `Using model: ${AVAILABLE_MODELS.find(m => m.id === state.model)?.name || state.model}`]);

    try {
      // 1. Fetch data through the local proxy
      const rawData = await fetchOpenRouterResponse({
        model: state.model,
        query: state.query
      });

      // 2. Extract the message content
      const content = rawData.choices?.[0]?.message?.content || "";

      if (!content) {
        throw new Error("AI tidak memberikan respon teks apapun.");
      }

      // 3. Validate if the content contains valid JSON and claims
      // This will throw descriptive errors if parsing fails or structure is wrong
      const parsedData = parseClaimsFromResponse(content);

      if (!parsedData.claims || parsedData.claims.length === 0) {
        // Handle specifically if desired, or let it fall through
        setLogs(prev => [...prev, "Warning: No claims found in the response."]);
      }

      // 4. Create simple result object
      const processedData = {
        content: content
      };

      setLogs(prev => [...prev, "Data berhasil diproses."]);

      setState(prev => ({
        ...prev,
        isLoading: false,
        result: processedData
      }));

    } catch (err: any) {
      console.error("Submission error:", err);
      let userFriendlyMessage = err.message || "Terjadi kesalahan yang tidak terduga.";

      // Clean up common technical prefix if it exists
      userFriendlyMessage = userFriendlyMessage.replace(/^Error: /i, '');

      setLogs(prev => [...prev, `Gagal: ${userFriendlyMessage}`]);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: userFriendlyMessage
      }));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-12 selection:bg-red-600 selection:text-white">
      {/* Header */}
      <header className="bg-black/90 backdrop-blur-md border-b border-neutral-900 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-blue-600">
              <Radar className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                OpenRouter <span className="text-blue-600">Proxy</span>
              </h1>
            </div>
            <span className="hidden sm:block text-neutral-800 mx-2">|</span>
            <span className="hidden sm:block text-sm text-neutral-400 font-medium">Claims + Context + Source</span>
          </div>

          <div className="flex items-center space-x-4">
            {isInitialLoading ? (
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-neutral-900/30 border border-neutral-800 rounded-full text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Checking...</span>
              </div>
            ) : isBackendConfigured ? (
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-green-950/30 border border-green-900/50 rounded-full text-[10px] font-bold text-green-500 uppercase tracking-wider animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <span>Ready</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-red-950/30 border border-red-900/50 rounded-full text-[10px] font-bold text-red-500 uppercase tracking-wider animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                <span>Not Ready</span>
              </div>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-full transition-all relative group"
              title="API Settings"
            >
              <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Search Card */}
        <div className="bg-[#0a0a0a] rounded-xl border border-neutral-800 p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-center">
            <label className="text-lg font-bold text-white whitespace-nowrap min-w-max">
              Enter Topic:
            </label>
            <input
              type="text"
              value={state.query}
              onChange={(e) => setState(prev => ({ ...prev, query: e.target.value }))}
              placeholder="e.g. Sapiens: A Brief History of Humankind"
              className="flex-1 w-full px-4 py-3 bg-black border border-neutral-800 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-white placeholder:text-neutral-600 transition-all shadow-inner outline-none"
            />

            <select
              value={state.model}
              onChange={(e) => setState(prev => ({ ...prev, model: e.target.value }))}
              className="w-full md:w-auto max-w-[240px] px-3 py-3 bg-black border border-neutral-800 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-neutral-300 text-sm truncate outline-none"
              aria-label="Select AI Model"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={state.isLoading || !state.query}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all whitespace-nowrap flex items-center justify-center uppercase tracking-wide text-sm"
            >
              {state.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Generate"
              )}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg flex items-start space-x-3 text-red-500 animate-fade-in">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold">Extraction Failed</h4>
              <p className="text-sm opacity-90">{state.error}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {state.result && (
          <div className="animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white pl-2 border-l-4 border-red-600">Generated Claims & Sources</h2>
            </div>
            <ResultView data={state.result} />
          </div>
        )}

        {/* Processing Log */}
        {(logs.length > 0 || state.isLoading) && (
          <div className="bg-[#050505] rounded-lg border border-neutral-900 overflow-hidden shadow-inner">
            <div className="bg-neutral-950 px-4 py-2 border-b border-neutral-900 flex justify-between items-center">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">System Logs</h3>
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              </div>
            </div>
            <div className="p-4 space-y-2 font-mono text-sm">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start space-x-3 text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>{log}</span>
                </div>
              ))}
              {state.isLoading && (
                <div className="flex items-center space-x-3 text-blue-500 animate-pulse">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  <span>Analyzing content and validating citations...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <ApiKeyModal
        isOpen={isSettingsOpen}
        savedKey={isBackendConfigured ? "SERVER_HAS_KEY" : ""}
        onSave={handleSaveKey}
        onPurge={handlePurgeKey}
      />
    </div>
  );
}