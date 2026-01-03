import React from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { ClaimRow } from '../types';

interface ClaimsCardListMobileProps {
    data: ClaimRow[];
    expandedRows: Set<string>;
    onToggleExpand: (id: string) => void;
}

export const ClaimsCardListMobile: React.FC<ClaimsCardListMobileProps> = ({
    data,
    expandedRows,
    onToggleExpand,
}) => {
    return (
        <div className="flex flex-col space-y-4 p-4 overflow-auto flex-1">
            {data.map((row) => {
                const isExpanded = expandedRows.has(row.id);
                const shouldTruncate = row.context.length > 100;

                return (
                    <article
                        key={row.id}
                        className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4 flex flex-col space-y-4"
                    >
                        {/* Klaim - Primary Info */}
                        <div>
                            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">
                                Klaim
                            </h3>
                            <p className="text-white text-base font-medium leading-relaxed">
                                {row.claim}
                            </p>
                        </div>

                        {/* Description List for Metadata */}
                        <dl className="grid grid-cols-1 gap-4">
                            {/* Kategori */}
                            <div>
                                <dt className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">
                                    Kategori
                                </dt>
                                <dd>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded border border-neutral-800 text-xs font-medium bg-black text-neutral-300">
                                        {row.category || 'General'}
                                    </span>
                                </dd>
                            </div>

                            {/* Sumber */}
                            <div>
                                <dt className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">
                                    Sumber
                                </dt>
                                <dd className="flex flex-col space-y-2">
                                    {row.sources.length > 0 ? (
                                        row.sources.map((src, i) => (
                                            <a
                                                key={i}
                                                href={src.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center space-x-2 text-blue-400 hover:text-red-400 transition-colors p-2 -m-2 rounded-lg active:bg-neutral-800"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span className="font-medium text-sm truncate">
                                                    {src.domain}
                                                </span>
                                            </a>
                                        ))
                                    ) : (
                                        <span className="text-neutral-600 italic text-xs">Tidak ada sumber</span>
                                    )}
                                </dd>
                            </div>

                            {/* Konteks - Collapsible */}
                            <div>
                                <dt className="sr-only">Konteks</dt>
                                <dd className="flex flex-col">
                                    <button
                                        onClick={() => onToggleExpand(row.id)}
                                        aria-expanded={isExpanded}
                                        className="flex items-center justify-between w-full py-3 px-4 -mx-4 bg-neutral-800/30 rounded-lg text-sm text-neutral-300 hover:text-white transition-colors focus:outline-none"
                                        style={{ minHeight: '44px' }}
                                    >
                                        <span className="font-semibold uppercase tracking-tighter text-xs text-neutral-500">
                                            {isExpanded ? 'Sembunyikan Konteks' : 'Lihat Konteks'}
                                        </span>
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4 text-neutral-500" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-neutral-500" />
                                        )}
                                    </button>

                                    {isExpanded && (
                                        <div className="mt-3 text-sm text-neutral-400 leading-relaxed border-l-2 border-neutral-700 pl-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                            {row.context}
                                        </div>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </article>
                );
            })}
        </div>
    );
};
