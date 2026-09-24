export interface Swatch {
  name: string;
  hex: string;
  inStock: boolean;
}

export interface BlouseOption {
  id: string;
  name: string;
  price: number;
}

export interface SareeSpecifications {
  length: string;
  width: string;
  blouseLength: string;
  weave: string;
  origin: string;
  weight: string;
  zariType: string;
  transparency: string;
  fallPico: string;
  care: string;
}

export interface SareeProduct {
  id: string;
  slug: string;
  name: string;
  sareeType: string;
  tagline: string;
  price: number;
  compareAtPrice: number;
  discount: string;
  badge?: string;
  category: string;
  fabric: string;
  color: string;
  colorHex: string;
  swatches: Swatch[];
  blouseOptions: BlouseOption[];
  occasion: string;
  rating: number;
  reviewsCount: number;
  stock: number;
  images: string[];
  description: string;
  specifications: SareeSpecifications;
  deliveryInfo: string;
}

export interface SareeCategory {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  region: string;
  tag: string;
  oneLiner: string;
  subtitle: string;
  desc: string;
  image: string;
  filterType: string;
  artisanHours: string;
  pureSilkMark: boolean;
}

export interface SareeOccasion {
  id: string;
  name: string;
  subtitle: string;
  sareeType: string;
  image: string;
  filterParam: string;
}

export interface HandloomRegion {
  name: string;
  state: string;
  weave: string;
  image: string;
}

export interface FestiveSaree {
  name: string;
  region: string;
  image: string;
  desc: string;
}

export const DEFAULT_BLOUSE_OPTIONS: BlouseOption[] = [
  { id: "unstitched", name: "Unstitched Matching Fabric (0.8m Included)", price: 0 },
  { id: "tailored-classic", name: "Custom Tailored - Classic Elbow Sleeve & U-Neck", price: 1200 },
  { id: "tailored-sleeveless", name: "Custom Tailored - Deep Sweetheart Sleeveless", price: 1200 },
  { id: "ready-padded", name: "Ready-to-Wear Premium Padded Corset Blouse", price: 1800 }
];

export const PALLUVO_TOP_MODELS: SareeCategory[] = [
  {
    id: "banarasi",
    slug: "banarasi",
    name: "Banarasi",
    shortName: "Katan Banarasi",
    region: "Varanasi, Uttar Pradesh",
    tag: "Kadhwa Brocade",
    oneLiner: "Timeless zari woven in Varanasi",
    subtitle: "Pure Katan Silk with Real Zari Jaal",
    desc: "Masterfully handwoven in Varanasi using unhurried Kadhwa techniques, featuring intricate floral jaals and tested gold zari.",
    image: "/images/categories/banarasi.jpg",
    filterType: "Banarasi",
    artisanHours: "210+ Weaving Hours",
    pureSilkMark: true
  },
  {
    id: "kanjivaram",
    slug: "kanjivaram",
    name: "Kanjivaram",
    shortName: "Kanjivaram Silk",
    region: "Kanchipuram, Tamil Nadu",
    tag: "Temple Zari",
    oneLiner: "Rich silk and heritage temple borders",
    subtitle: "Pure Mulberry Silk & Korvai Gold Temple Zari",
    desc: "Heavy three-ply twisted silk yarns with contrast interlocking Korvai temple borders, radiating royal heirloom majesty.",
    image: "/images/categories/kanjivaram.jpg",
    filterType: "Kanjivaram",
    artisanHours: "180+ Weaving Hours",
    pureSilkMark: true
  },
  {
    id: "pochampally",
    slug: "pochampally",
    name: "Pochampally",
    shortName: "Double Ikat",
    region: "Bhoodan Pochampally, Telangana",
    tag: "Geometric Ikat",
    oneLiner: "Iconic geometric Ikat from Telangana",
    subtitle: "Pure Handloom Silk Double Ikat Weave",
    desc: "Iconic geometric precision handwoven using tie-dye resist techniques on pure natural silk with vibrant heritage borders.",
    image: "/images/categories/pochampally.jpg",
    filterType: "Pochampally",
    artisanHours: "140+ Weaving Hours",
    pureSilkMark: true
  },
  {
    id: "paithani",
    slug: "paithani",
    name: "Paithani",
    shortName: "Pure Paithani",
    region: "Paithan & Yeola, Maharashtra",
    tag: "Peacock Pallu",
    oneLiner: "Handwoven silk with signature motifs",
    subtitle: "Kaleidoscopic Pure Silk with Zari Borders",
    desc: "Celebrated queen of Maharashtra silks, crowned with oblique square borders and a kaleidoscopic hand-woven peacock pallu.",
    image: "/images/categories/paithani.jpg",
    filterType: "Paithani",
    artisanHours: "160+ Weaving Hours",
    pureSilkMark: true
  },
  {
    id: "chanderi",
    slug: "chanderi",
    name: "Chanderi",
    shortName: "Chanderi Tissue",
    region: "Chanderi, Madhya Pradesh",
    tag: "Gossamer Handloom",
    oneLiner: "Gossamer handloom with delicate golden bootis",
    subtitle: "Silk-Cotton Tissue with Gold Bootis",
    desc: "A gossamer, featherlight drape woven from pure silk warp and fine cotton weft, shimmering with traditional golden bootis.",
    image: "/images/categories/chanderi.jpg",
    filterType: "Chanderi",
    artisanHours: "95+ Weaving Hours",
    pureSilkMark: true
  },
  {
    id: "organza",
    slug: "organza",
    name: "Organza",
    shortName: "Embroidered Organza",
    region: "PALLUVO Contemporary Atelier",
    tag: "Couture Sheer",
    oneLiner: "Crisp sheer luxury with hand-embroidered zardozi",
    subtitle: "Scalloped Hand-Embroidered Zardozi Silk",
    desc: "Crisp, sheer luxury silk detailed with delicate scalloped borders and hand-applied zardozi floral motifs for festive soirées.",
    image: "/images/categories/organza.jpg",
    filterType: "Organza",
    artisanHours: "75+ Hand-Embroidery Hours",
    pureSilkMark: true
  },
  {
    id: "ready-to-wear",
    slug: "ready-to-wear",
    name: "Ready-to-Wear",
    shortName: "1-Minute Drape",
    region: "PALLUVO Signature Studio",
    tag: "Effortless Glamour",
    oneLiner: "Pre-pleated 60-second couture drape",
    subtitle: "Pre-Pleated Tailored Pure Silk Drape",
    desc: "Expertly tailored with pre-stitched structured pleats and flowing pallu. Slip into runway-ready silk luxury in 60 seconds.",
    image: "/images/categories/ready-to-wear.jpg",
    filterType: "Ready-to-Wear",
    artisanHours: "Boutique Tailored",
    pureSilkMark: true
  },
  {
    id: "mysore-silk",
    slug: "mysore-silk",
    name: "Mysore Silk",
    shortName: "Royal Crepe",
    region: "Mysuru, Karnataka",
    tag: "Certified Gold Zari",
    oneLiner: "Royal crepe silk with certified gold zari",
    subtitle: "Pure Crepe Silk with 100% Tested Gold Zari",
    desc: "Buttery soft crepe drape crafted from 100% natural silk threads with certified 24-karat tested gold zari edging.",
    image: "/images/categories/mysore-silk.jpg",
    filterType: "Mysore Silk",
    artisanHours: "110+ Weaving Hours",
    pureSilkMark: true
  }
];

export const FESTIVE_SAREES: FestiveSaree[] = [
  { name: "Bandhani Silk", region: "Gujarat", image: "/images/categories/bandhani.jpg", desc: "Auspicious red & gold resist tie-dye dots hand-plucked on pure silk." },
  { name: "Patola Double Ikat", region: "Patan, Gujarat", image: "/images/categories/patola.jpg", desc: "Rare mathematical geometric precision double ikat handloom." },
  { name: "Imperial Paithani", region: "Maharashtra", image: "/images/categories/paithani.jpg", desc: "Kaleidoscopic Mor Bangdi peacock pallu with radiant gold tissue." },
  { name: "Royal Banarasi", region: "Varanasi, UP", image: "/images/categories/banarasi.jpg", desc: "Opulent real gold zari jaal on rich scarlet and crimson katan silk." },
  { name: "Temple Kanjivaram", region: "Tamil Nadu", image: "/images/categories/kanjivaram.jpg", desc: "Three-ply mulberry silk with auspicious gold temple border motifs." },
  { name: "Pochampally Ikat", region: "Telangana", image: "/images/categories/pochampally.jpg", desc: "Dynamic double-ikat silk weave crafted for Garba celebrations and aartis." }
];

export const SAREE_OCCASIONS: SareeOccasion[] = [
  {
    id: "wedding",
    name: "Wedding",
    subtitle: "Heirloom Silks & Zari Grandeur",
    sareeType: "Pure Kanjivaram & Banarasi Silk",
    image: "/images/occasions/wedding.jpg",
    filterParam: "Wedding"
  },
  {
    id: "bridal",
    name: "Bridal",
    subtitle: "The Sacred Red & Gold Drape",
    sareeType: "Bridal Crimson Zari Brocade",
    image: "/images/occasions/bridal.jpg",
    filterParam: "Bridal"
  },
  {
    id: "festive",
    name: "Festive",
    subtitle: "Vibrant Navratri & Diwali Celebrations",
    sareeType: "Bandhani, Patola & Paithani",
    image: "/images/occasions/festive.jpg",
    filterParam: "Festive"
  },
  {
    id: "party-wear",
    name: "Party Wear",
    subtitle: "Cocktail Drapes & Evening Sheers",
    sareeType: "Organza, Shimmer Georgette & Crepe",
    image: "/images/occasions/party-wear.jpg",
    filterParam: "Party Wear"
  },
  {
    id: "office-wear",
    name: "Office Wear",
    subtitle: "Crisp, Dignified Everyday Elegance",
    sareeType: "Linen, Chanderi & Mercerized Cotton",
    image: "/images/occasions/office-wear.jpg",
    filterParam: "Office Wear"
  },
  {
    id: "casual",
    name: "Casual",
    subtitle: "Effortless Featherlight Comfort",
    sareeType: "Mulmul Cotton & Pure Chiffon",
    image: "/images/occasions/casual.jpg",
    filterParam: "Casual"
  },
  {
    id: "traditional",
    name: "Traditional",
    subtitle: "Sacred Pujas & Regional Rituals",
    sareeType: "Handloom Uppada, Gadwal & Ilkal",
    image: "/images/occasions/traditional.jpg",
    filterParam: "Traditional"
  },
  {
    id: "reception",
    name: "Reception",
    subtitle: "Modern Silhouettes & Sleek Satin Drapes",
    sareeType: "Pre-Pleated Tissue & Metallic Silk",
    image: "/images/occasions/reception.jpg",
    filterParam: "Reception"
  }
];

export const SAREE_PRODUCTS: SareeProduct[] = [
  {
    id: "saree-001",
    slug: "royal-banarasi-silk-saree",
    name: "Royal Banarasi Silk Saree",
    sareeType: "Banarasi",
    tagline: "Pure Katan Silk with Antique Gold Zari Floral Jaal",
    price: 6999,
    compareAtPrice: 9499,
    discount: "26% OFF",
    badge: "Bestseller",
    category: "Banarasi",
    fabric: "Pure Katan Silk",
    color: "Deep Crimson",
    colorHex: "#8B1E2B",
    swatches: [
      { name: "Deep Crimson", hex: "#8B1E2B", inStock: true },
      { name: "Emerald Green", hex: "#1C3B2E", inStock: true },
      { name: "Royal Purple", hex: "#3F1B42", inStock: true }
    ],
    blouseOptions: DEFAULT_BLOUSE_OPTIONS,
    occasion: "Wedding",
    rating: 4.9,
    reviewsCount: 38,
    stock: 12,
    images: [
      "/images/hero_saree_art.jpg",
      "/images/categories/banarasi.jpg",
      "/images/coll_silk.jpg",
      "/images/craftsmanship.jpg"
    ],
    description: "An authentic Varanasi heirloom, handwoven from 100% pure katan silk. Embellished with classic kadhwa floral jaal and a dense antique gold zari pallu, this saree embodies the supreme grace of Indian heritage brides.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter matching pure silk fabric included",
      weave: "Traditional Kadhwa Handloom Weave",
      origin: "Varanasi, Uttar Pradesh",
      weight: "680 grams",
      zariType: "Tested Antique Gold Zari",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Strictly dry clean only. Wrap in breathable muslin cloth."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-002",
    slug: "classic-kanjivaram-silk-saree",
    name: "Classic Kanjivaram Silk Saree",
    sareeType: "Kanjivaram",
    tagline: "Pure Mulberry Silk with Contrast Temple Korvai Border",
    price: 7499,
    compareAtPrice: 10299,
    discount: "27% OFF",
    badge: "Trending",
    category: "Kanjivaram",
    fabric: "Pure Mulberry Silk",
    color: "Emerald Green",
    colorHex: "#1C3B2E",
    swatches: [
      { name: "Emerald Green", hex: "#1C3B2E", inStock: true },
      { name: "Ruby Maroon", hex: "#7A1C25", inStock: true },
      { name: "Mustard Gold", hex: "#C59B27", inStock: true }
    ],
    blouseOptions: DEFAULT_BLOUSE_OPTIONS,
    occasion: "Wedding",
    rating: 4.9,
    reviewsCount: 42,
    stock: 9,
    images: [
      "/images/saree_noor_1.jpg",
      "/images/saree_noor_2.jpg",
      "/images/categories/kanjivaram.jpg",
      "/images/craftsmanship.jpg"
    ],
    description: "Mastercrafted in Kanchipuram with three-ply heavy mulberry silk yarn. Features authentic contrast Korvai temple borders, rich peacock booties, and certified pure zari workmanship.",
    specifications: {
      length: "5.5 meters",
      width: "46 inches",
      blouseLength: "0.8 meter contrast silk blouse piece included",
      weave: "Interlocking Korvai Handloom Weave",
      origin: "Kanchipuram, Tamil Nadu",
      weight: "720 grams",
      zariType: "Certified Pure Matte Gold Zari",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean only. Store flat in cotton saree bag."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-003",
    slug: "delicate-organza-silk-saree",
    name: "Delicate Organza Silk Saree",
    sareeType: "Organza",
    tagline: "Gossamer Sheer Silk with Scalloped Zardozi Border",
    price: 4999,
    compareAtPrice: 6999,
    discount: "28% OFF",
    badge: "Trending",
    category: "Organza",
    fabric: "Pure Organza Silk",
    color: "Blush Pink",
    colorHex: "#E8B4B8",
    swatches: [
      { name: "Blush Pink", hex: "#E8B4B8", inStock: true },
      { name: "Sage Mist", hex: "#B2C2B0", inStock: true },
      { name: "Powder Blue", hex: "#A8C3D8", inStock: true }
    ],
    blouseOptions: DEFAULT_BLOUSE_OPTIONS,
    occasion: "Party Wear",
    rating: 4.8,
    reviewsCount: 29,
    stock: 14,
    images: [
      "/images/categories/organza.jpg",
      "/images/saree_aira_1.jpg",
      "/images/saree_aira_2.jpg",
      "/images/coll_contemp.jpg"
    ],
    description: "Whisper-light, sheer luxury. Crafted from pure organza silk with hand-cut scalloped borders embroidered with micro pearl beads and zardozi threadwork. Ideal for high-tea parties and destination receptions.",
    specifications: {
      length: "5.5 meters",
      width: "44 inches",
      blouseLength: "0.8 meter matching heavy embroidered organza fabric",
      weave: "Fine Plain Weave Organza",
      origin: "Varanasi Atelier",
      weight: "380 grams",
      zariType: "Fine Rose Gold & Silver Zari",
      transparency: "Semi-Transparent",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean only. Keep away from direct sunlight."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-004",
    slug: "whispering-chanderi-silk-cotton-saree",
    name: "Whispering Chanderi Saree",
    sareeType: "Chanderi",
    tagline: "Featherlight Silk-Cotton with Ashrafi Gold Bootis",
    price: 3499,
    compareAtPrice: 4799,
    discount: "27% OFF",
    badge: "New Arrival",
    category: "Chanderi",
    fabric: "Silk-Cotton Tissue",
    color: "Ivory Gold",
    colorHex: "#F2E8CF",
    swatches: [
      { name: "Ivory Gold", hex: "#F2E8CF", inStock: true },
      { name: "Peacock Blue", hex: "#1B4965", inStock: true },
      { name: "Sunset Ochre", hex: "#D4A373", inStock: true }
    ],
    blouseOptions: DEFAULT_BLOUSE_OPTIONS,
    occasion: "Festive",
    rating: 4.7,
    reviewsCount: 19,
    stock: 18,
    images: [
      "/images/categories/chanderi.jpg",
      "/images/saree_zoya_1.jpg",
      "/images/saree_zoya_2.jpg",
      "/images/coll_everyday.jpg"
    ],
    description: "An authentic Chanderi handloom drape combining gossamer cotton weft with pure mulberry silk warp. Dotted with hand-interlocked Ashrafi gold coin bootis that catch the ambient festival lamps.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter running silk-cotton fabric",
      weave: "Traditional Pit Loom Weave",
      origin: "Chanderi, Madhya Pradesh",
      weight: "420 grams",
      zariType: "Tested Gold Zari",
      transparency: "Semi-Sheer",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean recommended. Gentle handwash in cold water after first dry clean."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-005",
    slug: "imperial-paithani-silk-saree",
    name: "Imperial Paithani Silk Saree",
    sareeType: "Paithani",
    tagline: "Rich Silk with Traditional Mor Bangdi Peacock Tapestry",
    price: 8999,
    compareAtPrice: 12499,
    discount: "28% OFF",
    badge: "Heirloom",
    category: "Paithani",
    fabric: "Pure Mulberry Silk",
    color: "Royal Purple",
    colorHex: "#3F1B42",
    swatches: [
      { name: "Royal Purple", hex: "#3F1B42", inStock: true },
      { name: "Rani Pink", hex: "#B8246E", inStock: true },
      { name: "Peacock Green", hex: "#134E4A", inStock: true }
    ],
    blouseOptions: DEFAULT_BLOUSE_OPTIONS,
    occasion: "Bridal",
    rating: 5.0,
    reviewsCount: 26,
    stock: 6,
    images: [
      "/images/categories/paithani.jpg",
      "/images/saree_sitara_1.jpg",
      "/images/craftsmanship.jpg",
      "/images/coll_wedding.jpg"
    ],
    description: "The crown jewel of Maharashtra drapes. Handcrafted over 160 hours using oblique interlocking tapestry weaving. The pallu features the kaleidoscope of the auspicious Mor Bangdi (dancing peacocks in bangles) against solid gold tissue.",
    specifications: {
      length: "5.5 meters",
      width: "46 inches",
      blouseLength: "0.8 meter matching pure silk blouse piece with zari border",
      weave: "Tapestry Weaving on Handloom",
      origin: "Paithan & Yeola, Maharashtra",
      weight: "760 grams",
      zariType: "Pure Tested Gold Zari",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Strictly dry clean only. Wrap in unbleached cotton muslin."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-006",
    slug: "pochampally-ikat-silk-saree",
    name: "Pochampally Ikat Silk Saree",
    sareeType: "Pochampally",
    tagline: "Geometric Double Ikat with Solid Contrast Temple Border",
    price: 5499,
    compareAtPrice: 7299,
    discount: "25% OFF",
    badge: "Bestseller",
    category: "Pochampally",
    fabric: "Handloom Pure Silk",
    color: "Sapphire Teal",
    colorHex: "#0D5C75",
    swatches: [
      { name: "Sapphire Teal", hex: "#0D5C75", inStock: true },
      { name: "Maroon Crimson", hex: "#6B1D28", inStock: true },
      { name: "Mustard Black", hex: "#2B2118", inStock: true }
    ],
    blouseOptions: DEFAULT_BLOUSE_OPTIONS,
    occasion: "Festive",
    rating: 4.8,
    reviewsCount: 31,
    stock: 11,
    images: [
      "/images/categories/pochampally.jpg",
      "/images/saree_ruhani_1.jpg",
      "/images/saree_ruhani_2.jpg",
      "/images/coll_contemp.jpg"
    ],
    description: "Renowned UNESCO heritage double-ikat craft from Bhoodan Pochampally. Both warp and weft silk yarns are meticulously tied and dyed prior to weaving to yield sharp, mesmerizing geometric diamond motifs.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter contrast ikat blouse piece included",
      weave: "Double Ikat Resist Handloom Weave",
      origin: "Pochampally, Telangana",
      weight: "590 grams",
      zariType: "Subtle Gold Zari Border",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean only to maintain vivid natural dye luster."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-007",
    slug: "one-minute-ready-to-wear-saree",
    name: "1-Minute Ready-to-Wear Saree",
    sareeType: "Ready-to-Wear",
    tagline: "Pre-Pleated Mulberry Silk with Adjustable Hook Waistband",
    price: 4799,
    compareAtPrice: 6499,
    discount: "26% OFF",
    badge: "Innovator",
    category: "Ready-to-Wear",
    fabric: "Viscose Crepe & Silk Blend",
    color: "Wine Berry",
    colorHex: "#5B1E31",
    swatches: [
      { name: "Wine Berry", hex: "#5B1E31", inStock: true },
      { name: "Champagne Gold", hex: "#C7A75C", inStock: true },
      { name: "Obsidian Black", hex: "#1A1A1A", inStock: true }
    ],
    blouseOptions: DEFAULT_BLOUSE_OPTIONS,
    occasion: "Party Wear",
    rating: 4.9,
    reviewsCount: 57,
    stock: 22,
    images: [
      "/images/categories/ready-to-wear.jpg",
      "/images/saree_ananya_1.jpg",
      "/images/coll_contemp.jpg",
      "/images/saree_aira_2.jpg"
    ],
    description: "Revolutionizing traditional drapes. Perfectly tailored with permanent structured front pleats, adjustable waist clips (fitting 26 to 42 waist), and a pre-stitched flowing shoulder drape. Ready in 60 seconds with zero pins required.",
    specifications: {
      length: "Pre-stitched customized fit (fits waist 26-42 inches)",
      width: "Adjustable height up to 5'9\"",
      blouseLength: "Includes matching ready-to-wear padded blouse (free size with margin)",
      weave: "Tailored Studio Construction",
      origin: "PALLUVO Signature Studio, Hyderabad",
      weight: "540 grams",
      zariType: "Minimalist Antique Gold Trim",
      transparency: "Opaque",
      fallPico: "Internal structure with pre-set micro pleats",
      care: "Steam press on low heat or dry clean."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-008",
    slug: "designer-uppada-jamdani-saree",
    name: "Designer Uppada Saree",
    sareeType: "Uppada",
    tagline: "Fine Jamdani Cotton Silk with Intricate Gold Zari Meenakari",
    price: 6499,
    compareAtPrice: 8799,
    discount: "26% OFF",
    badge: "Handcrafted",
    category: "Uppada",
    fabric: "Fine Jamdani Cotton Silk",
    color: "Coral Peach",
    colorHex: "#D97D64",
    swatches: [
      { name: "Coral Peach", hex: "#D97D64", inStock: true },
      { name: "Mint Aqua", hex: "#88BDBF", inStock: true },
      { name: "Ivory Pearl", hex: "#F3ECE2", inStock: true }
    ],
    blouseOptions: DEFAULT_BLOUSE_OPTIONS,
    occasion: "Traditional",
    rating: 4.8,
    reviewsCount: 16,
    stock: 8,
    images: [
      "/images/categories/uppada.jpg",
      "/images/saree_ira_1.jpg",
      "/images/saree_ira_2.jpg",
      "/images/craftsmanship.jpg"
    ],
    description: "An ethereal masterwork from Uppada, Andhra Pradesh. Woven using the non-structural Jamdani extra-weft technique where every floral butta is placed by hand between shed warp threads. Weightless, regal, and deeply traditional.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter matching Jamdani border blouse piece",
      weave: "Authentic Jamdani Handloom Weave",
      origin: "Uppada, Andhra Pradesh",
      weight: "410 grams",
      zariType: "Pure Silver & Gold Zari Thread",
      transparency: "Semi-Sheer",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean only. Roll around cylindrical tube to avoid creases."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-009",
    slug: "pure-mysore-crepe-silk-saree",
    name: "Pure Mysore Crepe Silk Saree",
    sareeType: "Mysore Silk",
    tagline: "100% Tested Pure Gold Zari Edging on Heavy Crepe de Chine",
    price: 7999,
    compareAtPrice: 10999,
    discount: "27% OFF",
    badge: "Silk Mark",
    category: "Mysore Silk",
    fabric: "Pure Natural Crepe Silk",
    color: "Peacock Teal",
    colorHex: "#0F4C5C",
    swatches: [
      { name: "Peacock Teal", hex: "#0F4C5C", inStock: true },
      { name: "Rich Crimson", hex: "#8A1C2C", inStock: true },
      { name: "Saffron Amber", hex: "#C76D1F", inStock: true }
    ],
    blouseOptions: DEFAULT_BLOUSE_OPTIONS,
    occasion: "Traditional",
    rating: 4.9,
    reviewsCount: 33,
    stock: 10,
    images: [
      "/images/categories/mysore-silk.jpg",
      "/images/coll_silk.jpg",
      "/images/saree_meher_1.jpg",
      "/images/craftsmanship.jpg"
    ],
    description: "Crafted with 100% pure natural silk yarns spun in Karnataka and woven on heritage looms. Famous for its buttery supple drape, matte sheen, and certified pure tested gold zari borders that retain luster for decades.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter matching pure crepe silk blouse fabric",
      weave: "High-Twist Crepe De Chine Weave",
      origin: "Mysuru, Karnataka",
      weight: "630 grams",
      zariType: "100% Certified Tested Gold Zari (0.65% Silver, 0.6% Gold)",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Strictly dry clean only."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-010",
    slug: "patan-patola-double-ikat-saree",
    name: "Patan Patola Silk Saree",
    sareeType: "Patola",
    tagline: "Double Ikat Heritage with Auspicious Elephant & Parrot Motifs",
    price: 9999,
    compareAtPrice: 13999,
    discount: "29% OFF",
    badge: "Museum Grade",
    category: "Patola",
    fabric: "Mulberry Silk Double Ikat",
    color: "Sindoor Red",
    colorHex: "#991B1E",
    swatches: [
      { name: "Sindoor Red", hex: "#991B1E", inStock: true },
      { name: "Forest Green", hex: "#1A4329", inStock: true },
      { name: "Royal Indigo", hex: "#192A51", inStock: true }
    ],
    blouseOptions: DEFAULT_BLOUSE_OPTIONS,
    occasion: "Wedding",
    rating: 5.0,
    reviewsCount: 14,
    stock: 4,
    images: [
      "/images/categories/patola.jpg",
      "/images/saree_sitara_1.jpg",
      "/images/coll_wedding.jpg",
      "/images/craftsmanship.jpg"
    ],
    description: "An ultra-rare Gujarati masterpiece. Mathematical precision double ikat where both warp and weft are dyed before hand-weaving. Identical on both front and back sides, steeped in royal legend.",
    specifications: {
      length: "5.5 meters",
      width: "46 inches",
      blouseLength: "0.8 meter matching double-ikat blouse piece",
      weave: "Patan Mathematical Double Ikat",
      origin: "Patan, Gujarat",
      weight: "690 grams",
      zariType: "Real Gold Brocade Pallu",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean only. Store draped in soft cotton cloth."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-011",
    slug: "kalamkari-handloom-saree",
    name: "Kalamkari Handloom Saree",
    sareeType: "Kalamkari",
    tagline: "Hand-Painted Mythological Narratives on Pure Cotton Silk",
    price: 3999,
    compareAtPrice: 5499,
    discount: "27% OFF",
    badge: "Heritage Art",
    category: "Kalamkari",
    fabric: "Chanderi Cotton Silk",
    color: "Terracotta Earth",
    colorHex: "#A0472D",
    swatches: [
      { name: "Terracotta Earth", hex: "#A0472D", inStock: true },
      { name: "Indigo Blue", hex: "#1F3A58", inStock: true },
      { name: "Mustard Ocre", hex: "#B98522", inStock: true }
    ],
    blouseOptions: DEFAULT_BLOUSE_OPTIONS,
    occasion: "Traditional",
    rating: 4.8,
    reviewsCount: 21,
    stock: 13,
    images: [
      "/images/categories/kalamkari.jpg",
      "/images/craftsmanship.jpg",
      "/images/saree_meher_2.jpg",
      "/images/coll_everyday.jpg"
    ],
    description: "Painstakingly drawn by master Kalamkari artisans in Srikalahasti using sharpened bamboo pens and 100% natural plant and mineral dyes. Depicts timeless flora, sacred peacocks, and temple borders.",
    specifications: {
      length: "5.5 meters",
      width: "44 inches",
      blouseLength: "0.8 meter running hand-painted cotton silk blouse piece",
      weave: "Handloom Cotton Silk with Pen Kalamkari",
      origin: "Srikalahasti, Andhra Pradesh",
      weight: "460 grams",
      zariType: "Fine Zari Selvedge",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Gentle dry clean only. Natural vegetable colors mature with age."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-012",
    slug: "contemporary-georgette-saree",
    name: "Contemporary Georgette Saree",
    sareeType: "Georgette",
    tagline: "Midnight Navy Shimmer Georgette with Scalloped Zari Lace",
    price: 4499,
    compareAtPrice: 5999,
    discount: "25% OFF",
    badge: "Party Edit",
    category: "Georgette",
    fabric: "Viscose Shimmer Georgette",
    color: "Midnight Navy",
    colorHex: "#101D36",
    swatches: [
      { name: "Midnight Navy", hex: "#101D36", inStock: true },
      { name: "Wine Burgundy", hex: "#521626", inStock: true },
      { name: "Champagne Silver", hex: "#B4B0A7", inStock: true }
    ],
    blouseOptions: DEFAULT_BLOUSE_OPTIONS,
    occasion: "Reception",
    rating: 4.9,
    reviewsCount: 34,
    stock: 17,
    images: [
      "/images/categories/georgette.jpg",
      "/images/saree_tara_1.jpg",
      "/images/saree_kavya_1.jpg",
      "/images/coll_wedding.jpg"
    ],
    description: "Modern evening poise. Woven from breathable viscose georgette with subtle metallic lurex undertones and an intricate scalloped zari cutwork border designed to drape effortlessly around every curve.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter matching heavy embroidered georgette fabric",
      weave: "Contemporary Powerloom Georgette",
      origin: "Surat, Gujarat",
      weight: "510 grams",
      zariType: "Metallic Lurex & Micro Sequins",
      transparency: "Semi-Sheer",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean only. Hang on padded hanger."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  }
];

export const HANDLOOM_REGIONS: HandloomRegion[] = [
  { name: "Pochampally", state: "Telangana", weave: "Double Ikat Silk", image: "/images/categories/pochampally.jpg" },
  { name: "Gadwal", state: "Telangana", weave: "Kuta Interlocked Silk", image: "/images/categories/gadwal.jpg" },
  { name: "Uppada", state: "Andhra Pradesh", weave: "Fine Jamdani Cotton Silk", image: "/images/categories/uppada.jpg" },
  { name: "Chanderi", state: "Madhya Pradesh", weave: "Gossamer Zari Weave", image: "/images/categories/chanderi.jpg" },
  { name: "Paithani", state: "Maharashtra", weave: "Peacock Tapestry Silk", image: "/images/categories/paithani.jpg" },
  { name: "Banarasi", state: "Uttar Pradesh", weave: "Kadhwa Gold Brocade", image: "/images/categories/banarasi.jpg" },
  { name: "Kanjivaram", state: "Tamil Nadu", weave: "Pure Korvai Temple Zari", image: "/images/categories/kanjivaram.jpg" },
  { name: "Ilkal", state: "Karnataka", weave: "Tope Teni Heritage Pallu", image: "/images/categories/ilkal.jpg" },
  { name: "Bomkai", state: "Odisha", weave: "Tribal Extra-Weft Ikat", image: "/images/categories/bomkai.jpg" },
  { name: "Assam / Muga", state: "Assam", weave: "Golden Wild Silk", image: "/images/categories/assam-muga.jpg" }
];

export function formatINR(amount: number): string {
  if (isNaN(amount)) amount = 0;
  return '₹' + amount.toLocaleString('en-IN');
}

export function getAllProducts(): SareeProduct[] {
  return SAREE_PRODUCTS;
}

export function getProductBySlugOrId(identifier: string): SareeProduct | undefined {
  if (!identifier) return undefined;
  const idLower = identifier.toLowerCase();
  return SAREE_PRODUCTS.find(p => p.slug.toLowerCase() === idLower || p.id.toLowerCase() === idLower);
}

export function searchProducts(query: string): SareeProduct[] {
  if (!query) return SAREE_PRODUCTS;
  const q = query.toLowerCase().trim();
  return SAREE_PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.sareeType.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.fabric.toLowerCase().includes(q) ||
    p.color.toLowerCase().includes(q) ||
    p.occasion.toLowerCase().includes(q) ||
    (p.specifications && p.specifications.origin.toLowerCase().includes(q))
  );
}
