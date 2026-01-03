import React, { useMemo, useState, useCallback } from 'react';
import { Copy, Check, AlertTriangle } from 'lucide-react';

interface JsonViewerProps {
    data: unknown;
    title?: string;
    maxLines?: number;
}

const THEME = {
    background: '#050505',
    key: '#60a5fa', // blue-400
    string: '#10b981', // emerald-500
    number: '#f59e0b', // amber-500
    boolean: '#a855f7', // purple-500
    null: '#ef4444', // red-500
    punctuation: '#737373', // neutral-500
    text: '#a3a3a3', // neutral-400
};

interface Token {
    type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'whitespace' | 'text';
    content: string;
}

const tokenizeLine = (line: string): Token[] => {
    const tokens: Token[] = [];
    let currentIndex = 0;

    while (currentIndex < line.length) {
        const char = line[currentIndex];

        // Whitespace (indentation)
        if (/\s/.test(char)) {
            let content = '';
            while (currentIndex < line.length && /\s/.test(line[currentIndex])) {
                content += line[currentIndex];
                currentIndex++;
            }
            tokens.push({ type: 'whitespace', content });
            continue;
        }

        // Punctuation
        if (/[{}[\]:,]/.test(char)) {
            tokens.push({ type: 'punctuation', content: char });
            currentIndex++;
            continue;
        }

        // Key (starts with " and followed by :)
        // Note: This is a simplified check that assumes standard JSON.stringify format
        const keyMatch = line.substr(currentIndex).match(/^"([^"]+)":/);
        if (keyMatch) {
            // The key itself (including quotes)
            const fullMatch = keyMatch[0];
            const keyContent = fullMatch.slice(0, -1); // remove colon
            tokens.push({ type: 'key', content: keyContent });
            tokens.push({ type: 'punctuation', content: ':' });
            currentIndex += fullMatch.length;
            continue;
        }

        // String
        if (char === '"') {
            let content = '"';
            currentIndex++;
            while (currentIndex < line.length) {
                const c = line[currentIndex];
                content += c;
                currentIndex++;
                if (c === '"' && line[currentIndex - 2] !== '\\') break;
            }
            tokens.push({ type: 'string', content });
            continue;
        }

        // Number
        const numberMatch = line.substr(currentIndex).match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
        if (numberMatch) {
            tokens.push({ type: 'number', content: numberMatch[0] });
            currentIndex += numberMatch[0].length;
            continue;
        }

        // Boolean
        if (line.substr(currentIndex).startsWith('true')) {
            tokens.push({ type: 'boolean', content: 'true' });
            currentIndex += 4;
            continue;
        }
        if (line.substr(currentIndex).startsWith('false')) {
            tokens.push({ type: 'boolean', content: 'false' });
            currentIndex += 5;
            continue;
        }

        // Null
        if (line.substr(currentIndex).startsWith('null')) {
            tokens.push({ type: 'null', content: 'null' });
            currentIndex += 4;
            continue;
        }

        // Fallback? Should be unreachable for valid standard JSON, but safe to handle
        tokens.push({ type: 'text', content: char });
        currentIndex++;
    }

    return tokens;
};

const JsonLine: React.FC<{ line: string; index: number }> = React.memo(({ line, index }) => {
    const tokens = useMemo(() => tokenizeLine(line), [line]);

    return (
        <div className="group flex hover:bg-neutral-900/50 transition-colors">
            {/* Sticky Line Number */}
            <span
                className="w-10 flex-shrink-0 text-right pr-3 text-[10px] text-neutral-700 select-none border-r border-neutral-900 bg-[#050505] sticky left-0 group-hover:text-neutral-500 font-mono leading-relaxed py-[1px]"
            >
                {index + 1}
            </span>
            {/* Code Content */}
            <code className="pl-3 whitespace-pre font-mono text-xs leading-relaxed py-[1px]">
                {tokens.map((token, i) => (
                    <span
                        key={i}
                        style={{
                            color:
                                token.type === 'key' ? THEME.key :
                                    token.type === 'string' ? THEME.string :
                                        token.type === 'number' ? THEME.number :
                                            token.type === 'boolean' ? THEME.boolean :
                                                token.type === 'null' ? THEME.null :
                                                    token.type === 'punctuation' ? THEME.punctuation :
                                                        THEME.text
                        }}
                    >
                        {token.content}
                    </span>
                ))}
            </code>
        </div>
    );
});

export const JsonViewer: React.FC<JsonViewerProps> = React.memo(({ data, title = "Raw Data", maxLines = 5000 }) => {
    const [copied, setCopied] = useState(false);

    // Memoized string conversion
    const { jsonString, lines, isTooLarge } = useMemo(() => {
        try {
            const str = JSON.stringify(data, null, 2);
            const allLines = str.split('\n');
            return {
                jsonString: str,
                lines: allLines,
                isTooLarge: allLines.length > maxLines
            };
        } catch (e) {
            return { jsonString: "", lines: [], isTooLarge: false }; // Fallback handling handled by parent usually, but safe here
        }
    }, [data, maxLines]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(jsonString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [jsonString]);

    if (!data) return null;

    return (
        <div className="bg-[#050505] rounded-xl border border-neutral-900 overflow-hidden shadow-2xl flex flex-col h-full max-h-[600px]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-900 bg-neutral-950/50 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{title}</span>
                    {isTooLarge && (
                        <span className="flex items-center px-1.5 py-0.5 rounded bg-yellow-900/20 text-yellow-600 text-[10px] font-medium border border-yellow-900/30">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Large Data
                        </span>
                    )}
                </div>
                <button
                    onClick={handleCopy}
                    className="group flex items-center space-x-1.5 px-2 py-1 rounded hover:bg-neutral-800 transition-colors focus:outline-none"
                >
                    {copied ? (
                        <>
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-[10px] uppercase font-bold text-green-500">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-3.5 h-3.5 text-neutral-500 group-hover:text-blue-400 transition-colors" />
                            <span className="text-[10px] uppercase font-bold text-neutral-500 group-hover:text-blue-400 transition-colors">Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="overflow-auto custom-scrollbar flex-1 relative">
                {isTooLarge ? (
                    <div className="p-4">
                        <div className="mb-4 text-xs text-yellow-600/80 font-medium">
                            Data terlalu besar untuk syntax highlighting ({lines.length} baris). Menampilkan mode mentah untuk performa.
                        </div>
                        <pre className="text-xs font-mono text-neutral-400 whitespace-pre-wrap break-all">
                            {jsonString}
                        </pre>
                    </div>
                ) : (
                    <div className="py-2 min-w-max">
                        {lines.map((line, idx) => (
                            <JsonLine key={idx} line={line} index={idx} />
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #050505;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #262626;
          border-radius: 5px;
          border: 2px solid #050505;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #404040;
        }
      `}</style>
        </div>
    );
});

JsonViewer.displayName = 'JsonViewer';
