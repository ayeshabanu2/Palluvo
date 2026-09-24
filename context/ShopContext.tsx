'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SareeProduct, getProductBySlugOrId } from '@/data/products';

export interface CartItem {
  cartItemId: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  compareAtPrice?: number;
  color: string;
  colorHex: string;
  blouseName: string;
  blousePrice: number;
  blouseId: string;
  unitTotal: number;
  qty: number;
}

export interface Coupon {
  code: string;
  description: string;
  discountPercent?: number;
  discountFlat?: number;
  minSpend?: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

export interface Order {
  id: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  shippingDetails: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod: string;
  status: 'Confirmed' | 'Handloom QC' | 'Dispatched' | 'Delivered';
  trackingNumber: string;
}

interface ShopContextType {
  cart: CartItem[];
  addToCart: (product: SareeProduct, qty?: number, options?: { color?: string; blouseId?: string }) => void;
  updateCartQty: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  cartDiscount: number;
  cartShipping: number;
  cartTotal: number;
  coupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  freeShippingThreshold: number;
  freeShippingProgress: number;

  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;

  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;

  isMobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;

  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;

  quickViewProduct: SareeProduct | null;
  openQuickView: (product: SareeProduct) => void;
  closeQuickView: () => void;

  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'error', actionLabel?: string, onAction?: () => void) => void;
  removeToast: (id: string) => void;

  orders: Order[];
  placeOrder: (orderData: Omit<Order, 'id' | 'date' | 'status' | 'trackingNumber'>) => Order;
}

const VALID_COUPONS: Record<string, Coupon> = {
  FESTIVE25: { code: 'FESTIVE25', description: '25% Festive Discount on orders above ₹3,999', discountPercent: 0.25, minSpend: 3999 },
  SAREE10: { code: 'SAREE10', description: '10% Handloom Saree Discount', discountPercent: 0.10, minSpend: 0 },
  MAGIC500: { code: 'MAGIC500', description: '₹500 Off on orders above ₹4,999', discountFlat: 500, minSpend: 4999 },
  PALLUVO1000: { code: 'PALLUVO1000', description: '₹1,000 Luxury Tier Off above ₹7,999', discountFlat: 1000, minSpend: 7999 }
};

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<SareeProduct | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Load from localStorage safely on mount
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('palluvo_cart');
      if (storedCart) setCart(JSON.parse(storedCart));

      const storedWishlist = localStorage.getItem('palluvo_wishlist');
      if (storedWishlist) setWishlist(JSON.parse(storedWishlist));

      const storedCoupon = localStorage.getItem('palluvo_coupon');
      if (storedCoupon) setCoupon(JSON.parse(storedCoupon));

      const storedOrders = localStorage.getItem('palluvo_orders');
      if (storedOrders) setOrders(JSON.parse(storedOrders));
    } catch (e) {
      console.error('Failed to load local state', e);
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem('palluvo_cart', JSON.stringify(cart));
    } catch (e) {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('palluvo_wishlist', JSON.stringify(wishlist));
    } catch (e) {}
  }, [wishlist]);

  useEffect(() => {
    try {
      if (coupon) {
        localStorage.setItem('palluvo_coupon', JSON.stringify(coupon));
      } else {
        localStorage.removeItem('palluvo_coupon');
      }
    } catch (e) {}
  }, [coupon]);

  useEffect(() => {
    try {
      localStorage.setItem('palluvo_orders', JSON.stringify(orders));
    } catch (e) {}
  }, [orders]);

  const showToast = (
    message: string,
    type: 'success' | 'info' | 'error' = 'success',
    actionLabel?: string,
    onAction?: () => void
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, actionLabel, onAction }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addToCart = (
    product: SareeProduct,
    qty = 1,
    options: { color?: string; blouseId?: string } = {}
  ) => {
    const color = options.color || product.color;
    const blouseId = options.blouseId || 'unstitched';
    const blouseOption = product.blouseOptions?.find(b => b.id === blouseId) || {
      id: 'unstitched',
      name: 'Unstitched Matching Fabric (0.8m Included)',
      price: 0
    };

    const cartItemId = `${product.id}_${color.replace(/\s+/g, '-').toLowerCase()}_${blouseId}`;

    setCart(prev => {
      const idx = prev.findIndex(item => item.cartItemId === cartItemId);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + qty };
        return updated;
      }
      return [
        ...prev,
        {
          cartItemId,
          productId: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images[0],
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          color,
          colorHex: product.swatches.find(s => s.name === color)?.hex || product.colorHex,
          blouseName: blouseOption.name,
          blousePrice: blouseOption.price,
          blouseId,
          unitTotal: product.price + blouseOption.price,
          qty
        }
      ];
    });

    showToast(`Added “${product.name}” to your bag`, 'success', 'View Bag', () => {
      setIsCartDrawerOpen(true);
    });
    setIsCartDrawerOpen(true);
  };

  const updateCartQty = (cartItemId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
    showToast('Item removed from your bag', 'info');
  };

  const clearCart = () => {
    setCart([]);
    setCoupon(null);
  };

  const toggleWishlist = (productId: string) => {
    const product = getProductBySlugOrId(productId);
    const name = product ? product.name : 'Saree';
    setWishlist(prev => {
      if (prev.includes(productId)) {
        showToast(`Removed “${name}” from wishlist`, 'info');
        return prev.filter(id => id !== productId);
      } else {
        showToast(`Saved “${name}” to your wishlist`, 'success');
        return [...prev, productId];
      }
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const applyCoupon = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    const found = VALID_COUPONS[trimmed];
    if (!found) {
      return { success: false, message: 'Invalid promo code. Try FESTIVE25 or SAREE10' };
    }
    if (found.minSpend && cartSubtotal < found.minSpend) {
      return {
        success: false,
        message: `Code ${found.code} requires a minimum order value of ₹${found.minSpend.toLocaleString('en-IN')}`
      };
    }
    setCoupon(found);
    return { success: true, message: `Promo code ${found.code} applied successfully!` };
  };

  const removeCoupon = () => {
    setCoupon(null);
    showToast('Promo code removed', 'info');
  };

  const freeShippingThreshold = 2999;
  const standardShippingFee = 199;

  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.unitTotal * item.qty, 0);

  let cartDiscount = 0;
  if (coupon) {
    if (coupon.discountPercent) {
      cartDiscount = Math.round(cartSubtotal * coupon.discountPercent);
    } else if (coupon.discountFlat) {
      cartDiscount = Math.min(coupon.discountFlat, cartSubtotal);
    }
  }

  const cartShipping = cartSubtotal >= freeShippingThreshold || cartSubtotal === 0 ? 0 : standardShippingFee;
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount + cartShipping);
  const freeShippingProgress = Math.min(100, Math.round((cartSubtotal / freeShippingThreshold) * 100));

  const placeOrder = (orderData: Omit<Order, 'id' | 'date' | 'status' | 'trackingNumber'>): Order => {
    const orderId = 'PAL-' + Math.floor(100000 + Math.random() * 900000);
    const trackingNumber = 'BLUEDART-IN' + Math.floor(10000000 + Math.random() * 90000000);
    const newOrder: Order = {
      ...orderData,
      id: orderId,
      date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      status: 'Confirmed',
      trackingNumber
    };
    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  return (
    <ShopContext.Provider
      value={{
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartCount,
        cartSubtotal,
        cartDiscount,
        cartShipping,
        cartTotal,
        coupon,
        applyCoupon,
        removeCoupon,
        freeShippingThreshold,
        freeShippingProgress,

        wishlist,
        toggleWishlist,
        isInWishlist,
        wishlistCount: wishlist.length,

        isCartDrawerOpen,
        openCartDrawer: () => setIsCartDrawerOpen(true),
        closeCartDrawer: () => setIsCartDrawerOpen(false),

        isMobileNavOpen,
        openMobileNav: () => setIsMobileNavOpen(true),
        closeMobileNav: () => setIsMobileNavOpen(false),

        isSearchOpen,
        openSearch: () => setIsSearchOpen(true),
        closeSearch: () => setIsSearchOpen(false),

        quickViewProduct,
        openQuickView: (product: SareeProduct) => setQuickViewProduct(product),
        closeQuickView: () => setQuickViewProduct(null),

        toasts,
        showToast,
        removeToast,

        orders,
        placeOrder
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
