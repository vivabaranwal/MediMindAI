import * as React from "react";

export const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className = "", ...props }, ref) => (
    <div className="w-full overflow-x-auto border border-gray-300 rounded-[4px]">
      <table ref={ref} className={`w-full text-left border-collapse ${className}`} {...props} />
    </div>
  )
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = "", ...props }, ref) => (
    <thead ref={ref} className={`bg-gray-100 border-b border-gray-300 ${className}`} {...props} />
  )
);
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = "", ...props }, ref) => (
    <tbody ref={ref} className={`divide-y divide-gray-200 bg-white ${className}`} {...props} />
  )
);
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className = "", ...props }, ref) => (
    <tr ref={ref} className={`hover:bg-gray-50/55 transition-colors ${className}`} {...props} />
  )
);
TableRow.displayName = "TableRow";

export const TableHeaderCell = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className = "", ...props }, ref) => (
    <th
      ref={ref}
      className={`px-3 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider ${className}`}
      {...props}
    />
  )
);
TableHeaderCell.displayName = "TableHeaderCell";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className = "", ...props }, ref) => (
    <td
      ref={ref}
      className={`px-3 py-3.5 text-base font-normal text-gray-600 align-middle min-h-[48px] ${className}`}
      {...props}
    />
  )
);
TableCell.displayName = "TableCell";
