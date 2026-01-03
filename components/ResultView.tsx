import React, { useState, useEffect } from 'react';
import { ExtractedData, ClaimRow } from '../types';
import { ExternalLink, Copy, FileText, Code, Tag } from 'lucide-react';
import { cleanUrl, getDomain } from '../utils/extractor';
import { JsonViewer } from './JsonViewer';
import { ClaimsTable } from './ClaimsTable';
import { parseClaimsFromResponse } from '../services/openRouterService';

interface ResultViewProps {
  data: ExtractedData;
}

export const ResultView: React.FC<ResultViewProps> = ({ data }) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const [jsonData, setJsonData] = useState<any[] | null>(null);
  const [jsonString, setJsonString] = useState<string>("");
  const [normalizedData, setNormalizedData] = useState<ClaimRow[]>([]);

  useEffect(() => {
    if (!data?.content) return;

    // Use the unified parsing logic from service
    let parsedData: any = null;
    try {
      parsedData = parseClaimsFromResponse(data.content);
    } catch (err) {
      console.warn("Could not extract valid JSON from response content using standard parser.", err);
    }

    // 4. Normalize Data Structure
    if (parsedData) {
      let rawArray: any[] = [];

      if (Array.isArray(parsedData)) {
        rawArray = parsedData;
        setJsonData(parsedData);
        setJsonString(JSON.stringify(parsedData, null, 2));
      } else if (parsedData.claims && Array.isArray(parsedData.claims)) {
        rawArray = parsedData.claims;
        setJsonData(parsedData.claims);
        setJsonString(JSON.stringify(parsedData, null, 2));
      } else if (parsedData.claim) {
        rawArray = [parsedData];
        setJsonData([parsedData]);
        setJsonString(JSON.stringify([parsedData], null, 2));
      }

      // Normalize to ClaimRow[]
      const normalized: ClaimRow[] = rawArray.map((item, idx) => {
        // Extract sources
        let sources: { url: string; domain: string; title?: string }[] = [];

        if (item.sources && Array.isArray(item.sources) && item.sources.length > 0) {
          sources = item.sources
            .filter((s: any) => s.url)
            .map((s: any) => ({
              url: cleanUrl(s.url),
              domain: getDomain(cleanUrl(s.url)),
              title: s.title
            }));
        } else {
          const singleUrl = item.source || item.Source;
          if (singleUrl && typeof singleUrl === 'string' &&
            !singleUrl.toLowerCase().includes('no source') &&
            !singleUrl.toLowerCase().includes('tidak ada sumber')) {
            const clean = cleanUrl(singleUrl);
            sources.push({ url: clean, domain: getDomain(clean) });
          }
        }

        return {
          id: `claim-${idx}`,
          claim: item.claim || item.Claim || '',
          category: item.category || item.Category || 'General',
          context: item.context || item.Context || '',
          sources
        };
      });

      setNormalizedData(normalized);
    }
  }, [data]);

  const copyToClipboard = () => {
    if (jsonString) {
      navigator.clipboard.writeText(jsonString);
      alert('JSON berhasil disalin ke clipboard');
    }
  };

  const exportToCSV = () => {
    if (!jsonData) return;

    // Updated headers to Indonesian
    const headers = ["Klaim", "Konteks", "Kata Kunci", "Sumber", "Kategori"];
    const csvContent = [
      headers.join(","),
      ...jsonData.map(row => {
        const claim = `"${(row.claim || row.Claim || '').replace(/"/g, '""')}"`;
        const context = `"${(row.context || row.Context || '').replace(/"/g, '""')}"`;

        // Extract Keywords
        let keywords = '';
        if (row.keywords && Array.isArray(row.keywords)) {
          keywords = row.keywords.join('; ');
        }
        keywords = `"${keywords.replace(/"/g, '""')}"`;

        // Extract Source (Join multiple sources with semicolon, include title/date)
        let source = '';
        if (row.sources && Array.isArray(row.sources) && row.sources.length > 0) {
          source = row.sources
            .map((s: any) => {
              const u = s.url ? cleanUrl(s.url) : '';
              if (!u) return '';
              const title = s.title ? ` (${s.title})` : '';
              const date = s.date ? ` [${s.date}]` : '';
              return `${u}${title}${date}`;
            })
            .filter(Boolean)
            .join('; ');
        } else {
          source = row.source || row.Source || '';
          if (source) source = cleanUrl(source);
        }
        source = `"${source.replace(/"/g, '""')}"`;

        const category = `"${(row.category || row.Category || '')}"`;
        return [claim, context, keywords, source, category].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "ekspor_klaim.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!jsonData && !showRawJson) {
    return (
      <div className="bg-[#0a0a0a] rounded-lg border border-red-900/30 p-6 text-center shadow-lg">
        <p className="text-red-500 mb-4 font-bold">Gagal memproses data terstruktur. Menampilkan teks mentah.</p>
        <div className="bg-black p-4 rounded text-left text-sm whitespace-pre-wrap font-mono border border-neutral-800 text-neutral-400">
          {data.content}
        </div>
        <button onClick={() => setShowRawJson(true)} className="mt-4 text-blue-500 underline text-sm hover:text-blue-400">Lihat Output Mentah</button>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] rounded-xl shadow-2xl border border-neutral-900 overflow-hidden">
      {/* Table View */}
      {jsonData && !showRawJson ? (
        <ClaimsTable data={normalizedData} />
      ) : (
        <div className="p-4 bg-[#0a0a0a]">
          <JsonViewer data={jsonData || data.content} title="Extracted Data (JSON)" />
        </div>
      )}

      {/* Footer Actions */}
      <div className="bg-[#050505] px-6 py-4 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex space-x-3">
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center px-4 py-2 border border-neutral-800 shadow-sm text-xs font-bold uppercase tracking-wider rounded text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-colors"
          >
            <Copy className="w-4 h-4 mr-2 text-blue-500" />
            Copy Json
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-neutral-800 shadow-sm text-xs font-bold uppercase tracking-wider rounded text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-colors"
          >
            <FileText className="w-4 h-4 mr-2 text-blue-500" />
            CSV
          </button>
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold uppercase tracking-wider rounded text-red-500 hover:text-red-400 bg-red-950/10 hover:bg-red-950/30 focus:outline-none transition-colors"
          >
            <Code className="w-4 h-4 mr-2" />
            {showRawJson ? "Lihat Tabel" : "Raw Data"}
          </button>
        </div>
        <div className="text-xs font-mono text-neutral-600 uppercase">
          Status: <span className="text-blue-500">Completed</span>
        </div>
      </div>
    </div>
  );
};