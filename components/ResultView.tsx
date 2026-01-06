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
    <div className="bg-transparent rounded-2xl overflow-hidden">
      {/* Table View */}
      {jsonData && !showRawJson ? (
        <ClaimsTable data={normalizedData} />
      ) : (
        <div className="p-4 bg-[#0a0a0a]/30">
          <JsonViewer data={jsonData || data.content} title="Extracted Data (JSON)" />
        </div>
      )}

      {/* Footer Actions */}
      <div className="bg-[#0a0a0a]/30 px-6 py-4 border-t border-neutral-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex space-x-2">
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-neutral-400 bg-black/50 hover:bg-black hover:text-white border border-neutral-800/50 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy JSON
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-neutral-400 bg-black/50 hover:bg-black hover:text-white border border-neutral-800/50 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </button>
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-blue-500 hover:text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 transition-colors"
          >
            <Code className="w-3.5 h-3.5 mr-1.5" />
            {showRawJson ? "Table View" : "Raw JSON"}
          </button>
        </div>
        <div className="text-xs font-mono text-neutral-600">
          <span className="text-blue-500">●</span> Completed
        </div>
      </div>
    </div>
  );
};