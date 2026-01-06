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
                className="flex items-center space-x-1 text-left w-full hover:text-blue-400 transition-colors focus:outline-none"
            >
                <span>{label}</span>
                {isActive ? (
                    sortDirection === 'asc' ?
                        <ChevronUp className="w-3 h-3" /> :
                        <ChevronDown className="w-3 h-3" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-20" />
                )}
            </button>
        );
    };

    return (
        <div className="overflow-auto flex-1">
            <table className="min-w-full">
                <thead className="bg-black/50 sticky top-0 z-10 backdrop-blur-sm">
                    <tr className="border-b border-neutral-900/50">
                        <th scope="col" className="px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider w-1/4">
                            <SortButton column="claim" label="Claim" />
                        </th>
                        <th scope="col" className="px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider w-1/3">
                            <SortButton column="context" label="Context" />
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider w-1/4">
                            Source
                        </th>
                        <th scope="col" className="px-6 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider w-[10%]">
                            <SortButton column="category" label="Category" />
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/30 bg-transparent">
                    {data.map((row) => {
                        const isExpanded = expandedRows.has(row.id);
                        const shouldTruncate = row.context.length > 150;

                        return (
                            <tr key={row.id} className="hover:bg-[#0a0a0a]/50 transition-colors group">
                                <td className="px-6 py-4 text-sm text-white align-top leading-relaxed">
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
                                                className="text-xs text-blue-500 hover:text-blue-400 self-start focus:outline-none"
                                            >
                                                {isExpanded ? 'Show less' : 'Show more'}
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm align-top">
                                    {row.sources.length > 0 ? (
                                        <div className="flex flex-col space-y-2">
                                            {row.sources.map((src, i) => (
                                                <div key={i} className="flex flex-col space-y-1">
                                                    <a
                                                        href={src.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center space-x-1.5 text-blue-400 hover:text-blue-300 transition-colors group/link w-fit"
                                                    >
                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                        <span className="text-xs font-medium">
                                                            {src.domain}
                                                        </span>
                                                    </a>
                                                    {src.title && (
                                                        <div className="pl-4 text-xs text-neutral-600">
                                                            <span className="block line-clamp-2" title={src.title}>
                                                                {src.title}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-neutral-700 italic text-xs">No source</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm align-top">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-neutral-900/50 text-xs font-medium text-neutral-400">
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
