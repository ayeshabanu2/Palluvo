/**
 * PALLUVO E-commerce Global Store & UI Controller
 * Manages Cart, Wishlist, Orders, Search Overlay, Quick View, Toasts, and Shared UI.
 */

// Helper to format Indian Rupee currency: e.g. ₹4,999
function formatINR(amount) {
  if (isNaN(amount)) amount = 0;
  return '₹' + amount.toLocaleString('en-IN');
}

// =========================================================================
// CART STORE
// =========================================================================
const CartStore = {
  FREE_SHIPPING_THRESHOLD: 2999,
  STANDARD_SHIPPING_FEE: 199,

  getCart: function () {
    try {
      const stored = localStorage.getItem('palluvo_cart');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  saveCart: function (cart) {
    try {
      localStorage.setItem('palluvo_cart', JSON.stringify(cart));
      this.updateBadges();
      this.renderDrawer();
    } catch (e) {
      console.error("Failed to save cart", e);
    }
  },

  getCoupon: function () {
    try {
      const stored = localStorage.getItem('palluvo_coupon');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },

  setCoupon: function (coupon) {
    if (coupon) {
      localStorage.setItem('palluvo_coupon', JSON.stringify(coupon));
    } else {
      localStorage.removeItem('palluvo_coupon');
    }
    this.saveCart(this.getCart());
  },

  addItem: function (productId, qty = 1, options = {}) {
    const product = ProductsCatalog.getById(productId);
    if (!product) return;

    const cart = this.getCart();
    const color = options.color || product.color;
    const blouseId = options.blouseId || 'unstitched';
    const blouseOption = product.blouseOptions.find(b => b.id === blouseId) || product.blouseOptions[0];

    const cartItemId = `${product.id}_${color.replace(/\s+/g, '-').toLowerCase()}_${blouseId}`;
    const existingIndex = cart.findIndex(item => item.cartItemId === cartItemId);

    if (existingIndex > -1) {
      cart[existingIndex].qty += qty;
    } else {
      cart.push({
        cartItemId: cartItemId,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.images[0],
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        color: color,
        colorHex: (product.swatches.find(s => s.name === color) || {}).hex || product.colorHex,
        blouseName: blouseOption.name,
        blousePrice: blouseOption.price,
        blouseId: blouseId,
        unitTotal: product.price + blouseOption.price,
        qty: qty
      });
    }

    this.saveCart(cart);
    Toast.show(`Added “${product.name}” to your bag`, 'success', 'View Bag', () => {
      CartDrawer.open();
    });
    CartDrawer.open();
  },

  updateQty: function (cartItemId, delta) {
    let cart = this.getCart();
    const item = cart.find(i => i.cartItemId === cartItemId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(i => i.cartItemId !== cartItemId);
      Toast.show(`Item removed from your bag`, 'info');
    }
    this.saveCart(cart);
  },

  removeItem: function (cartItemId) {
    let cart = this.getCart();
    const item = cart.find(i => i.cartItemId === cartItemId);
    if (item) {
      cart = cart.filter(i => i.cartItemId !== cartItemId);
      this.saveCart(cart);
      Toast.show(`Removed “${item.name}” from your bag`, 'info');
    }
  },

  moveToWishlist: function (cartItemId) {
    const cart = this.getCart();
    const item = cart.find(i => i.cartItemId === cartItemId);
    if (item) {
      WishlistStore.add(item.productId);
      this.removeItem(cartItemId);
      Toast.show(`Moved “${item.name}” to your Wishlist`, 'success');
    }
  },

  applyCoupon: function (code) {
    if (!code) return { success: false, message: "Please enter a coupon code" };
    const normalized = code.trim().toUpperCase();
    if (normalized === 'PALLUVO10') {
      const coupon = { code: 'PALLUVO10', type: 'percent', value: 10, label: '10% Off Private Edit' };
      this.setCoupon(coupon);
      return { success: true, message: "Coupon applied: 10% discount on your order!" };
    } else if (normalized === 'FIRSTDRAPE') {
      const coupon = { code: 'FIRSTDRAPE', type: 'flat', value: 500, label: '₹500 Welcome Courtesy' };
      this.setCoupon(coupon);
      return { success: true, message: "Coupon applied: ₹500 discount on your order!" };
    } else {
      return { success: false, message: "Invalid coupon. Try 'PALLUVO10' or 'FIRSTDRAPE'" };
    }
  },

  getTotals: function () {
    const cart = this.getCart();
    let subtotal = 0;
    let itemCount = 0;

    cart.forEach(item => {
      subtotal += item.unitTotal * item.qty;
      itemCount += item.qty;
    });

    const isShippingFree = subtotal >= this.FREE_SHIPPING_THRESHOLD || subtotal === 0;
    const shipping = isShippingFree ? 0 : this.STANDARD_SHIPPING_FEE;
    const remainingForFreeShipping = Math.max(0, this.FREE_SHIPPING_THRESHOLD - subtotal);
    const progressPercent = Math.min(100, Math.round((subtotal / this.FREE_SHIPPING_THRESHOLD) * 100));

    // Calculate discount
    const coupon = this.getCoupon();
    let discount = 0;
    if (coupon && subtotal > 0) {
      if (coupon.type === 'percent') {
        discount = Math.round(subtotal * (coupon.value / 100));
      } else if (coupon.type === 'flat') {
        discount = Math.min(subtotal, coupon.value);
      }
    }

    const total = Math.max(0, subtotal - discount + shipping);

    return {
      subtotal,
      shipping,
      discount,
      coupon,
      total,
      itemCount,
      isShippingFree,
      remainingForFreeShipping,
      progressPercent
    };
  },

  updateBadges: function () {
    const totals = this.getTotals();
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => {
      badge.textContent = totals.itemCount;
      if (totals.itemCount > 0) {
        badge.classList.remove('hidden');
        badge.classList.add('active-bump');
        setTimeout(() => badge.classList.remove('active-bump'), 300);
      } else {
        badge.classList.add('hidden');
      }
    });
  },

  renderDrawer: function () {
    const drawerItems = document.getElementById('cartDrawerItems');
    const drawerTotals = document.getElementById('cartDrawerFooter');
    const freeShippingBar = document.getElementById('cartFreeShippingProgress');
    const freeShippingText = document.getElementById('cartFreeShippingText');

    if (!drawerItems || !drawerTotals) return;

    const cart = this.getCart();
    const totals = this.getTotals();

    // Progress bar
    if (freeShippingBar && freeShippingText) {
      if (totals.remainingForFreeShipping === 0 && totals.subtotal > 0) {
        freeShippingText.innerHTML = `<span class="text-gold font-medium">✨ Congratulations! You've unlocked Complimentary Express Shipping.</span>`;
        freeShippingBar.style.width = '100%';
      } else {
        freeShippingText.innerHTML = `Add <span class="font-semibold text-charcoal">${formatINR(totals.remainingForFreeShipping)}</span> more for <strong>Complimentary Shipping</strong>`;
        freeShippingBar.style.width = `${totals.progressPercent}%`;
      }
    }

    if (cart.length === 0) {
      drawerItems.innerHTML = `
        <div class="cart-empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
          <h3 class="empty-title">Your shopping bag is empty</h3>
          <p class="empty-sub">Discover our curated collection of contemporary drapes crafted for moments that matter.</p>
          <a href="sarees.html" class="btn btn-primary btn-sm" onclick="CartDrawer.close()">Explore Sarees</a>
        </div>
      `;
      drawerTotals.style.display = 'none';
      return;
    }

    drawerTotals.style.display = 'block';

    let itemsHtml = '';
    cart.forEach(item => {
      itemsHtml += `
        <div class="cart-item-row" data-cart-id="${item.cartItemId}">
          <a href="product.html?id=${item.slug}" class="cart-item-img-link" onclick="CartDrawer.close()">
            <img src="${item.image}" alt="${item.name}" class="cart-item-thumb">
          </a>
          <div class="cart-item-details">
            <div class="cart-item-header">
              <h4 class="cart-item-title">
                <a href="product.html?id=${item.slug}" onclick="CartDrawer.close()">${item.name}</a>
              </h4>
              <button class="cart-item-remove-btn" onclick="CartStore.removeItem('${item.cartItemId}')" aria-label="Remove item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="cart-item-meta">
              <span class="meta-color"><span class="color-dot" style="background:${item.colorHex}"></span> ${item.color}</span>
              ${item.blousePrice > 0 ? `<span class="meta-blouse">+ ${item.blouseName} (+${formatINR(item.blousePrice)})</span>` : `<span class="meta-blouse">${item.blouseName}</span>`}
            </div>
            <div class="cart-item-footer">
              <div class="qty-stepper">
                <button class="qty-btn" onclick="CartStore.updateQty('${item.cartItemId}', -1)" aria-label="Decrease quantity">−</button>
                <span class="qty-num">${item.qty}</span>
                <button class="qty-btn" onclick="CartStore.updateQty('${item.cartItemId}', 1)" aria-label="Increase quantity">+</button>
              </div>
              <div class="cart-item-pricing">
                ${item.compareAtPrice ? `<span class="compare-price">${formatINR(item.compareAtPrice * item.qty)}</span>` : ''}
                <span class="item-price">${formatINR(item.unitTotal * item.qty)}</span>
              </div>
            </div>
            <div class="cart-item-actions">
              <button class="btn-text-link" onclick="CartStore.moveToWishlist('${item.cartItemId}')">Save to Wishlist</button>
            </div>
          </div>
        </div>
      `;
    });
    drawerItems.innerHTML = itemsHtml;

    // Render totals & coupon
    const couponHtml = totals.coupon ? `
      <div class="applied-coupon-row">
        <span>Coupon <strong>${totals.coupon.code}</strong> applied (-${formatINR(totals.discount)})</span>
        <button class="btn-text-link remove-coupon" onclick="CartStore.setCoupon(null)">Remove</button>
      </div>
    ` : `
      <div class="drawer-coupon-toggle">
        <div class="coupon-input-group">
          <input type="text" id="drawerCouponInput" placeholder="Discount code (e.g. PALLUVO10)" class="coupon-field">
          <button class="btn btn-outline btn-xs" onclick="applyDrawerCoupon()">Apply</button>
        </div>
      </div>
    `;

    drawerTotals.innerHTML = `
      ${couponHtml}
      <div class="drawer-cost-breakdown">
        <div class="cost-row">
          <span>Subtotal</span>
          <span>${formatINR(totals.subtotal)}</span>
        </div>
        ${totals.discount > 0 ? `
        <div class="cost-row text-gold">
          <span>Discount</span>
          <span>-${formatINR(totals.discount)}</span>
        </div>` : ''}
        <div class="cost-row">
          <span>Estimated Shipping</span>
          <span>${totals.shipping === 0 ? '<span class="text-gold">COMPLIMENTARY</span>' : formatINR(totals.shipping)}</span>
        </div>
        <div class="cost-row total-row">
          <span>Total</span>
          <span class="total-amount">${formatINR(totals.total)}</span>
        </div>
        <p class="tax-note">Taxes and duties included in all prices.</p>
      </div>
      <div class="drawer-cta-group">
        <a href="checkout.html" class="btn btn-primary btn-block">PROCEED TO CHECKOUT</a>
        <a href="cart.html" class="btn btn-ghost btn-block btn-xs" onclick="CartDrawer.close()">View Full Bag</a>
      </div>
      <div class="cart-trust-badges">
        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> 100% Authentic Handloom</span>
        <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> 7-Day Hassle-Free Returns</span>
      </div>
    `;
  }
};

window.applyDrawerCoupon = function () {
  const input = document.getElementById('drawerCouponInput');
  if (!input) return;
  const res = CartStore.applyCoupon(input.value);
  if (res.success) {
    Toast.show(res.message, 'success');
  } else {
    Toast.show(res.message, 'error');
  }
};

// =========================================================================
// WISHLIST STORE
// =========================================================================
const WishlistStore = {
  getWishlist: function () {
    try {
      const stored = localStorage.getItem('palluvo_wishlist');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  saveWishlist: function (list) {
    try {
      localStorage.setItem('palluvo_wishlist', JSON.stringify(list));
      this.updateBadges();
      this.updateHeartIcons();
    } catch (e) {
      console.error("Failed to save wishlist", e);
    }
  },

  has: function (productId) {
    const list = this.getWishlist();
    return list.includes(productId);
  },

  add: function (productId) {
    let list = this.getWishlist();
    if (!list.includes(productId)) {
      list.push(productId);
      this.saveWishlist(list);
    }
  },

  remove: function (productId) {
    let list = this.getWishlist();
    list = list.filter(id => id !== productId);
    this.saveWishlist(list);
  },

  toggle: function (productId) {
    const product = ProductsCatalog.getById(productId);
    if (!product) return;

    if (this.has(productId)) {
      this.remove(productId);
      Toast.show(`Removed “${product.name}” from Wishlist`, 'info');
    } else {
      this.add(productId);
      Toast.show(`Saved “${product.name}” to Wishlist`, 'success', 'View Wishlist', () => {
        window.location.href = 'wishlist.html';
      });
    }
  },

  updateBadges: function () {
    const list = this.getWishlist();
    const badges = document.querySelectorAll('.wishlist-badge');
    badges.forEach(badge => {
      badge.textContent = list.length;
      if (list.length > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    });
  },

  updateHeartIcons: function () {
    const list = this.getWishlist();
    document.querySelectorAll('[data-wishlist-id]').forEach(btn => {
      const id = btn.getAttribute('data-wishlist-id');
      if (list.includes(id)) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-label', 'Remove from Wishlist');
      } else {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-label', 'Add to Wishlist');
      }
    });
  }
};

// =========================================================================
// ORDERS STORE (Customer Order History & Tracking)
// =========================================================================
const OrdersStore = {
  getOrders: function () {
    try {
      const stored = localStorage.getItem('palluvo_orders');
      if (stored) return JSON.parse(stored);

      // Seed initial realistic order for preview
      const initialOrders = [
        {
          id: "PAL-78241",
          date: "18 Sep 2026",
          status: "In Transit",
          statusCode: "dispatched",
          trackingNumber: "BD918239019IN",
          courier: "Bluedart Air Express",
          deliveryEstimate: "25 Sep 2026",
          items: [
            {
              name: "Noor Silk Saree",
              slug: "noor-silk-saree",
              color: "Emerald Green",
              blouseName: "Unstitched Matching Fabric",
              price: 4999,
              qty: 1,
              image: "images/hero_campaign.jpg"
            }
          ],
          subtotal: 4999,
          shipping: 0,
          discount: 500,
          total: 4499,
          shippingAddress: {
            fullName: "Ananya Deshmukh",
            address: "Flat 402, Lotus Grandeur, Road No. 36",
            city: "Hyderabad",
            state: "Telangana",
            pincode: "500033",
            phone: "+91 98765 43210"
          },
          paymentMethod: "UPI (Google Pay)"
        }
      ];
      localStorage.setItem('palluvo_orders', JSON.stringify(initialOrders));
      return initialOrders;
    } catch (e) {
      return [];
    }
  },

  createOrder: function (orderData) {
    const orders = this.getOrders();
    const orderId = `PAL-${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder = {
      id: orderId,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: "Confirmed",
      statusCode: "confirmed",
      trackingNumber: `BD${Math.floor(100000000 + Math.random() * 900000000)}IN`,
      courier: "Bluedart Air Express",
      deliveryEstimate: new Date(Date.now() + 4 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      ...orderData
    };

    orders.unshift(newOrder);
    localStorage.setItem('palluvo_orders', JSON.stringify(orders));

    // Clear cart once order is placed
    CartStore.saveCart([]);
    CartStore.setCoupon(null);

    return newOrder;
  }
};

// =========================================================================
// UI CONTROLLERS: CART DRAWER, SEARCH, QUICK VIEW, TOAST, MODALS
// =========================================================================

const CartDrawer = {
  open: function () {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartDrawerBackdrop');
    if (drawer && backdrop) {
      CartStore.renderDrawer();
      drawer.classList.add('is-open');
      backdrop.classList.add('is-open');
      document.body.classList.add('drawer-open');
    }
  },
  close: function () {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartDrawerBackdrop');
    if (drawer && backdrop) {
      drawer.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      document.body.classList.remove('drawer-open');
    }
  }
};

const SearchOverlay = {
  open: function () {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) {
      overlay.classList.add('is-open');
      document.body.classList.add('search-open');
      const input = document.getElementById('searchOverlayInput');
      if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 150);
        this.renderResults('');
      }
    }
  },
  close: function () {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) {
      overlay.classList.remove('is-open');
      document.body.classList.remove('search-open');
    }
  },
  renderResults: function (query) {
    const container = document.getElementById('searchResultsContainer');
    const suggestions = document.getElementById('searchSuggestedKeywords');
    if (!container) return;

    if (!query || query.trim() === '') {
      if (suggestions) suggestions.style.display = 'block';
      container.innerHTML = `
        <div class="search-empty-prompt">
          <p class="text-muted">Type to search for sarees, collections, fabrics or colors</p>
        </div>
      `;
      return;
    }

    if (suggestions) suggestions.style.display = 'none';
    const results = ProductsCatalog.search(query);

    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-no-results">
          <p>No sarees found matching “${query}”.</p>
          <span class="text-muted">Try searching for “Silk”, “Organza”, “Festive”, “Tissue”, or “Wedding”.</span>
        </div>
      `;
      return;
    }

    let html = `<div class="search-results-grid">`;
    results.forEach(product => {
      html += `
        <a href="product.html?id=${product.slug}" class="search-result-card" onclick="SearchOverlay.close()">
          <img src="${product.images[0]}" alt="${product.name}">
          <div class="search-result-info">
            <span class="badge-subtle">${product.fabric}</span>
            <h4 class="product-name">${product.name}</h4>
            <div class="product-price">${formatINR(product.price)}</div>
          </div>
        </a>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
  }
};

const QuickViewModal = {
  open: function (productId) {
    const product = ProductsCatalog.getById(productId);
    if (!product) return;

    const modal = document.getElementById('quickViewModal');
    const backdrop = document.getElementById('quickViewBackdrop');
    const container = document.getElementById('quickViewContent');
    if (!modal || !backdrop || !container) return;

    let swatchesHtml = '';
    product.swatches.forEach((swatch, idx) => {
      swatchesHtml += `
        <button class="swatch-btn ${idx === 0 ? 'is-selected' : ''}" 
                data-color="${swatch.name}" 
                title="${swatch.name}" 
                style="background-color: ${swatch.hex};"
                onclick="QuickViewModal.selectColor(this, '${swatch.name}')"></button>
      `;
    });

    let blouseHtml = '';
    product.blouseOptions.forEach((blouse, idx) => {
      blouseHtml += `
        <label class="blouse-radio-card ${idx === 0 ? 'is-selected' : ''}">
          <input type="radio" name="qv_blouse" value="${blouse.id}" ${idx === 0 ? 'checked' : ''} onchange="QuickViewModal.selectBlouse(this)">
          <div class="blouse-radio-info">
            <span class="blouse-radio-title">${blouse.name}</span>
            <span class="blouse-radio-price">${blouse.price > 0 ? '+ ' + formatINR(blouse.price) : 'Free'}</span>
          </div>
        </label>
      `;
    });

    container.innerHTML = `
      <div class="quickview-dialog">
        <button class="modal-close-btn" onclick="QuickViewModal.close()" aria-label="Close modal">&times;</button>
        <div class="quickview-grid">
          <div class="quickview-gallery">
            <div class="quickview-main-image-wrap">
              <img id="qvMainImage" src="${product.images[0]}" alt="${product.name}">
            </div>
            <div class="quickview-thumbnails">
              ${product.images.map((img, i) => `
                <button class="qv-thumb-btn ${i === 0 ? 'is-active' : ''}" onclick="QuickViewModal.switchImage('${img}', this)">
                  <img src="${img}" alt="${product.name} view ${i+1}">
                </button>
              `).join('')}
            </div>
          </div>
          <div class="quickview-details">
            <div class="product-badges">
              ${product.badge ? `<span class="badge badge-gold">${product.badge}</span>` : ''}
              <span class="badge badge-subtle">${product.fabric}</span>
            </div>
            <h2 class="qv-title">${product.name}</h2>
            <div class="qv-rating">
              <span class="stars">★★★★★</span>
              <span class="reviews-count">${product.rating} (${product.reviewsCount} reviews)</span>
            </div>
            <div class="qv-price-wrap">
              <span class="price-current">${formatINR(product.price)}</span>
              ${product.compareAtPrice ? `<span class="price-compare">${formatINR(product.compareAtPrice)}</span>` : ''}
              ${product.compareAtPrice ? `<span class="price-discount">${Math.round((1 - product.price / product.compareAtPrice) * 100)}% OFF</span>` : ''}
            </div>
            <p class="qv-description">${product.tagline}</p>
            
            <div class="qv-option-group">
              <label class="option-label">Color: <span id="qvSelectedColorText" class="font-medium">${product.color}</span></label>
              <div class="swatches-wrap">${swatchesHtml}</div>
            </div>

            <div class="qv-option-group">
              <div class="option-header-flex">
                <label class="option-label">Blouse Customization:</label>
                <button type="button" class="btn-text-link btn-xs" onclick="SizeGuideModal.open()">Size Guide</button>
              </div>
              <div class="blouse-options-grid">${blouseHtml}</div>
            </div>

            <div class="qv-actions-row">
              <div class="qty-stepper">
                <button class="qty-btn" onclick="QuickViewModal.stepQty(-1)">−</button>
                <span id="qvQty" class="qty-num">1</span>
                <button class="qty-btn" onclick="QuickViewModal.stepQty(1)">+</button>
              </div>
              <button class="btn btn-primary btn-flex" onclick="QuickViewModal.addToBag('${product.id}')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                ADD TO BAG
              </button>
              <button class="btn btn-icon btn-wishlist-toggle" data-wishlist-id="${product.id}" onclick="WishlistStore.toggle('${product.id}')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
            </div>

            <div class="qv-view-full">
              <a href="product.html?id=${product.slug}" class="btn-text-link">View Full Product Specifications & Care &rarr;</a>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.classList.add('modal-open');
    WishlistStore.updateHeartIcons();
  },

  close: function () {
    const modal = document.getElementById('quickViewModal');
    const backdrop = document.getElementById('quickViewBackdrop');
    if (modal && backdrop) {
      modal.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      document.body.classList.remove('modal-open');
    }
  },

  switchImage: function (src, btn) {
    const img = document.getElementById('qvMainImage');
    if (img) img.src = src;
    document.querySelectorAll('.qv-thumb-btn').forEach(b => b.classList.remove('is-active'));
    if (btn) btn.classList.add('is-active');
  },

  selectColor: function (btn, colorName) {
    document.querySelectorAll('.quickview-details .swatch-btn').forEach(b => b.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    const label = document.getElementById('qvSelectedColorText');
    if (label) label.textContent = colorName;
  },

  selectBlouse: function (radio) {
    document.querySelectorAll('.blouse-radio-card').forEach(card => card.classList.remove('is-selected'));
    radio.closest('.blouse-radio-card').classList.add('is-selected');
  },

  stepQty: function (delta) {
    const qtySpan = document.getElementById('qvQty');
    if (!qtySpan) return;
    let qty = parseInt(qtySpan.textContent, 10) || 1;
    qty = Math.max(1, qty + delta);
    qtySpan.textContent = qty;
  },

  addToBag: function (productId) {
    const qty = parseInt(document.getElementById('qvQty').textContent, 10) || 1;
    const colorLabel = document.getElementById('qvSelectedColorText');
    const selectedColor = colorLabel ? colorLabel.textContent : null;
    const selectedBlouseRadio = document.querySelector('input[name="qv_blouse"]:checked');
    const blouseId = selectedBlouseRadio ? selectedBlouseRadio.value : 'unstitched';

    CartStore.addItem(productId, qty, { color: selectedColor, blouseId: blouseId });
    this.close();
  }
};

const SizeGuideModal = {
  open: function () {
    const modal = document.getElementById('sizeGuideModal');
    const backdrop = document.getElementById('sizeGuideBackdrop');
    if (modal && backdrop) {
      modal.classList.add('is-open');
      backdrop.classList.add('is-open');
      document.body.classList.add('modal-open');
    }
  },
  close: function () {
    const modal = document.getElementById('sizeGuideModal');
    const backdrop = document.getElementById('sizeGuideBackdrop');
    if (modal && backdrop) {
      modal.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      document.body.classList.remove('modal-open');
    }
  }
};

// =========================================================================
// TOAST NOTIFICATIONS
// =========================================================================
const Toast = {
  show: function (message, type = 'info', actionText = null, onAction = null) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-pill toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${iconSvg}</span>
        <span class="toast-message">${message}</span>
      </div>
      ${actionText ? `<button class="toast-action-btn">${actionText}</button>` : ''}
      <button class="toast-close-btn">&times;</button>
    `;

    if (actionText && onAction) {
      toast.querySelector('.toast-action-btn').addEventListener('click', () => {
        onAction();
        removeToast();
      });
    }

    const removeToast = () => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 300);
    };

    toast.querySelector('.toast-close-btn').addEventListener('click', removeToast);

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(removeToast, 4200);
  }
};

// =========================================================================
// PRODUCT CARD GENERATOR COMPONENT (Used in grids, carousels, PLP)
// =========================================================================
function renderProductCard(product) {
  const isWishlisted = WishlistStore.has(product.id);
  const discountPercent = product.compareAtPrice ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;

  return `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-card-media">
        <a href="product.html?id=${product.slug}" class="product-card-img-link">
          <img src="${product.images[0]}" alt="${product.name}" class="product-card-img primary-img" loading="lazy">
          ${product.images[1] ? `<img src="${product.images[1]}" alt="${product.name} detail" class="product-card-img hover-img" loading="lazy">` : ''}
        </a>
        
        <div class="product-card-badges">
          ${product.badge ? `<span class="product-badge badge-gold">${product.badge}</span>` : ''}
          ${discountPercent > 0 ? `<span class="product-badge badge-sale">${discountPercent}% OFF</span>` : ''}
        </div>

        <button class="product-wishlist-btn ${isWishlisted ? 'is-active' : ''}" 
                data-wishlist-id="${product.id}"
                onclick="WishlistStore.toggle('${product.id}')"
                aria-label="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>

        <div class="product-card-quick-actions">
          <button class="btn-quick-view" onclick="QuickViewModal.open('${product.id}')">
            Quick View
          </button>
          <button class="btn-quick-add" onclick="CartStore.addItem('${product.id}', 1)">
            Quick Add
          </button>
        </div>
      </div>

      <div class="product-card-body">
        <div class="product-card-swatches">
          ${product.swatches.map(s => `
            <span class="swatch-mini" style="background-color: ${s.hex};" title="${s.name}"></span>
          `).join('')}
        </div>
        <span class="product-card-fabric">${product.fabric}</span>
        <h3 class="product-card-title">
          <a href="product.html?id=${product.slug}">${product.name}</a>
        </h3>
        <div class="product-card-price-row">
          <span class="current-price">${formatINR(product.price)}</span>
          ${product.compareAtPrice ? `<span class="compare-price">${formatINR(product.compareAtPrice)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

// =========================================================================
// GLOBAL INIT: RUNS ON EVERY PAGE
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Update Cart and Wishlist counters
  CartStore.updateBadges();
  WishlistStore.updateBadges();
  WishlistStore.updateHeartIcons();

  // 2. Sticky Header scroll listener
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 30) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }, { passive: true });
  }

  // 3. Mobile Hamburger Menu Toggle
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileMenuDrawer = document.getElementById('mobileMenuDrawer');
  const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
  const mobileMenuClose = document.getElementById('mobileMenuClose');

  if (mobileMenuToggle && mobileMenuDrawer) {
    mobileMenuToggle.addEventListener('click', () => {
      mobileMenuDrawer.classList.add('is-open');
      if (mobileMenuBackdrop) mobileMenuBackdrop.classList.add('is-open');
      document.body.classList.add('menu-open');
    });

    const closeMobileMenu = () => {
      mobileMenuDrawer.classList.remove('is-open');
      if (mobileMenuBackdrop) mobileMenuBackdrop.classList.remove('is-open');
      document.body.classList.remove('menu-open');
    };

    if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMobileMenu);
    if (mobileMenuBackdrop) mobileMenuBackdrop.addEventListener('click', closeMobileMenu);
  }

  // 4. Cart Drawer trigger hooks
  document.querySelectorAll('.js-cart-drawer-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      CartDrawer.open();
    });
  });

  const cartCloseBtn = document.getElementById('cartDrawerClose');
  const cartBackdrop = document.getElementById('cartDrawerBackdrop');
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', CartDrawer.close);
  if (cartBackdrop) cartBackdrop.addEventListener('click', CartDrawer.close);

  // 5. Search Overlay trigger hooks
  document.querySelectorAll('.js-search-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      SearchOverlay.open();
    });
  });

  const searchCloseBtn = document.getElementById('searchOverlayClose');
  const searchInput = document.getElementById('searchOverlayInput');
  if (searchCloseBtn) searchCloseBtn.addEventListener('click', SearchOverlay.close);

  if (searchInput) {
    let searchDebounce;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        SearchOverlay.renderResults(e.target.value);
      }, 200);
    });
  }

  // Search keyword tags quick click
  document.querySelectorAll('.search-keyword-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const keyword = tag.textContent.trim();
      if (searchInput) {
        searchInput.value = keyword;
        SearchOverlay.renderResults(keyword);
      }
    });
  });

  // 6. Modal Backdrops close
  const qvBackdrop = document.getElementById('quickViewBackdrop');
  if (qvBackdrop) qvBackdrop.addEventListener('click', QuickViewModal.close);

  const sgBackdrop = document.getElementById('sizeGuideBackdrop');
  const sgClose = document.getElementById('sizeGuideClose');
  if (sgBackdrop) sgBackdrop.addEventListener('click', SizeGuideModal.close);
  if (sgClose) sgClose.addEventListener('click', SizeGuideModal.close);

  // 7. Keyboard accessibility (Escape key closes open modals/drawers)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      CartDrawer.close();
      SearchOverlay.close();
      QuickViewModal.close();
      SizeGuideModal.close();
      if (mobileMenuDrawer && mobileMenuDrawer.classList.contains('is-open')) {
        mobileMenuDrawer.classList.remove('is-open');
        if (mobileMenuBackdrop) mobileMenuBackdrop.classList.remove('is-open');
        document.body.classList.remove('menu-open');
      }
    }
  });

  // 8. Newsletter form submission
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = newsletterForm.querySelector('input[type="email"]');
      if (emailInput && emailInput.value) {
        Toast.show("Welcome to PALLUVO. Your complimentary welcome code has been sent.", 'success');
        emailInput.value = '';
      }
    });
  }
});
