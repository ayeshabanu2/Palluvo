'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SAREE_PRODUCTS } from '@/data/products';
import { 
  StoreContextType, 
  CartItem, 
  Coupon, 
  AddToCartOptions, 
  SareeProduct, 
  CouponResult,
  PlacedOrder,
  CreateOrderInput
} from '@/types';

const INITIAL_ORDERS: PlacedOrder[] = [
  {
    id: 'PLV-849201',
    orderNumber: 'PLV-849201',
    date: '18 Sep 2026',
    status: 'Delivered',
    items: [
      {
        id: 'init_item_1',
        productId: 'saree-001',
        name: 'Royal Banarasi Silk Saree',
        price: 8199,
        image: 'images/hero_saree_art.jpg',
        sareeType: 'Banarasi',
        qty: 1,
        selectedColor: 'Deep Crimson',
        blouseOptionName: 'Custom Tailored Blouse',
        blousePrice: 1200
      }
    ],
    subtotal: 8199,
    discountAmount: 0,
    shippingFee: 0,
    grandTotal: 8199,
    paymentMethod: 'card',
    customer: {
      firstName: 'Ananya',
      lastName: 'Sharma',
      email: 'ananya.sharma@example.com',
      phone: '+91 98765 43210',
      address: 'Apartment 402, Royal Palms, 12th Main Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038'
    }
  },
  {
    id: 'PLV-712049',
    orderNumber: 'PLV-712049',
    date: '02 Aug 2026',
    status: 'Delivered',
    items: [
      {
        id: 'init_item_2',
        productId: 'saree-004',
        name: 'Elegant Organza Saree',
        price: 3899,
        image: 'images/categories/organza.jpg',
        sareeType: 'Organza',
        qty: 1,
        selectedColor: 'Sage Green',
        blouseOptionName: 'Unstitched Blouse',
        blousePrice: 0
      }
    ],
    subtotal: 3899,
    discountAmount: 0,
    shippingFee: 0,
    grandTotal: 3899,
    paymentMethod: 'upi',
    customer: {
      firstName: 'Ananya',
      lastName: 'Sharma',
      email: 'ananya.sharma@example.com',
      phone: '+91 98765 43210',
      address: 'Apartment 402, Royal Palms, 12th Main Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038'
    }
  }
];

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [orders, setOrders] = useState<PlacedOrder[]>(INITIAL_ORDERS);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<SareeProduct | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('palluvo_cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedWish = localStorage.getItem('palluvo_wishlist');
      if (savedWish) setWishlist(JSON.parse(savedWish));

      const savedCoupon = localStorage.getItem('palluvo_coupon');
      if (savedCoupon) setCoupon(JSON.parse(savedCoupon));

      const savedOrders = localStorage.getItem('palluvo_orders');
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOrders(parsed);
          }
        } catch (err) {
          console.error(err);
        }
      }
    } catch (e) {
      console.error('Failed to load local storage state', e);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  }, []);

  const addToCart = useCallback((productId: string, qty: number = 1, options: AddToCartOptions = {}) => {
    const product = SAREE_PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) =>
          item.productId === productId &&
          (options.blouseOptionId ? item.blouseOptionId === options.blouseOptionId : true) &&
          (options.selectedColor ? item.selectedColor === options.selectedColor : true)
      );

      let updatedCart = [...prevCart];
      if (existingIndex > -1) {
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          qty: updatedCart[existingIndex].qty + qty
        };
      } else {
        updatedCart.push({
          id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.images && product.images[0] ? product.images[0] : '',
          sareeType: product.sareeType,
          qty: qty,
          selectedColor: options.selectedColor || product.color,
          blouseOptionId: options.blouseOptionId || 'unstitched',
          blouseOptionName: options.blouseOptionName || 'Unstitched Matching Fabric Included',
          blousePrice: options.blousePrice || 0
        });
      }

      try {
        localStorage.setItem('palluvo_cart', JSON.stringify(updatedCart));
      } catch (e) {
        console.error(e);
      }
      return updatedCart;
    });

    showToast(`Added "${product.name}" to your shopping bag.`);
  }, [showToast]);

  const updateCartQty = useCallback((cartItemId: string, newQty: number) => {
    setCart((prevCart) => {
      let updated: CartItem[];
      if (newQty <= 0) {
        updated = prevCart.filter((item) => item.id !== cartItemId);
      } else {
        updated = prevCart.map((item) => (item.id === cartItemId ? { ...item, qty: newQty } : item));
      }
      try {
        localStorage.setItem('palluvo_cart', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    setCart((prevCart) => {
      const updated = prevCart.filter((item) => item.id !== cartItemId);
      try {
        localStorage.setItem('palluvo_cart', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCoupon(null);
    try {
      localStorage.removeItem('palluvo_cart');
      localStorage.removeItem('palluvo_coupon');
    } catch (e) {}
  }, []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prevWishlist) => {
      let updated: string[];
      const exists = prevWishlist.includes(productId);
      if (exists) {
        updated = prevWishlist.filter((id) => id !== productId);
        showToast('Item removed from wishlist');
      } else {
        updated = [...prevWishlist, productId];
        showToast('Item added to your wishlist ❤️');
      }
      try {
        localStorage.setItem('palluvo_wishlist', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, [showToast]);

  const applyCouponCode = useCallback((code: string): CouponResult => {
    const clean = (code || '').trim().toUpperCase();
    if (clean === 'PALLUVO10' || clean === 'MAGIC10') {
      const c: Coupon = { code: clean, discountPercent: 10, label: '10% Festive Privilege' };
      setCoupon(c);
      try {
        localStorage.setItem('palluvo_coupon', JSON.stringify(c));
      } catch (e) {}
      showToast('Coupon applied: 10% Off!');
      return { success: true, message: '10% discount applied!' };
    } else if (clean === 'FIRSTDRAPE') {
      const c: Coupon = { code: clean, flatDiscount: 500, label: '₹500 First Order Welcome' };
      setCoupon(c);
      try {
        localStorage.setItem('palluvo_coupon', JSON.stringify(c));
      } catch (e) {}
      showToast('Coupon applied: ₹500 Off!');
      return { success: true, message: '₹500 welcome discount applied!' };
    }
    return { success: false, message: 'Invalid or expired promo code.' };
  }, [showToast]);

  const removeCoupon = useCallback(() => {
    setCoupon(null);
    try {
      localStorage.removeItem('palluvo_coupon');
    } catch (e) {}
    showToast('Promo code removed');
  }, [showToast]);

  const recordOrder = useCallback((orderInput: CreateOrderInput): PlacedOrder => {
    const orderNumber = orderInput.orderNumber || 'PLV-' + Math.floor(100000 + Math.random() * 900000);
    const newOrder: PlacedOrder = {
      ...orderInput,
      id: orderNumber,
      orderNumber,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Confirmed'
    };

    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      try {
        localStorage.setItem('palluvo_orders', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save order to localStorage', e);
      }
      return updated;
    });

    return newOrder;
  }, []);

  // Cart financial calculations (memoized)
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price + (item.blousePrice || 0)) * item.qty, 0);
  }, [cart]);

  const FREE_SHIPPING_THRESHOLD = 999;
  const shippingFee = useMemo(() => {
    return subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 199;
  }, [subtotal]);

  const discountAmount = useMemo(() => {
    if (!coupon) return 0;
    if (coupon.discountPercent) {
      return Math.round((subtotal * coupon.discountPercent) / 100);
    } else if (coupon.flatDiscount) {
      return Math.min(coupon.flatDiscount, subtotal);
    }
    return 0;
  }, [coupon, subtotal]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + shippingFee);
  }, [subtotal, discountAmount, shippingFee]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, i) => sum + i.qty, 0);
  }, [cart]);

  const contextValue = useMemo<StoreContextType>(() => ({
    cart,
    wishlist,
    coupon,
    orders,
    isCartOpen,
    setIsCartOpen,
    quickViewProduct,
    setQuickViewProduct,
    toastMessage,
    showToast,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    toggleWishlist,
    applyCouponCode,
    removeCoupon,
    recordOrder,
    subtotal,
    shippingFee,
    discountAmount,
    grandTotal,
    totalCartCount
  }), [
    cart,
    wishlist,
    coupon,
    orders,
    isCartOpen,
    quickViewProduct,
    toastMessage,
    showToast,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    toggleWishlist,
    applyCouponCode,
    removeCoupon,
    recordOrder,
    subtotal,
    shippingFee,
    discountAmount,
    grandTotal,
    totalCartCount
  ]);

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
