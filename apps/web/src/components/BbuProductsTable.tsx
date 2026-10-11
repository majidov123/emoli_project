import type { ReactNode } from "react";
import { formatDate, formatMoney } from "../formatters";
import { preferredTableWidth, type BbuColumnId, type TableColumn } from "../tableColumns";
import type { Product } from "../types";
import { Icon } from "./Icon";
import { ReadOnlySwitch, StatusBadge } from "./ProductBits";

interface BbuProductsTableProps {
  products: Product[];
  page: number;
  pageSize: number;
  columns: readonly TableColumn<BbuColumnId>[];
  onEditLimits: (product: Product) => void;
}

function renderCell(
  columnId: BbuColumnId,
  product: Product,
  rowNumber: number,
  onEditLimits: (product: Product) => void
): ReactNode {
  switch (columnId) {
    case "number":
      return rowNumber;
    case "productCode":
      return <code className="product-code" title={product.externalId}>{product.externalId}</code>;
    case "productName":
      return <strong title={product.name}>{product.name}</strong>;
    case "quantity":
      return <span className={product.stock === 0 ? "stock stock--empty" : "stock"}>{product.stock}</span>;
    case "currentPrice":
      return formatMoney(product.currentPrice);
    case "marketplacePrice":
      return formatMoney(product.marketplacePrice);
    case "cheapestSeller":
      return product.cheapestSellerName ?? "—";
    case "updatedAt":
      return formatDate(product.sourceUpdatedAt);
    case "article":
      return product.sku ?? "—";
    case "mpn":
      return product.mpn ?? "—";
    case "barcode":
      return product.barcode ?? "—";
    case "costPrice":
      return formatMoney(product.costPrice ?? null);
    case "limit":
      return (
        <div className="limit-value">
          <span className="money">{formatMoney(product.minimumPrice)}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => onEditLimits(product)}
            aria-label={`${product.name} üçün qiymət limitlərinə bax`}
          >
            <Icon name="edit" />
          </button>
        </div>
      );
    case "status":
      return <StatusBadge status={product.normalizedStatus} />;
    case "pickupPoint":
      return product.pickupPoint ?? "—";
    case "botStatus":
      return <ReadOnlySwitch enabled={product.botEnabled} label={`${product.name} üçün bot ${product.botEnabled ? "aktivdir" : "deaktivdir"}`} />;
  }
}

function cellClassName(columnId: BbuColumnId) {
  if (columnId === "number") return "row-number";
  if (columnId === "productName") return "product-name-cell product-name-cell--compact";
  if (columnId === "currentPrice") return "money money--current";
  if (columnId === "marketplacePrice" || columnId === "costPrice") return "money";
  if (columnId === "updatedAt") return "date-cell";
  return undefined;
}

export function BbuProductsTable({ products, page, pageSize, columns, onEditLimits }: BbuProductsTableProps) {
  const preferredWidth = preferredTableWidth(columns);

  return (
    <div className="table-scroll" tabIndex={0} aria-label="BBU məhsulları cədvəli, üfüqi sürüşdürülə bilər">
      <table className="product-table product-table--bbu" style={{ minWidth: `${preferredWidth}px` }}>
        <caption className="sr-only">BBU məhsullarının kod, qiymət, stok, limit və status məlumatları</caption>
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} style={{ width: `${column.width}px` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col" className={`column-${column.id}`}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => {
            const rowNumber = (page - 1) * pageSize + index + 1;
            return (
              <tr key={product.id}>
                {columns.map((column) => (
                  <td key={column.id} className={`column-${column.id} ${cellClassName(column.id) ?? ""}`}>
                    {renderCell(column.id, product, rowNumber, onEditLimits)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
