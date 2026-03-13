/* ============================================================
   FILE: js/storage.js
   All LocalStorage operations: orders, stock, helpers
   ============================================================ */

const ORDERS_KEY = 'schoolSaleOrders_v2';
const STOCK_KEY  = 'schoolSaleStock_v2';
const VAT_RATE   = 0.10; // 10% VAT

/* ============================================================
   ORDER FUNCTIONS
   ============================================================ */

/**
 * Load all saved orders.
 * @returns {Array} Array of order objects.
 */
function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('loadOrders error:', e);
    return [];
  }
}

/**
 * Save a new completed order.
 * Order structure:
 * {
 *   id, date, items,
 *   subtotal, vat, total,
 *   received, change,
 *   paymentType   // 'cash' | 'transfer'
 * }
 */
function saveOrder(order) {
  try {
    const orders = loadOrders();
    orders.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('saveOrder error:', e);
  }
}

/**
 * Delete all saved orders.
 */
function clearAllOrders() {
  localStorage.removeItem(ORDERS_KEY);
}

/**
 * Generate a unique order ID.
 */
function generateOrderId() {
  return 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 9000 + 1000);
}

/* ── Revenue helpers ──────────────────────────────────── */
function getTotalRevenue()   { return loadOrders().reduce((s, o) => s + o.total, 0); }
function getTotalVAT()       { return loadOrders().reduce((s, o) => s + o.vat,   0); }
function getOrderCount()     { return loadOrders().length; }
function getCashRevenue()    { return loadOrders().filter(o => o.paymentType === 'cash').reduce((s, o) => s + o.total, 0); }
function getTransferRevenue(){ return loadOrders().filter(o => o.paymentType === 'transfer').reduce((s, o) => s + o.total, 0); }

/**
 * Total items sold across all orders.
 */
function getTotalItemsSold() {
  return loadOrders().reduce((sum, o) => {
    return sum + o.items.reduce((s, i) => s + i.qty, 0);
  }, 0);
}

/**
 * Find the best-selling product name.
 * Returns a string or '—' if no orders.
 */
function getBestSeller() {
  const orders = loadOrders();
  if (orders.length === 0) return '—';
  const tally = {};
  orders.forEach(o => o.items.forEach(i => {
    tally[i.name] = (tally[i.name] || 0) + i.qty;
  }));
  return Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
}

/* ============================================================
   STOCK FUNCTIONS
   ============================================================ */

/**
 * Load stock object from LocalStorage.
 * Structure: { productId: stockQty, ... }
 */
function loadStock() {
  try {
    const raw = localStorage.getItem(STOCK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Save the entire stock object back to LocalStorage.
 */
function saveStock(stockObj) {
  localStorage.setItem(STOCK_KEY, JSON.stringify(stockObj));
}

/**
 * Get current stock for a single product by ID.
 * Returns a number (default 0 if not set yet).
 */
function getStock(productId) {
  const stock = loadStock();
  return stock[productId] !== undefined ? stock[productId] : 0;
}

/**
 * Set stock for a single product.
 */
function setStock(productId, qty) {
  const stock = loadStock();
  stock[productId] = Math.max(0, qty);
  saveStock(stock);
}

/**
 * Add to existing stock (e.g. restocking).
 */
function addStock(productId, qty) {
  const stock = loadStock();
  stock[productId] = (stock[productId] || 0) + Math.max(0, qty);
  saveStock(stock);
}

/**
 * Decrease stock for each item in a completed order.
 * Prevents going below 0.
 */
function deductStockForOrder(items) {
  const stock = loadStock();
  items.forEach(item => {
    if (stock[item.productId] !== undefined) {
      stock[item.productId] = Math.max(0, stock[item.productId] - item.qty);
    }
  });
  saveStock(stock);
}

/**
 * Initialize stock for all products if they have no record yet.
 * Called from pos.js on startup with the PRODUCTS array.
 */
function initStock(products) {
  const stock = loadStock();
  let changed = false;
  products.forEach(p => {
    if (stock[p.id] === undefined) {
      stock[p.id] = p.defaultStock || 50; // default starting stock
      changed = true;
    }
  });
  if (changed) saveStock(stock);
}

/* ============================================================
   VAT HELPER
   ============================================================ */

/**
 * Calculate VAT breakdown from a subtotal (pre-VAT amount).
 * Returns { subtotal, vat, total }
 */
function calcVAT(subtotal) {
  const vat   = Math.round(subtotal * VAT_RATE);
  const total = subtotal + vat;
  return { subtotal, vat, total };
}

/* ============================================================
   CSV EXPORT
   ============================================================ */

/**
 * Export all orders to a CSV file and trigger download.
 * CSV columns: Date, Product, Price, Quantity, Subtotal, VAT, Total, PaymentType
 */
function exportCSV() {
  const orders = loadOrders();
  if (orders.length === 0) {
    alert('ບໍ່ມີຂໍ້ມູນທີ່ຈະສົ່ງອອກ (No data to export)');
    return;
  }

  const header = ['Date', 'OrderID', 'Product', 'Price (KIP)', 'Quantity',
                  'Line Total (KIP)', 'Subtotal (KIP)', 'VAT (KIP)', 'Total (KIP)', 'Payment Type'];
  const rows   = [header.join(',')];

  orders.forEach(order => {
    const date    = new Date(order.date).toLocaleString('en-GB');
    const payType = order.paymentType === 'cash' ? 'Cash' : 'Transfer';
    order.items.forEach(item => {
      rows.push([
        `"${date}"`,
        order.id,
        `"${item.name}"`,
        item.price,
        item.qty,
        item.lineTotal,
        order.subtotal,
        order.vat,
        order.total,
        payType,
      ].join(','));
    });
  });

  const csv  = rows.join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'sales-report.csv';
  a.click();
  URL.revokeObjectURL(url);
}