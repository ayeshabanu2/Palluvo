'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SAREE_PRODUCTS } from '@/data/products';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [coupon, setCoupon] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('palluvo_cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedWish = localStorage.getItem('palluvo_wishlist');
      if (savedWish) setWishlist(JSON.parse(savedWish));

      const savedCoupon = localStorage.getItem('palluvo_coupon');
      if (savedCoupon) setCoupon(JSON.parse(savedCoupon));
    } catch (e) {
      console.error('Failed to load local storage state', e);
    }
  }, []);

  // Save changes
  const saveCartToStorage = (updatedCart) => {
    setCart(updatedCart);
    try {
      localStorage.setItem('palluvo_cart', JSON.stringify(updatedCart));
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  const addToCart = (productId, qty = 1, options = {}) => {
    const product = SAREE_PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    const existingIndex = cart.findIndex(
      (item) =>
        item.productId === productId &&
        (options.blouseOptionId ? item.blouseOptionId === options.blouseOptionId : true) &&
        (options.selectedColor ? item.selectedColor === options.selectedColor : true)
    );

    let updatedCart = [...cart];
    if (existingIndex > -1) {
      updatedCart[existingIndex].qty += qty;
    } else {
      updatedCart.push({
        id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images ? product.images[0] : '',
        sareeType: product.sareeType,
        qty: qty,
        selectedColor: options.selectedColor || product.color,
        blouseOptionId: options.blouseOptionId || 'unstitched',
        blouseOptionName: options.blouseOptionName || 'Unstitched Matching Fabric Included',
        blousePrice: options.blousePrice || 0
      });
    }

    saveCartToStorage(updatedCart);
    showToast(`Added "${product.name}" to your shopping bag.`);
  };

  const updateCartQty = (cartItemId, newQty) => {
    let updated;
    if (newQty <= 0) {
      updated = cart.filter((item) => item.id !== cartItemId);
    } else {
      updated = cart.map((item) => (item.id === cartItemId ? { ...item, qty: newQty } : item));
    }
    saveCartToStorage(updated);
  };

  const removeFromCart = (cartItemId) => {
    const updated = cart.filter((item) => item.id !== cartItemId);
    saveCartToStorage(updated);
  };

  const clearCart = () => {
    saveCartToStorage([]);
    setCoupon(null);
    try {
      localStorage.removeItem('palluvo_coupon');
    } catch (e) {}
  };

  const toggleWishlist = (productId) => {
    let updated;
    const exists = wishlist.includes(productId);
    if (exists) {
      updated = wishlist.filter((id) => id !== productId);
      showToast('Item removed from wishlist');
    } else {
      updated = [...wishlist, productId];
      showToast('Item added to your wishlist ❤️');
    }
    setWishlist(updated);
    try {
      localStorage.setItem('palluvo_wishlist', JSON.stringify(updated));
    } catch (e) {}
  };

  const applyCouponCode = (code) => {
    const clean = (code || '').trim().toUpperCase();
    if (clean === 'PALLUVO10' || clean === 'MAGIC10') {
      const c = { code: clean, discountPercent: 10, label: '10% Festive Privilege' };
      setCoupon(c);
      localStorage.setItem('palluvo_coupon', JSON.stringify(c));
      showToast('Coupon applied: 10% Off!');
      return { success: true, message: '10% discount applied!' };
    } else if (clean === 'FIRSTDRAPE') {
      const c = { code: clean, flatDiscount: 500, label: '₹500 First Order Welcome' };
      setCoupon(c);
      localStorage.setItem('palluvo_coupon', JSON.stringify(c));
      showToast('Coupon applied: ₹500 Off!');
      return { success: true, message: '₹500 welcome discount applied!' };
    }
    return { success: false, message: 'Invalid or expired promo code.' };
  };

  const removeCoupon = () => {
    setCoupon(null);
    localStorage.removeItem('palluvo_coupon');
    showToast('Promo code removed');
  };

  // Cart financial calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.price + (item.blousePrice || 0)) * item.qty, 0);
  const FREE_SHIPPING_THRESHOLD = 999;
  const shippingFee = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 199;

  let discountAmount = 0;
  if (coupon) {
    if (coupon.discountPercent) {
      discountAmount = Math.round((subtotal * coupon.discountPercent) / 100);
    } else if (coupon.flatDiscount) {
      discountAmount = Math.min(coupon.flatDiscount, subtotal);
    }
  }

  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);
  const totalCartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  return (
    <StoreContext.Provider
      value={{
        cart,
        wishlist,
        coupon,
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
        subtotal,
        shippingFee,
        discountAmount,
        grandTotal,
        totalCartCount
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
