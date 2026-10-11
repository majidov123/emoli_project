import { useState, type ReactNode } from "react";
import { formatMoney } from "../formatters";
import {
  BOT_SELECTION_COLUMN_WIDTH,
  preferredTableWidth,
  type BotColumnId,
  type TableColumn
} from "../tableColumns";
import type { Product } from "../types";
import { Icon } from "./Icon";
import { MarketplaceStatus, ProductImagePlaceholder, ReadOnlySwitch } from "./ProductBits";

interface BotProductsTableProps {
  products: Product[];
  columns: readonly TableColumn<BotColumnId>[];
  selectedIds: Set<string>;
  onToggleProduct: (id: string) => void;
  onTogglePage: () => void;
  onEditLimits: (product: Product) => void;
}

export function BotProductsTable({
  products,
  columns,
  selectedIds,
  onToggleProduct,
  onTogglePage,
  onEditLimits
}: BotProductsTableProps) {
  const allSelected = products.length > 0 && products.every((product) => selectedIds.has(product.id));
  const preferredWidth = preferredTableWidth(columns, BOT_SELECTION_COLUMN_WIDTH);

  return (
    <div className="table-scroll" tabIndex={0} aria-label="Bot məhsulları cədvəli, üfüqi sürüşdürülə bilər">
      <table className="product-table product-table--bot" style={{ minWidth: `${preferredWidth}px` }}>
        <caption className="sr-only">Bot məhsullarının qiymət, limit, stok və status məlumatları</caption>
        <colgroup>
          <col style={{ width: `${BOT_SELECTION_COLUMN_WIDTH}px` }} />
          {columns.map((column) => (
            <col key={column.id} style={{ width: `${column.width}px` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="checkbox-cell">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onTogglePage}
                aria-label="Bu səhifədəki bütün məhsulları seç"
              />
            </th>
            {columns.map((column) => (
              <th key={column.id} scope="col" className={`column-${column.id}`}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className={selectedIds.has(product.id) ? "is-selected" : ""}>
              <td className="checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedIds.has(product.id)}
                  onChange={() => onToggleProduct(product.id)}
                  aria-label={`${product.name} məhsulunu seç`}
                />
              </td>
              {columns.map((column) => (
                <td key={column.id} className={`column-${column.id} ${botCellClassName(column.id) ?? ""}`}>
                  {renderBotCell(column.id, product, onEditLimits)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderBotCell(
  columnId: BotColumnId,
  product: Product,
  onEditLimits: (product: Product) => void
): ReactNode {
  switch (columnId) {
    case "image":
      return <ProductImage product={product} />;
    case "name":
      return (
        <>
          <strong title={product.name}>{product.name}</strong>
          <span>{product.brand ?? "Brend qeyd edilməyib"}</span>
        </>
      );
    case "productCode":
      return <code className="product-code" title={product.externalId}>{product.externalId}</code>;
    case "category":
      return product.category ?? "—";
    case "currentPrice":
      return formatMoney(product.currentPrice);
    case "previousPrice":
      return formatMoney(product.previousPrice);
    case "stock":
      return <span className={product.stock === 0 ? "stock stock--empty" : "stock"}>{product.stock}</span>;
    case "competitorPrice":
      return formatMoney(product.competitorLowestPrice);
    case "minimumPrice":
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
    case "marketplaceStatus":
      return <MarketplaceStatus product={product} />;
    case "botStatus":
      return <ReadOnlySwitch enabled={product.botEnabled} label={`${product.name} üçün bot ${product.botEnabled ? "aktivdir" : "deaktivdir"}`} />;
  }
}

function ProductImage({ product }: { product: Product }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = product.imageUrl;

  if (!imageUrl || failedUrl === imageUrl) {
    return <ProductImagePlaceholder name={product.name} />;
  }

  return (
    <img
      className="product-image"
      src={imageUrl}
      alt={`${product.name} məhsulunun şəkli`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      style={{ objectFit: "cover" }}
      onError={() => setFailedUrl(imageUrl)}
    />
  );
}

function botCellClassName(columnId: BotColumnId) {
  if (columnId === "name") return "product-name-cell";
  if (columnId === "currentPrice") return "money money--current";
  if (columnId === "previousPrice") return "money money--previous";
  if (columnId === "competitorPrice") return "money";
  return undefined;
}
