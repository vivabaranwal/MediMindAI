import * as React from "react";
import { Button } from "./Button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}) => {
  return (
    <div className={`flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 bg-white ${className}`}>
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Showing Page <span className="font-semibold text-gray-600">{currentPage}</span> of{" "}
            <span className="font-semibold text-gray-600">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-[4px]" aria-label="Pagination">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-r-none border-r-0 min-w-0 px-3 py-1.5"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              &larr; Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-l-none min-w-0 px-3 py-1.5"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next &rarr;
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
};

Pagination.displayName = "Pagination";
