import { createElement, useEffect, useState } from "react";

export const PAGE_SIZE = 20;

export function usePaginatedItems<T>(items: readonly T[]) {
  const [requestedPage, setRequestedPage] = useState(1);
  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  const page = Math.min(requestedPage, Math.max(pageCount, 1));

  useEffect(() => {
    if (requestedPage !== page) setRequestedPage(page);
  }, [page, requestedPage]);

  const startIndex = (page - 1) * PAGE_SIZE;

  return {
    page,
    pageCount,
    pageItems: items.slice(startIndex, startIndex + PAGE_SIZE),
    setPage: setRequestedPage,
  };
}

export function Pagination({
  label,
  page,
  pageCount,
  totalItems,
  onPageChange,
}: {
  label: string;
  page: number;
  pageCount: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const firstItem = (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, totalItems);

  return createElement(
    "nav",
    { className: "pagination", "aria-label": `Paginação de ${label}` },
    createElement(
      "span",
      { "aria-live": "polite" },
      `Exibindo ${firstItem}–${lastItem} de ${totalItems}`,
    ),
    createElement(
      "div",
      { className: "pagination-controls" },
      createElement(
        "button",
        {
          type: "button",
          disabled: page === 1,
          onClick: () => onPageChange(page - 1),
        },
        "Anterior",
      ),
      createElement("span", { "aria-live": "polite" }, `Página ${page} de ${pageCount}`),
      createElement(
        "button",
        {
          type: "button",
          disabled: page === pageCount,
          onClick: () => onPageChange(page + 1),
        },
        "Próxima",
      ),
    ),
  );
}
