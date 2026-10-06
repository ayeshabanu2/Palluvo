/**
 * PALLUVO Luxury Saree Fashion House - TypeScript Type Definitions
 */

export interface BlouseOption {
  id: string;
  name: string;
  price: number;
}

export interface ColorSwatch {
  name: string;
  hex: string;
  inStock?: boolean;
  image?: string;
}

export interface HandloomRegion {
  name: string;
  state: string;
  weave: string;
  image: string;
}

export interface ProductSpecifications {
  fabric?: string;
  weave?: string;
  zari?: string;
  length?: string;
  width?: string;
  sareeLength?: string;
  blousePiece?: string;
  origin?: string;
  certification?: string;
  weight?: string;
  transparency?: string;
  fallPico?: string;
  care?: string;
  border?: string;
  pallu?: string;
  occasion?: string;
  [key: string]: any;
}

export interface SareeProduct {
  id: string;
  slug?: string;
  name: string;
  sareeType?: string;
  category?: string;
  fabric?: string;
  price: number;
  compareAtPrice?: number;
  discount?: string;
  badge?: string;
  rating?: number;
  reviewsCount?: number;
  color?: string;
  colorHex?: string;
  swatches?: ColorSwatch[];
  images?: string[];
  tagline?: string;
  description?: string;
  weave?: string;
  zari?: string;
  palluDetails?: string;
  origin?: string;
  artisanHours?: string;
  occasion?: string;
  pureSilkMark?: boolean;
  blouseOptions?: BlouseOption[];
  specifications?: ProductSpecifications;
  deliveryInfo?: string;
  [key: string]: any;
}

export interface TopModel {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  region: string;
  shortRegion: string;
  tag: string;
  oneLiner: string;
  subtitle: string;
  shortSubtitle: string;
  desc: string;
  image: string;
  filterType: string;
  artisanHours: string;
  shortArtisanHours: string;
  pureSilkMark: boolean;
}

export type SareeCategory = TopModel;

export interface FestiveSaree {
  name: string;
  region: string;
  image: string;
  desc: string;
}

export interface SareeOccasion {
  id: string;
  name: string;
  subtitle: string;
  sareeType: string;
  image: string;
  filterParam: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  sareeType?: string;
  qty: number;
  selectedColor?: string;
  blouseOptionId?: string;
  blouseOptionName?: string;
  blousePrice?: number;
}

export interface Coupon {
  code: string;
  discountPercent?: number;
  flatDiscount?: number;
  label: string;
}

export interface AddToCartOptions {
  selectedColor?: string;
  blouseOptionId?: string;
  blouseOptionName?: string;
  blousePrice?: number;
}

export interface CouponResult {
  success: boolean;
  message: string;
}

export interface StoreContextType {
  cart: CartItem[];
  wishlist: string[];
  coupon: Coupon | null;
  isCartOpen: boolean;
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>;
  quickViewProduct: SareeProduct | null;
  setQuickViewProduct: React.Dispatch<React.SetStateAction<SareeProduct | null>>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  addToCart: (productId: string, qty?: number, options?: AddToCartOptions) => void;
  updateCartQty: (cartItemId: string, newQty: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  applyCouponCode: (code: string) => CouponResult;
  removeCoupon: () => void;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  grandTotal: number;
  totalCartCount: number;
}

export interface ProductCardProps {
  product: SareeProduct;
  priority?: boolean;
}
