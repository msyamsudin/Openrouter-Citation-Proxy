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
      <header className="bg-black/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-blue-500">
              <Radar className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-light text-white tracking-tight">
              OpenRouter <span className="text-blue-500 font-medium">Proxy</span>
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            {isInitialLoading ? (
              <div className="flex items-center space-x-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
              </div>
            ) : isBackendConfigured ? (
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]"></div>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"></div>
              </div>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 text-neutral-500 hover:text-white transition-colors"
              title="API Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Search Form - Hidden when results are shown */}
        {!state.result && (
          <div className="bg-[#0a0a0a]/50 rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                value={state.query}
                onChange={(e) => setState(prev => ({ ...prev, query: e.target.value }))}
                placeholder="Enter a topic to analyze..."
                className="w-full px-5 py-4 bg-black/50 border border-neutral-800/50 rounded-xl focus:border-blue-500/50 focus:bg-black text-white placeholder:text-neutral-600 transition-all outline-none text-base"
              />

              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={state.model}
                  onChange={(e) => setState(prev => ({ ...prev, model: e.target.value }))}
                  className="flex-1 px-4 py-3 bg-black/50 border border-neutral-800/50 rounded-xl focus:border-blue-500/50 text-neutral-300 text-sm outline-none"
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
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-2"
                >
                  {state.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing</span>
                    </>
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error Display */}
        {state.error && (
          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-400 animate-fade-in">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm">{state.error}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {state.result && (
          <div className="animate-fade-in space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-light text-white">Claims</h2>
              <button
                onClick={() => setState(prev => ({ ...prev, result: null, query: '', error: null }))}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white bg-neutral-900/50 hover:bg-neutral-900 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>New Search</span>
              </button>
            </div>
            <ResultView data={state.result} />
          </div>
        )}

        {/* Processing Log */}
        {(logs.length > 0 || state.isLoading) && (
          <div className="bg-[#0a0a0a]/30 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-900/50">
              <h3 className="text-xs font-medium text-neutral-600 uppercase tracking-wider">System Logs</h3>
            </div>
            <div className="p-5 space-y-2 font-mono text-xs">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start space-x-2 text-neutral-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500/50 flex-shrink-0 mt-0.5" />
                  <span>{log}</span>
                </div>
              ))}
              {state.isLoading && (
                <div className="flex items-center space-x-2 text-blue-400 animate-pulse">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
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