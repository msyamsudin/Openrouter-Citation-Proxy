import React from 'react';
import { ExternalLink, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { ClaimRow } from '../types';

interface ClaimsTableDesktopProps {
    data: ClaimRow[];
    sortKey: 'claim' | 'category' | 'context';
    sortDirection: 'asc' | 'desc';
    onSort: (key: 'claim' | 'category' | 'context') => void;
    expandedRows: Set<string>;
    onToggleExpand: (id: string) => void;
}

export const ClaimsTableDesktop: React.FC<ClaimsTableDesktopProps> = ({
    data,
    sortKey,
    sortDirection,
    onSort,
    expandedRows,
    onToggleExpand,
}) => {
    const SortButton: React.FC<{ column: 'claim' | 'category' | 'context'; label: string }> = ({ column, label }) => {
        const isActive = sortKey === column;
        const ariaSortValue = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

        return (
            <button
                onClick={() => onSort(column)}
                aria-sort={ariaSortValue}
                className="flex items-center space-x-1 text-left w-full hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded px-1"
            >
                <span>{label}</span>
                {isActive ? (
                    sortDirection === 'asc' ?
                        <ChevronUp className="w-3 h-3" /> :
                        <ChevronDown className="w-3 h-3" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                )}
            </button>
        );
    };

    return (
        <div className="overflow-auto flex-1">
            <table className="min-w-full divide-y divide-neutral-900">
                <thead className="bg-black sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                        <th scope="col" className="px-6 py-4 text-xs font-bold text-blue-500 uppercase tracking-wider border-b border-neutral-800 w-1/4">
                            <SortButton column="claim" label="Klaim" />
                        </th>
                        <th scope="col" className="px-6 py-4 text-xs font-bold text-blue-500 uppercase tracking-wider border-b border-neutral-800 w-1/3">
                            <SortButton column="context" label="Konteks" />
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-red-500 uppercase tracking-wider border-b border-neutral-800 w-1/4">
                            Sumber
                        </th>
                        <th scope="col" className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 w-[10%]">
                            <SortButton column="category" label="Kategori" />
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 bg-[#0a0a0a]">
                    {data.map((row) => {
                        const isExpanded = expandedRows.has(row.id);
                        const shouldTruncate = row.context.length > 150;

                        return (
                            <tr key={row.id} className="hover:bg-neutral-900/50 transition-colors group">
                                <td className="px-6 py-4 text-sm text-white align-top leading-relaxed font-medium">
                                    {row.claim}
                                </td>
                                <td className="px-6 py-4 text-sm text-neutral-400 align-top leading-relaxed">
                                    <div className="flex flex-col gap-2">
                                        <div className={!isExpanded && shouldTruncate ? 'line-clamp-3' : ''}>
                                            {row.context}
                                        </div>
                                        {shouldTruncate && (
                                            <button
                                                onClick={() => onToggleExpand(row.id)}
                                                className="text-xs text-blue-500 hover:text-blue-400 self-start focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                                            >
                                                {isExpanded ? 'Sembunyikan' : 'Lihat selengkapnya'}
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm align-top">
                                    {row.sources.length > 0 ? (
                                        <div className="flex flex-col space-y-3">
                                            {row.sources.map((src, i) => (
                                                <div key={i} className="flex flex-col space-y-1">
                                                    <a
                                                        href={src.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center space-x-2 text-blue-400 hover:text-red-400 transition-colors group/link w-fit focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                                                    >
                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                        <span className="font-medium border-b border-transparent group-hover/link:border-red-400">
                                                            {src.domain}
                                                        </span>
                                                    </a>
                                                    {src.title && (
                                                        <div className="pl-5 text-xs text-neutral-500 font-mono">
                                                            <span className="text-neutral-400 block line-clamp-2" title={src.title}>
                                                                {src.title}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-neutral-600 italic text-xs">Tidak ada sumber</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm align-top">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded border border-neutral-800 text-xs font-medium bg-black text-neutral-300">
                                        {row.category || 'General'}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
