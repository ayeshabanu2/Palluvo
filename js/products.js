/**
 * PALLUVO — Contemporary Luxury Saree Fashion House
 * "Every drape, a little magic."
 * Curated Top Models & Saree-Only Merchandising
 */

// Curated Top Signature Saree Models for PALLUVO
const PALLUVO_TOP_MODELS = [
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
    image: "images/categories/banarasi.jpg",
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
    image: "images/categories/kanjivaram.jpg",
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
    image: "images/categories/pochampally.jpg",
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
    image: "images/saree_paithani_royal.jpg",
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
    image: "images/categories/chanderi.jpg",
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
    image: "images/categories/organza.jpg",
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
    image: "images/categories/ready-to-wear.jpg",
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
    image: "images/categories/mysore-silk.jpg",
    filterType: "Mysore Silk",
    artisanHours: "110+ Weaving Hours",
    pureSilkMark: true
  }
];

// Reference the curated top models as the primary saree categories
const SAREE_CATEGORIES = PALLUVO_TOP_MODELS;

// Colorful Festive Sarees for "THE FESTIVE EDIT"
const FESTIVE_SAREES = [
  { name: "Bandhani Silk", region: "Gujarat", image: "images/categories/bandhani.jpg", desc: "Auspicious red & gold resist tie-dye dots hand-plucked on pure silk." },
  { name: "Patola Double Ikat", region: "Patan, Gujarat", image: "images/categories/patola.jpg", desc: "Rare mathematical geometric precision double ikat handloom." },
  { name: "Traditional Paithani", region: "Maharashtra", image: "images/saree_paithani_royal.jpg", desc: "Kaleidoscopic Mor Bangdi peacock pallu with radiant gold tissue." },
  { name: "Royal Banarasi", region: "Varanasi, UP", image: "images/categories/banarasi.jpg", desc: "Opulent real gold zari jaal on rich scarlet and crimson katan silk." },
  { name: "Temple Kanjivaram", region: "Tamil Nadu", image: "images/categories/kanjivaram.jpg", desc: "Three-ply mulberry silk with auspicious gold temple border motifs." },
  { name: "Pochampally Ikat", region: "Telangana", image: "images/categories/pochampally.jpg", desc: "Dynamic double-ikat silk weave crafted for Garba celebrations and aartis." }
];

// 8 Occasions (Saree-Only Curations)
const SAREE_OCCASIONS = [
  {
    id: "wedding",
    name: "Wedding",
    subtitle: "Heirloom Silks & Zari Grandeur",
    sareeType: "Pure Kanjivaram & Banarasi Silk",
    image: "images/occasions/wedding.jpg",
    filterParam: "Wedding"
  },
  {
    id: "bridal",
    name: "Bridal",
    subtitle: "The Sacred Red & Gold Drape",
    sareeType: "Bridal Crimson Zari Brocade",
    image: "images/occasions/bridal.jpg",
    filterParam: "Bridal"
  },
  {
    id: "festive",
    name: "Festive",
    subtitle: "Vibrant Navratri & Diwali Celebrations",
    sareeType: "Bandhani, Patola & Paithani",
    image: "images/occasions/festive.jpg",
    filterParam: "Festive"
  },
  {
    id: "party-wear",
    name: "Party Wear",
    subtitle: "Cocktail Drapes & Evening Sheers",
    sareeType: "Organza, Shimmer Georgette & Crepe",
    image: "images/occasions/party-wear.jpg",
    filterParam: "Party Wear"
  },
  {
    id: "office-wear",
    name: "Office Wear",
    subtitle: "Crisp, Dignified Everyday Elegance",
    sareeType: "Linen, Chanderi & Mercerized Cotton",
    image: "images/occasions/office-wear.jpg",
    filterParam: "Office Wear"
  },
  {
    id: "casual",
    name: "Casual",
    subtitle: "Effortless Featherlight Comfort",
    sareeType: "Mulmul Cotton & Pure Chiffon",
    image: "images/occasions/casual.jpg",
    filterParam: "Casual"
  },
  {
    id: "traditional",
    name: "Traditional",
    subtitle: "Sacred Pujas & Regional Rituals",
    sareeType: "Handloom Uppada, Gadwal & Ilkal",
    image: "images/occasions/traditional.jpg",
    filterParam: "Traditional"
  },
  {
    id: "reception",
    name: "Reception",
    subtitle: "Modern Silhouettes & Sleek Satin Drapes",
    sareeType: "Pre-Pleated Tissue & Metallic Silk",
    image: "images/occasions/reception.jpg",
    filterParam: "Reception"
  }
];

// Complete 20-Product Catalog of Authentic Luxury Sarees
const SAREE_PRODUCTS = [
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
    occasion: "Wedding",
    rating: 4.9,
    reviewsCount: 38,
    stock: 12,
    images: [
      "images/hero_saree_art.jpg",
      "images/categories/banarasi.jpg",
      "images/coll_silk.jpg",
      "images/craftsmanship.jpg"
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
    occasion: "Wedding",
    rating: 4.9,
    reviewsCount: 42,
    stock: 9,
    images: [
      "images/categories/kanjivaram.jpg",
      "images/products/kanjivaram_royal.jpg",
      "images/banner_traditional_saree.jpg",
      "images/coll_silk.jpg"
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
    slug: "handwoven-pochampally-ikat-saree",
    name: "Handwoven Pochampally Ikat Saree",
    sareeType: "Pochampally",
    tagline: "Double Ikat Silk with Geometric Heritage Border",
    price: 5499,
    compareAtPrice: 7499,
    discount: "26% OFF",
    badge: "Artisanal",
    category: "Pochampally",
    fabric: "Pure Silk Cotton",
    color: "Midnight Black",
    colorHex: "#1A1A1A",
    swatches: [
      { name: "Midnight Black", hex: "#1A1A1A", inStock: true },
      { name: "Mustard Yellow", hex: "#D4A017", inStock: true },
      { name: "Terracotta Red", hex: "#A83E2D", inStock: true }
    ],
    occasion: "Traditional",
    rating: 4.8,
    reviewsCount: 29,
    stock: 14,
    images: [
      "images/categories/pochampally.jpg",
      "images/saree_meher_1.jpg",
      "images/saree_meher_2.jpg",
      "images/craftsmanship.jpg"
    ],
    description: "Celebrated Telangana double-ikat masterpiece. Each yarn is precision tie-dyed before weaving on traditional pit looms, yielding mesmerizing crisp geometric diamonds with a fluid fall.",
    specifications: {
      length: "5.5 meters",
      width: "44 inches",
      blouseLength: "0.8 meter matching ikat fabric included",
      weave: "Double Ikat Handloom Weave",
      origin: "Pochampally, Telangana",
      weight: "510 grams",
      zariType: "Subtle Gold Zari Edging",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Gentle dry clean recommended. Iron inside out."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-004",
    slug: "elegant-organza-saree",
    name: "Elegant Organza Saree",
    sareeType: "Organza",
    tagline: "Translucent Powder Sage Organza with Hand-Cut Scallop Border",
    price: 3899,
    compareAtPrice: 5299,
    discount: "26% OFF",
    badge: "New Arrival",
    category: "Organza",
    fabric: "Pure Silk Organza",
    color: "Sage Green",
    colorHex: "#8A9A86",
    swatches: [
      { name: "Sage Green", hex: "#8A9A86", inStock: true },
      { name: "Powder Pink", hex: "#E8C5C8", inStock: true },
      { name: "Ice Blue", hex: "#C2D4D8", inStock: true }
    ],
    occasion: "Party Wear",
    rating: 4.9,
    reviewsCount: 31,
    stock: 18,
    images: [
      "images/categories/organza.jpg",
      "images/saree_aira_1.jpg",
      "images/saree_aira_2.jpg",
      "images/coll_everyday.jpg"
    ],
    description: "Whisper-light sheer silk organza featuring delicate hand-embroidered botanical vines and a laser-finished scalloped border with micro-sequin luminescence.",
    specifications: {
      length: "5.5 meters",
      width: "44 inches",
      blouseLength: "0.8 meter heavy embroidered organza blouse fabric",
      weave: "Powerloom Organza with Hand Embroidery",
      origin: "Varanasi & Surat",
      weight: "340 grams",
      zariType: "Matte Champagne Zari & Sequins",
      transparency: "Semi-Sheer",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean only. Do not wring or steam press."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-005",
    slug: "traditional-paithani-saree",
    name: "Traditional Paithani Saree",
    sareeType: "Paithani",
    tagline: "Pure Yeola Silk with Traditional Mor Bangdi Peacock Tapestry",
    price: 8999,
    compareAtPrice: 12499,
    discount: "28% OFF",
    badge: "Heritage",
    category: "Paithani",
    fabric: "Pure Yeola Silk",
    color: "Royal Crimson Gold",
    colorHex: "#8B1E2B",
    swatches: [
      { name: "Royal Crimson Gold", hex: "#8B1E2B", inStock: true },
      { name: "Royal Violet", hex: "#4C2258", inStock: true },
      { name: "Emerald Yeola Green", hex: "#134E4A", inStock: true }
    ],
    occasion: "Festive",
    rating: 5.0,
    reviewsCount: 24,
    stock: 7,
    images: [
      "images/saree_paithani_royal.jpg",
      "images/products/paithani_gold.jpg",
      "images/categories/paithani.jpg",
      "images/coll_festive.jpg"
    ],
    description: "The pride of Maharashtra. Handwoven in Yeola with pure natural mulberry silk and real gold zari tapestry, featuring the iconic kaleidoscopic peacock (Mor Bangdi) motif across the expansive grand pallu.",
    specifications: {
      length: "5.5 meters",
      width: "46 inches",
      blouseLength: "0.8 meter matching pure silk blouse piece with zari border",
      weave: "Authentic Yeola Handloom Tapestry Weave",
      origin: "Paithan & Yeola, Maharashtra",
      weight: "780 grams",
      zariType: "Certified Pure Tested Gold Zari",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Strictly dry clean. Wrap in unbleached cotton muslin."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-006",
    slug: "premium-mysore-silk-saree",
    name: "Premium Mysore Silk Saree",
    sareeType: "Mysore Silk",
    tagline: "Liquid Gold Drape with Kasuti Border in Royal Sapphire",
    price: 5999,
    compareAtPrice: 7999,
    discount: "25% OFF",
    badge: "Bestseller",
    category: "Mysore Silk",
    fabric: "100% Pure Mulberry Crepe Silk",
    color: "Sapphire Blue",
    colorHex: "#133E68",
    swatches: [
      { name: "Sapphire Blue", hex: "#133E68", inStock: true },
      { name: "Rani Pink", hex: "#B8235A", inStock: true },
      { name: "Turmeric Gold", hex: "#D69B22", inStock: true }
    ],
    occasion: "Traditional",
    rating: 4.9,
    reviewsCount: 36,
    stock: 15,
    images: [
      "images/categories/mysore-silk.jpg",
      "images/coll_silk.jpg",
      "images/saree_ira_1.jpg",
      "images/saree_ira_2.jpg"
    ],
    description: "Famous for its fluid, anti-crease drape and unmistakable luster. Crafted from government-certified mulberry silk yarn with an embossed gold zari band and delicate temple border.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter pure crepe silk blouse piece included",
      weave: "High-Twist Silk Crepe Weave",
      origin: "Mysuru, Karnataka",
      weight: "480 grams",
      zariType: "Certified Tested Gold Zari",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean only. Protect from moisture."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-007",
    slug: "handloom-chanderi-saree",
    name: "Handloom Chanderi Saree",
    sareeType: "Chanderi",
    tagline: "Ivory Silk Cotton with Muted Gold Zari Ashrafi Booti",
    price: 4299,
    compareAtPrice: 5899,
    discount: "27% OFF",
    badge: "Staff Pick",
    category: "Chanderi",
    fabric: "Chanderi Silk Cotton",
    color: "Ivory & Warm Gold",
    colorHex: "#F2EADB",
    swatches: [
      { name: "Ivory & Warm Gold", hex: "#F2EADB", inStock: true },
      { name: "Mint Green", hex: "#A8C3B5", inStock: true },
      { name: "Blush Peach", hex: "#E9BFA8", inStock: true }
    ],
    occasion: "Office Wear",
    rating: 4.8,
    reviewsCount: 22,
    stock: 16,
    images: [
      "images/categories/chanderi.jpg",
      "images/saree_aira_1.jpg",
      "images/saree_ruhani_1.jpg",
      "images/craftsmanship.jpg"
    ],
    description: "A timeless handwoven marvel from historic Madhya Pradesh. Sheer, crisp, and comfortable, woven with fine Ashrafi coin motifs and a sleek narrow gold border.",
    specifications: {
      length: "5.5 meters",
      width: "44 inches",
      blouseLength: "0.8 meter matching chanderi blouse piece",
      weave: "Chanderi Pit Loom Handloom",
      origin: "Chanderi, Madhya Pradesh",
      weight: "390 grams",
      zariType: "Muted Antique Gold Zari",
      transparency: "Semi-Sheer",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean recommended or gentle cold hand wash."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-008",
    slug: "festive-bandhani-saree",
    name: "Festive Bandhani Saree",
    sareeType: "Bandhani",
    tagline: "Ruby Red Gharchola Silk Bandhej with Zari Grid Work",
    price: 4799,
    compareAtPrice: 6499,
    discount: "26% OFF",
    badge: "Festive Special",
    category: "Bandhani",
    fabric: "Pure Gajji Silk",
    color: "Ruby Red",
    colorHex: "#A31621",
    swatches: [
      { name: "Ruby Red", hex: "#A31621", inStock: true },
      { name: "Bright Marigold", hex: "#E58F12", inStock: true },
      { name: "Bottle Green", hex: "#164B29", inStock: true }
    ],
    occasion: "Festive",
    rating: 4.9,
    reviewsCount: 33,
    stock: 11,
    images: [
      "images/categories/bandhani.jpg",
      "images/products/bandhani_gharchola.jpg",
      "images/coll_festive.jpg",
      "images/saree_zoya_2.jpg"
    ],
    description: "Authentic Gujarati Bandhani crafted on lustrous Gajji silk. Features thousands of hand-pinched knot resist ties filled with vibrant dyes and enclosed in an auspicious gold zari check grid.",
    specifications: {
      length: "5.5 meters",
      width: "44 inches",
      blouseLength: "0.8 meter matching bandhani silk piece",
      weave: "Traditional Knot-Dye Bandhej on Handloom Silk",
      origin: "Kutch & Jamnagar, Gujarat",
      weight: "560 grams",
      zariType: "Zari Woven Checks and Border",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Roll-press dry clean only to preserve natural bandhani texture."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-009",
    slug: "soft-tussar-silk-saree",
    name: "Soft Tussar Silk Saree",
    sareeType: "Tussar",
    tagline: "Natural Golden Honey Tussar with Hand-Block Florals",
    price: 4599,
    compareAtPrice: 6199,
    discount: "25% OFF",
    badge: "Handcrafted",
    category: "Tussar",
    fabric: "Pure Wild Tussar Silk",
    color: "Natural Honey Beige",
    colorHex: "#C9A775",
    swatches: [
      { name: "Natural Honey Beige", hex: "#C9A775", inStock: true },
      { name: "Earthy Rust", hex: "#9B4522", inStock: true },
      { name: "Indigo Charcoal", hex: "#223547", inStock: true }
    ],
    occasion: "Office Wear",
    rating: 4.8,
    reviewsCount: 19,
    stock: 14,
    images: [
      "images/categories/tussar.jpg",
      "images/saree_ruhani_1.jpg",
      "images/saree_ruhani_2.jpg",
      "images/craftsmanship.jpg"
    ],
    description: "Woven from forest wild tussar cocoons with organic slub texture and innate golden sheen. Hand block printed with traditional wooden stamps using azo-free eco pigments.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter contrasting printed tussar fabric",
      weave: "Handspun Wild Silk Handloom",
      origin: "Bhagalpur, Bihar",
      weight: "490 grams",
      zariType: "Dual Zari Threadwork along Pallu",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean only. Iron on reverse with medium heat."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-010",
    slug: "designer-uppada-saree",
    name: "Designer Uppada Saree",
    sareeType: "Uppada",
    tagline: "Translucent Jamdani Weave in Coral Peach with Zari Paisleys",
    price: 6299,
    compareAtPrice: 8699,
    discount: "27% OFF",
    badge: "Exclusive",
    category: "Uppada",
    fabric: "Pure Silk Cotton Jamdani",
    color: "Coral Peach",
    colorHex: "#E58E77",
    swatches: [
      { name: "Coral Peach", hex: "#E58E77", inStock: true },
      { name: "Aqua Marine", hex: "#5C9993", inStock: true },
      { name: "Champagne Cream", hex: "#E8DCBA", inStock: true }
    ],
    occasion: "Reception",
    rating: 4.9,
    reviewsCount: 27,
    stock: 10,
    images: [
      "images/categories/uppada.jpg",
      "images/saree_sitara_1.jpg",
      "images/saree_aira_2.jpg",
      "images/craftsmanship.jpg"
    ],
    description: "An exquisite lightweight Jamdani weave from Andhra Pradesh. Intricate paisleys and floral vines are individually laid into the warp using bamboo needles, creating an almost weightless silhouette.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter plain silk blouse fabric with border",
      weave: "Authentic Jamdani Handloom",
      origin: "Uppada, Andhra Pradesh",
      weight: "410 grams",
      zariType: "Finest Silver & Gold Tested Zari",
      transparency: "Semi-Sheer",
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
    occasion: "Traditional",
    rating: 4.8,
    reviewsCount: 21,
    stock: 13,
    images: [
      "images/categories/kalamkari.jpg",
      "images/craftsmanship.jpg",
      "images/saree_meher_2.jpg",
      "images/coll_everyday.jpg"
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
    occasion: "Reception",
    rating: 4.9,
    reviewsCount: 34,
    stock: 17,
    images: [
      "images/categories/georgette.jpg",
      "images/saree_tara_1.jpg",
      "images/coll_contemp.jpg",
      "images/coll_wedding.jpg"
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
  },
  {
    id: "saree-013",
    slug: "gujarati-bandhani-gharchola-silk-saree",
    name: "Auspicious Gujarati Bandhani Saree",
    sareeType: "Bandhani",
    tagline: "Pure Gaji Silk Rai-Bandhej with 24K Gold Zari Check Grid",
    price: 7899,
    compareAtPrice: 10499,
    discount: "25% OFF",
    badge: "Festive Luxury",
    category: "Bandhani",
    fabric: "Pure Gaji Silk",
    color: "Sindoor Red",
    colorHex: "#9B111E",
    swatches: [
      { name: "Sindoor Red", hex: "#9B111E", inStock: true },
      { name: "Marigold Yellow", hex: "#EAA221", inStock: true },
      { name: "Royal Rani Pink", hex: "#C71585", inStock: true }
    ],
    occasion: "Festive",
    rating: 4.9,
    reviewsCount: 27,
    stock: 8,
    images: [
      "images/categories/bandhani.jpg",
      "images/products/bandhani_gharchola.jpg",
      "images/occasions/festive.jpg",
      "images/coll_silk.jpg"
    ],
    description: "Handcrafted in Jamnagar and Bhuj using traditional Rai-Bandhej resist tie-dye. Thousands of micro-knots are tied by hand onto rich Gaji silk framed by authentic golden Gharchola grids, making it the most auspicious celebration drape.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter pure gaji silk blouse piece with bandhej dots",
      weave: "Traditional Jamnagar Hand-Tied Bandhej",
      origin: "Kutch & Jamnagar, Gujarat",
      weight: "620 grams",
      zariType: "Real Gold Tested Zari Check Grid",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Strictly dry clean only. Roll press to preserve crinkle texture."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-014",
    slug: "bridal-heirloom-crimson-kanjivaram-saree",
    name: "Bridal Heirloom Crimson Kanjivaram",
    sareeType: "Kanjivaram",
    tagline: "Pure Three-Ply Mulberry Silk with Pure Gold Mayil Peacock Brocade",
    price: 11999,
    compareAtPrice: 16499,
    discount: "27% OFF",
    badge: "Bridal Heirloom",
    category: "Kanjivaram",
    fabric: "Three-Ply Mulberry Silk",
    color: "Crimson Bridal Gold",
    colorHex: "#800020",
    swatches: [
      { name: "Crimson Bridal Gold", hex: "#800020", inStock: true },
      { name: "Temple Vermilion", hex: "#D9381E", inStock: true },
      { name: "Auspicious Kumkum", hex: "#7E191B", inStock: true }
    ],
    occasion: "Bridal",
    rating: 5.0,
    reviewsCount: 48,
    stock: 5,
    images: [
      "images/banner_traditional_saree.jpg",
      "images/occasions/bridal.jpg",
      "images/products/kanjivaram_royal.jpg",
      "images/categories/kanjivaram.jpg"
    ],
    description: "The quintessential South Indian bridal heirloom. Three warp and weft mulberry silk threads twisted together create unmatched weight, sheen, and durability. Adorned with Rudraksha, Mayil (peacock), and Temple Shikhara borders in heavy dipped gold zari.",
    specifications: {
      length: "5.5 meters",
      width: "47 inches",
      blouseLength: "0.8 meter rich brocade contrast blouse fabric",
      weave: "Double Korvai Petni Handloom Weave",
      origin: "Kanchipuram, Tamil Nadu",
      weight: "950 grams",
      zariType: "Pure Silver Gilt with 24K Gold Plating (Tested)",
      transparency: "Opaque",
      fallPico: "Complimentary heavy fall and pico edging done",
      care: "Dry clean only. Store in wooden or cotton heirloom box."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-015",
    slug: "lucknowi-chikankari-mukaish-silk-saree",
    name: "Lucknowi Chikankari Mukaish Saree",
    sareeType: "Chikankari",
    tagline: "Hand-Embroidered Shadow Work with Badla & Mukaish Metallic Accents",
    price: 6799,
    compareAtPrice: 8999,
    discount: "24% OFF",
    badge: "Artisanal",
    category: "Chikankari",
    fabric: "Pure Viscose Georgette",
    color: "Pearl Ivory",
    colorHex: "#FDFBF7",
    swatches: [
      { name: "Pearl Ivory", hex: "#FDFBF7", inStock: true },
      { name: "Pastel Mint", hex: "#D1E7DD", inStock: true },
      { name: "Powder Peach", hex: "#FCE4D6", inStock: true }
    ],
    occasion: "Party Wear",
    rating: 4.9,
    reviewsCount: 22,
    stock: 9,
    images: [
      "images/categories/chikankari.jpg",
      "images/saree_aira_1.jpg",
      "images/coll_contemp.jpg",
      "images/categories/georgette.jpg"
    ],
    description: "An aristocratic Nawabi creation from Lucknow. Hand-embroidered across 90 days with 32 unique needlework stitches including Bakhiya (shadow work), Phanda, and Tepchi, accented by hand-flattened Mukaish metallic sparkles that shimmer like stardust.",
    specifications: {
      length: "5.5 meters",
      width: "44 inches",
      blouseLength: "0.8 meter pure georgette blouse piece with matching chikankari sleeves",
      weave: "Hand-Embroidered Chikan Work",
      origin: "Lucknow, Uttar Pradesh",
      weight: "480 grams",
      zariType: "Silver Mukaish Badla Highlights",
      transparency: "Semi-Sheer",
      fallPico: "Complimentary fall and pico edging done",
      care: "Gentle dry clean only."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-016",
    slug: "pure-gadwal-kuta-interlocked-silk-saree",
    name: "Pure Gadwal Kuta Silk Saree",
    sareeType: "Gadwal",
    tagline: "Hand-Interlocked Kuta Temple Border with Pure Gold Zari Pallu",
    price: 5899,
    compareAtPrice: 7999,
    discount: "26% OFF",
    badge: "Handloom Pure",
    category: "Gadwal",
    fabric: "Gadwal Sico & Pure Silk",
    color: "Royal Mustard & Magenta",
    colorHex: "#DDA21B",
    swatches: [
      { name: "Royal Mustard & Magenta", hex: "#DDA21B", inStock: true },
      { name: "Peacock Green & Purple", hex: "#166534", inStock: true },
      { name: "Crimson & Black", hex: "#7F1D1D", inStock: true }
    ],
    occasion: "Traditional",
    rating: 4.8,
    reviewsCount: 18,
    stock: 11,
    images: [
      "images/categories/gadwal.jpg",
      "images/saree_meher_1.jpg",
      "images/saree_meher_2.jpg",
      "images/coll_silk.jpg"
    ],
    description: "A wonder of Andhra & Telangana handloom engineering. The breathable, gossamer body is woven with lightweight yarn, while the heavy pure silk borders and solid zari pallu are interlocked using the revered Kuta (interlocking weft) technique.",
    specifications: {
      length: "5.5 meters",
      width: "46 inches",
      blouseLength: "0.8 meter contrast pure silk blouse piece included",
      weave: "Kuta Interlocking Pitloom Handloom",
      origin: "Gadwal, Telangana",
      weight: "520 grams",
      zariType: "Tested Gold Zari Pallu",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean only. Iron on reverse."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-017",
    slug: "rare-royal-assam-muga-wild-silk-saree",
    name: "Royal Assam Muga Wild Silk Saree",
    sareeType: "Assam Muga",
    tagline: "Natural Golden Luster Wild Silk with Woven Kingkhap Motifs",
    price: 12499,
    compareAtPrice: 16999,
    discount: "26% OFF",
    badge: "Rare Heritage",
    category: "Assam Muga",
    fabric: "100% Golden Muga Silk",
    color: "Natural Champagne Gold",
    colorHex: "#D4AF37",
    swatches: [
      { name: "Natural Champagne Gold", hex: "#D4AF37", inStock: true },
      { name: "Honey Amber", hex: "#C68B59", inStock: true }
    ],
    occasion: "Wedding",
    rating: 5.0,
    reviewsCount: 15,
    stock: 3,
    images: [
      "images/categories/assam-muga.jpg",
      "images/coll_silk.jpg",
      "images/categories/chanderi.jpg",
      "images/craftsmanship.jpg"
    ],
    description: "Endemic exclusively to the Brahmaputra valley of Assam. Muga silk is naturally golden and famously outlasts its owner, growing more lustrous with every decade and gentle wash. Woven with auspicious Kingkhap royal motifs and red-black meenakari.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter pure muga silk running blouse piece",
      weave: "Throw-Shuttle Handloom Weave",
      origin: "Sualkuchi, Assam",
      weight: "610 grams",
      zariType: "Natural Golden Silk Sheen & Tested Zari",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean recommended for first wash. Wrap in fine cotton."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-018",
    slug: "bhagalpuri-tussar-ghicha-handloom-saree",
    name: "Bhagalpuri Tussar Ghicha Saree",
    sareeType: "Tussar",
    tagline: "Earthy Textured Raw Silk with Hand-Block Tribal Motifs & Zari Pinstripes",
    price: 4299,
    compareAtPrice: 5799,
    discount: "26% OFF",
    badge: "Organic Silk",
    category: "Tussar",
    fabric: "Wild Raw Tussar Silk",
    color: "Honey Amber",
    colorHex: "#C19A6B",
    swatches: [
      { name: "Honey Amber", hex: "#C19A6B", inStock: true },
      { name: "Olive Earth", hex: "#556B2F", inStock: true },
      { name: "Burnt Sienna", hex: "#E97451", inStock: true }
    ],
    occasion: "Office Wear",
    rating: 4.8,
    reviewsCount: 25,
    stock: 14,
    images: [
      "images/categories/tussar.jpg",
      "images/categories/handloom.jpg",
      "images/coll_everyday.jpg",
      "images/categories/cotton.jpg"
    ],
    description: "Revered as the 'Peace Silk' of Bihar. Wild cocoons cultivated by forest communities yield a distinct tactile texture and breathable thermal insulation. Draped with organic vegetable block-print borders and subtle zari stripes.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter textured raw tussar fabric included",
      weave: "Traditional Bhagalpur Handloom",
      origin: "Bhagalpur, Bihar",
      weight: "490 grams",
      zariType: "Matte Antique Copper Zari",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Gentle dry clean only."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-019",
    slug: "bomkai-sonepuri-handloom-silk-saree",
    name: "Bomkai Sonepuri Handloom Saree",
    sareeType: "Bomkai",
    tagline: "Odisha Tribal Extra-Weft Ikat with Auspicious Fish & Lotus Bootis",
    price: 6199,
    compareAtPrice: 8499,
    discount: "27% OFF",
    badge: "GI Certified",
    category: "Bomkai",
    fabric: "Malda Mulberry Silk",
    color: "Sunset Maroon & Saffron",
    colorHex: "#7E191B",
    swatches: [
      { name: "Sunset Maroon & Saffron", hex: "#7E191B", inStock: true },
      { name: "Forest Emerald", hex: "#14532D", inStock: true },
      { name: "Royal Midnight Blue", hex: "#1E1B4B", inStock: true }
    ],
    occasion: "Festive",
    rating: 4.9,
    reviewsCount: 17,
    stock: 7,
    images: [
      "images/categories/bomkai.jpg",
      "images/saree_sitara_1.jpg",
      "images/coll_wedding.jpg",
      "images/categories/pochampally.jpg"
    ],
    description: "From the mystical weaving villages of Subarnapur (Sonepur), Odisha. Features complex extra-warp and extra-weft jaala patterning depicting ancient coastal tribal folklore, sacred tortoise motifs, and a solid contrast ikat border.",
    specifications: {
      length: "5.5 meters",
      width: "46 inches",
      blouseLength: "0.8 meter contrast silk blouse piece included",
      weave: "Jaala Attachment Extra-Weft Handloom Weave",
      origin: "Subarnapur, Odisha",
      weight: "580 grams",
      zariType: "Subtle Tested Zari Borders",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Dry clean only. Keep wrapped in cotton cloth."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  },
  {
    id: "saree-020",
    slug: "traditional-peshwai-nauvari-silk-saree",
    name: "Traditional Peshwai Nauvari Saree",
    sareeType: "Nauvari",
    tagline: "Authentic 9-Yard Royal Kashta Drape with Traditional Peacock Zari Border",
    price: 8499,
    compareAtPrice: 11499,
    discount: "26% OFF",
    badge: "Royal Kashta",
    category: "Nauvari",
    fabric: "Pure Paithani Silk Weave",
    color: "Parrot Green & Ruby",
    colorHex: "#2E8B57",
    swatches: [
      { name: "Parrot Green & Ruby", hex: "#2E8B57", inStock: true },
      { name: "Marigold Yellow & Royal Blue", hex: "#D97706", inStock: true },
      { name: "Deep Crimson & Gold", hex: "#881337", inStock: true }
    ],
    occasion: "Traditional",
    rating: 4.9,
    reviewsCount: 30,
    stock: 6,
    images: [
      "images/categories/nauvari.jpg",
      "images/products/paithani_gold.jpg",
      "images/saree_paithani_royal.jpg",
      "images/coll_silk.jpg"
    ],
    description: "The royal 9-yard (Sakachha) drape favored by Maratha queens. Woven in full 8.2-meter length allowing seamless dhoti-style Kashta draping without separate underskirt. Features dense Narali (coconut) zari borders and Mor Bangdi pallu motifs.",
    specifications: {
      length: "8.2 meters (Full 9-Yard Kashta Length)",
      width: "47 inches",
      blouseLength: "0.8 meter matching pure silk blouse piece with zari border",
      weave: "Traditional Yeola Nauvari Pit Loom Weave",
      origin: "Yeola, Maharashtra",
      weight: "890 grams",
      zariType: "Certified Pure Matte Gold Zari",
      transparency: "Opaque",
      fallPico: "Ready to wear without additional underskirt",
      care: "Strictly dry clean only."
    },
    deliveryInfo: "Dispatched within 24 hours. Express insured delivery in 2–4 business days."
  }
];

// Handloom Regions for "THE HANDLOOM EDIT"
const HANDLOOM_REGIONS = [
  { name: "Pochampally", state: "Telangana", weave: "Double Ikat Silk", image: "images/categories/pochampally.jpg" },
  { name: "Gadwal", state: "Telangana", weave: "Kuta Interlocked Silk", image: "images/categories/gadwal.jpg" },
  { name: "Uppada", state: "Andhra Pradesh", weave: "Fine Jamdani Cotton Silk", image: "images/categories/uppada.jpg" },
  { name: "Chanderi", state: "Madhya Pradesh", weave: "Gossamer Zari Weave", image: "images/categories/chanderi.jpg" },
  { name: "Paithani", state: "Maharashtra", weave: "Peacock Tapestry Silk", image: "images/saree_paithani_royal.jpg" },
  { name: "Banarasi", state: "Uttar Pradesh", weave: "Kadhwa Gold Brocade", image: "images/categories/banarasi.jpg" },
  { name: "Kanjivaram", state: "Tamil Nadu", weave: "Pure Korvai Temple Zari", image: "images/categories/kanjivaram.jpg" },
  { name: "Ilkal", state: "Karnataka", weave: "Tope Teni Heritage Pallu", image: "images/categories/ilkal.jpg" },
  { name: "Bomkai", state: "Odisha", weave: "Tribal Extra-Weft Ikat", image: "images/categories/bomkai.jpg" },
  { name: "Assam / Muga", state: "Assam", weave: "Golden Wild Silk", image: "images/categories/assam-muga.jpg" }
];

// Helper functions for easy querying
const SareeCatalog = {
  getAllProducts: () => SAREE_PRODUCTS,
  getProductById: (id) => SAREE_PRODUCTS.find(p => p.id === id || p.slug === id),
  getProductsByCategory: (cat) => SAREE_PRODUCTS.filter(p => p.category.toLowerCase() === cat.toLowerCase() || p.sareeType.toLowerCase() === cat.toLowerCase()),
  getProductsByOccasion: (occ) => SAREE_PRODUCTS.filter(p => p.occasion.toLowerCase() === occ.toLowerCase()),
  getAllCategories: () => SAREE_CATEGORIES,
  getAllOccasions: () => SAREE_OCCASIONS,
  getHandloomRegions: () => HANDLOOM_REGIONS,
  search: (query) => {
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
};

// Ensure default blouseOptions on each product if not present
SAREE_PRODUCTS.forEach(p => {
  if (!p.blouseOptions) {
    p.blouseOptions = [
      { id: "unstitched", name: "Unstitched Matching Fabric (0.8m Included)", price: 0 },
      { id: "tailored-classic", name: "Custom Tailored - Classic Elbow Sleeve & U-Neck", price: 1200 },
      { id: "tailored-sleeveless", name: "Custom Tailored - Deep Sweetheart Sleeveless", price: 1200 },
      { id: "ready-padded", name: "Ready-to-Wear Premium Padded Corset Blouse", price: 1800 }
    ];
  }
});

// Backward and cross-compatibility aliases
const ProductsCatalog = {
  getAll: () => SAREE_PRODUCTS,
  getById: (id) => SareeCatalog.getProductById(id),
  getBySlug: (slug) => SAREE_PRODUCTS.find(p => p.slug === slug || p.id === slug),
  getByCategory: (cat) => SareeCatalog.getProductsByCategory(cat),
  getByOccasion: (occ) => SareeCatalog.getProductsByOccasion(occ),
  getNewArrivals: () => [SAREE_PRODUCTS[4], SAREE_PRODUCTS[1], SAREE_PRODUCTS[0], SAREE_PRODUCTS[13]],
  getBestsellers: () => SAREE_PRODUCTS.filter(p => p.badge === 'Bestseller' || p.badge === 'Trending' || p.badge === 'Heritage'),
  search: (query) => SareeCatalog.search(query)
};

const PALLUVO_PRODUCTS = SAREE_PRODUCTS;
