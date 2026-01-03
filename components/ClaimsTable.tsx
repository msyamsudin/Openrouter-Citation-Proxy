import React, { useState, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { ClaimRow } from '../types';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ClaimsTableDesktop } from './ClaimsTableDesktop';
import { ClaimsCardListMobile } from './ClaimsCardListMobile';

interface ClaimsTableProps {
    data: ClaimRow[];
}

type SortKey = 'claim' | 'category' | 'context';
type SortDirection = 'asc' | 'desc';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export const ClaimsTable: React.FC<ClaimsTableProps> = ({ data }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [sortKey, setSortKey] = useState<SortKey>('category');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [searchInput, setSearchInput] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const debouncedSearch = useDebounce(searchInput, 300);

    // Precompute search index for each row
    const dataWithSearchIndex = useMemo(() => {
        return data.map(row => ({
            ...row,
            searchIndex: `${row.claim} ${row.context} ${row.category}`.toLowerCase()
        }));
    }, [data]);

    // Filtering
    const filteredData = useMemo(() => {
        if (!debouncedSearch.trim()) return dataWithSearchIndex;
        const query = debouncedSearch.toLowerCase();
        return dataWithSearchIndex.filter(row => row.searchIndex.includes(query));
    }, [dataWithSearchIndex, debouncedSearch]);

    // Sorting (stable)
    const sortedData = useMemo(() => {
        const sorted = [...filteredData].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];

            if (aVal === bVal) return 0; // Stable: preserve original order

            const comparison = aVal < bVal ? -1 : 1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return sorted;
    }, [filteredData, sortKey, sortDirection]);

    const handleSort = useCallback((key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    }, [sortKey]);

    const toggleExpand = useCallback((id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    return (
        <div className="bg-[#0a0a0a] rounded-xl shadow-2xl border border-neutral-900 overflow-hidden flex flex-col max-h-[700px] w-full">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 py-3 border-b border-neutral-900 bg-neutral-950/50 backdrop-blur-sm sticky top-0 z-20 gap-3">
                <div className="flex items-center space-x-2 flex-1">
                    <Search className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                    <input
                        type="text"
                        placeholder="Cari klaim, konteks, atau kategori..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded px-3 py-1.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:max-w-xs"
                    />
                </div>
                <div className="text-[10px] sm:text-xs text-neutral-500 font-mono text-center sm:text-right">
                    {sortedData.length} / {data.length} klaim
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {sortedData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="text-neutral-600 text-sm mb-2">
                            {debouncedSearch.trim() ? 'Tidak ada hasil yang cocok dengan pencarian Anda' : 'Topik tidak ditemukan atau sumber data tidak mencukupi untuk mengekstrak klaim.'}
                        </div>
                        {debouncedSearch.trim() && (
                            <button
                                onClick={() => setSearchInput('')}
                                className="text-xs text-blue-500 hover:text-blue-400 underline"
                            >
                                Hapus filter
                            </button>
                        )}
                    </div>
                ) : (
                    isMobile ? (
                        <ClaimsCardListMobile
                            data={sortedData}
                            expandedRows={expandedRows}
                            onToggleExpand={toggleExpand}
                        />
                    ) : (
                        <ClaimsTableDesktop
                            data={sortedData}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            expandedRows={expandedRows}
                            onToggleExpand={toggleExpand}
                        />
                    )
                )}
            </div>
        </div>
    );
};
