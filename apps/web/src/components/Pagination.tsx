import { Icon } from "./Icon";
import type { Pagination as PaginationData } from "../types";

interface PaginationProps {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function Pagination({ pagination, onPageChange, onPageSizeChange }: PaginationProps) {
  const { page, pageSize, total, totalPages } = pagination;
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <nav className="pagination" aria-label="Məhsul səhifələri">
      <p aria-live="polite">
        <strong>{firstItem}–{lastItem}</strong> / {total} məhsul
      </p>
      <div className="pagination__controls">
        <label className="pagination__size">
          <span>Səhifədə</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="Səhifədə göstərilən məhsul sayı"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
        <button
          type="button"
          className="icon-button icon-button--pagination"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Əvvəlki səhifə"
        >
          <Icon name="chevronLeft" />
        </button>
        <span>Səhifə <strong>{totalPages === 0 ? 0 : page}</strong> / {totalPages}</span>
        <button
          type="button"
          className="icon-button icon-button--pagination"
          onClick={() => onPageChange(page + 1)}
          disabled={totalPages === 0 || page >= totalPages}
          aria-label="Növbəti səhifə"
        >
          <Icon name="chevronRight" />
        </button>
      </div>
    </nav>
  );
}
