import { useEffect, useState } from "react";

import { loadProductTypeCatalog } from "@shared/api/productTypeApi";
import { buildProductTypeNameMap } from "@shared/utils/productTypeLabel";

/*
 * Map id loại hàng (chữ thường) → tên, từ danh mục GET /api/product-types nạp MỘT lần
 * cho cả phiên (promise cấp module trong productTypeApi). Dùng cùng
 * `resolveProductTypeLabel(item, nameById)`.
 *
 * `enabled = false` thì không gọi mạng (màn truyền `needsProductTypeCatalog(items)` để chỉ
 * nạp khi có dòng hàng chỉ mang GUID). Tải lỗi: Map rỗng — nhãn rơi về "Chưa phân loại",
 * không bao giờ hiện GUID.
 */
const EMPTY_MAP = new Map();

let resolvedMap = null;

/* Map dựng một lần rồi dùng lại cho mọi màn — giữ ở cấp module, ngoài hook. */
const rememberCatalog = (list) => {
  resolvedMap = buildProductTypeNameMap(list);
  return resolvedMap;
};

const getRememberedMap = () => resolvedMap;

const useProductTypeNames = (enabled = true) => {
  const [nameById, setNameById] = useState(() => getRememberedMap() || EMPTY_MAP);

  useEffect(() => {
    if (!enabled || getRememberedMap()) return undefined;

    let active = true;

    loadProductTypeCatalog()
      .then((list) => {
        const map = rememberCatalog(list);
        if (active) setNameById(map);
      })
      .catch(() => {
        /* Lỗi đã log ở tầng api; lần mount sau thử lại (lỗi không được cache). */
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return getRememberedMap() || nameById;
};

export default useProductTypeNames;
