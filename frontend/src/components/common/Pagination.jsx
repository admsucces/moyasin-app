import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 25,
  onPageChange,
  className = '',
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');

      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/70 text-xs ${className}`}>
      <div className="text-slate-500 font-medium">
        Menampilkan <span className="font-semibold text-slate-800 font-mono">{startItem}</span> - <span className="font-semibold text-slate-800 font-mono">{endItem}</span> dari <span className="font-semibold text-slate-800 font-mono">{totalItems}</span> data
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1 self-center sm:self-auto">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            title="Halaman Pertama"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Prev */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            title="Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers().map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-slate-400 text-xs select-none">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-7 h-7 px-2 rounded-lg text-xs font-semibold transition-all ${
                    currentPage === p
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          {/* Next */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            title="Selanjutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            title="Halaman Terakhir"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;

