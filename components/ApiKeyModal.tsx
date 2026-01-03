import React, { useState } from 'react';
import { Key, Lock, Eye, EyeOff, Loader2, ExternalLink, AlertCircle } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onPurge: () => void;
  savedKey: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onPurge, savedKey }) => {
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!inputKey && inputKey !== "SERVER_HAS_KEY") return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(inputKey);
      setInputKey('');
    } catch (err: any) {
      setError(err.message || "Failed to verify API Key");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurge = () => {
    setInputKey('');
    onPurge();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] rounded-xl shadow-2xl shadow-blue-900/10 border border-neutral-800 w-full max-w-md overflow-hidden">
        <div className="bg-black p-6 flex items-center space-x-3 border-b border-neutral-900">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20">
            <Key className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Access Required</h2>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-neutral-400 text-sm leading-relaxed border-l-2 border-red-600 pl-3">
              To access Sonar/Perplexity models, you need a valid <span className="text-white font-medium">OpenRouter API key</span>.
            </p>
            {savedKey ? (
              <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded border border-green-500/20 font-bold uppercase tracking-tight">On Server</span>
            ) : (
              <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20 font-bold uppercase tracking-tight">Not Set</span>
            )}
          </div>

          <div className="text-xs text-neutral-500 italic pb-1">
            {savedKey
              ? "Key is securely stored in the backend server configuration."
              : "No key found on the server. Please enter one to enable the proxy."}
          </div>

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-400 leading-tight">{error}</p>
            </div>
          )}

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-neutral-600 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type={showKey ? "text" : "password"}
              value={inputKey === "SERVER_HAS_KEY" ? "" : inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder={savedKey ? "••••••••••••••••" : "sk-or-..."}
              className="block w-full pl-10 pr-10 py-3 bg-black border border-neutral-800 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none text-white placeholder:text-neutral-700"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-600 hover:text-white"
            >
              {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSave}
              disabled={(!inputKey && inputKey !== "SERVER_HAS_KEY") || isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] flex justify-center items-center uppercase tracking-wide text-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update & Save on Server"
              )}
            </button>

            {savedKey && (
              <button
                onClick={handlePurge}
                className="w-full bg-transparent hover:bg-red-950/20 text-neutral-500 hover:text-red-500 border border-neutral-800 hover:border-red-900/50 py-2.5 px-6 rounded-lg transition-all flex justify-center items-center uppercase tracking-wide text-xs font-semibold"
              >
                Purge Key from Server Config
              </button>
            )}
          </div>

          <div className="text-center pt-2">
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-neutral-500 hover:text-blue-500 hover:underline transition-colors flex items-center justify-center gap-1"
            >
              <span>Get a key from OpenRouter</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};