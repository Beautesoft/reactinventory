import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function Pagination({ currentPage, totalPages, onPageChange }) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const getPageNumbers = () => {
    const pages = [];
    const maxPageButtons = 3;
    let startPage = Math.max(2, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = startPage + maxPageButtons - 1;

    if (endPage >= totalPages - 1) {
      endPage = totalPages - 1;
      startPage = Math.max(2, endPage - maxPageButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const handlePageChange = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="flex items-end justify-end px-4 pt-4 ">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={isFirstPage}
        className="flex cursor-pointer items-center px-3 py-2 mr-2 text-sm font-medium text-gray-800 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex space-x-1">
        {/* Always show first page */}
        <button
          onClick={() => handlePageChange(1)}
          className={`px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
            currentPage === 1
              ? "bg-gray-800 text-white"
              : "bg-white text-gray-800 hover:bg-gray-300"
          }`}
        >
          1
        </button>

        {/* Show dots if there's a gap after page 1 */}
        {currentPage > 3 && (
          <span className="px-3 py-2 text-sm font-medium text-gray-800">
            ...
          </span>
        )}

        {/* Show middle pages */}
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
              page === currentPage
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-800 hover:bg-gray-300"
            }`}
          >
            {page}
          </button>
        ))}

        {/* Show dots if there's a gap before last page */}
        {currentPage < totalPages - 2 && (
          <span className="px-3 py-2 text-sm font-medium text-gray-800">
            ...
          </span>
        )}

        {/* Show last page if we have more than one page */}
        {totalPages > 1 && (
          <button
            onClick={() => handlePageChange(totalPages)}
            className={`px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
              currentPage === totalPages
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-800 hover:bg-gray-300"
            }`}
          >
            {totalPages}
          </button>
        )}
      </div>
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={isLastPage}
        className="flex items-center cursor-pointer px-3 py-2 ml-2 text-sm font-medium text-gray-800 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default Pagination;
