/**
 * SAREE.COM — Premium Indian Saree Catalog & Merchandising Data
 * "The Art of the Saree — Timeless weaves. Modern elegance."
 * Saree-Only Merchandising (Zero suits, lehengas, kurtis or western wear)
 */

// 27 Saree Categories as specified
const SAREE_CATEGORIES = [
  {
    id: "banarasi",
    slug: "banarasi",
    name: "Banarasi Saree",
    region: "Varanasi, Uttar Pradesh",
    tag: "Heirloom Brocade",
    desc: "Opulent pure silk handwoven with intricate gold and silver zari motifs inspired by Mughal florals and temple jaals.",
    image: "images/categories/banarasi.jpg",
    filterType: "Banarasi"
  },
  {
    id: "kanjivaram",
    slug: "kanjivaram",
    name: "Kanjivaram Saree",
    region: "Kanchipuram, Tamil Nadu",
    tag: "Temple Zari Weave",
    desc: "Pure mulberry silk with three-ply twisted silk yarn and interlocking Korvai temple borders woven for bridal grandeur.",
    image: "images/categories/kanjivaram.jpg",
    filterType: "Kanjivaram"
  },
  {
    id: "paithani",
    slug: "paithani",
    name: "Paithani Saree",
    region: "Yeola & Paithan, Maharashtra",
    tag: "Peacock Pallu",
    desc: "Aristocratic handloom silk featuring kaleidoscopic peacocks (Mor) and parrot motifs against brilliant gold tissue borders.",
    image: "images/categories/paithani.jpg",
    filterType: "Paithani"
  },
  {
    id: "mysore-silk",
    slug: "mysore-silk",
    name: "Mysore Silk Saree",
    region: "Mysuru, Karnataka",
    tag: "Royal Crepe Silk",
    desc: "Unmatched buttery drape crafted from 100% pure natural silk threads with certified 24-karat tested gold zari edging.",
    image: "images/categories/mysore-silk.jpg",
    filterType: "Mysore Silk"
  },
  {
    id: "chanderi",
    slug: "chanderi",
    name: "Chanderi Saree",
    region: "Chanderi, Madhya Pradesh",
    tag: "Gossamer Handloom",
    desc: "Lightweight sheer texture woven from silk warp and fine cotton weft, adorned with delicate traditional floral booties.",
    image: "images/categories/chanderi.jpg",
    filterType: "Chanderi"
  },
  {
    id: "tussar",
    slug: "tussar",
    name: "Tussar Saree",
    region: "Bhagalpur, Bihar & Jharkhand",
    tag: "Wild Forest Silk",
    desc: "Rich earthy gold sheen woven from wild silk cocoons, renowned for breathable comfort and organic texture.",
    image: "images/categories/tussar.jpg",
    filterType: "Tussar"
  },
  {
    id: "gadwal",
    slug: "gadwal",
    name: "Gadwal Saree",
    region: "Gadwal, Telangana",
    tag: "Kuta Interlocked",
    desc: "Distinguished by a lightweight unbleached cotton body skillfully interlocked with a contrast heavy pure silk zari border.",
    image: "images/categories/gadwal.jpg",
    filterType: "Gadwal"
  },
  {
    id: "pochampally",
    slug: "pochampally",
    name: "Pochampally Saree",
    region: "Bhoodan Pochampally, Telangana",
    tag: "Double Ikat Weave",
    desc: "Iconic geometric precision handwoven using tie-dye resist techniques on pure natural silk and mercerized cotton.",
    image: "images/categories/pochampally.jpg",
    filterType: "Pochampally"
  },
  {
    id: "uppada",
    slug: "uppada",
    name: "Uppada Saree",
    region: "East Godavari, Andhra Pradesh",
    tag: "Jamdani Craft",
    desc: "Featherlight Jamdani weave creating translucent drapery where delicate zari motifs seem to float across gossamer silk.",
    image: "images/categories/uppada.jpg",
    filterType: "Uppada"
  },
  {
    id: "assam-muga",
    slug: "assam-muga",
    name: "Assam / Muga Silk Saree",
    region: "Sualkuchi, Assam",
    tag: "Golden Heritage Silk",
    desc: "Naturally glossy golden wild silk woven with traditional geometric Japi and floral mekhala-inspired red accents.",
    image: "images/categories/assam-muga.jpg",
    filterType: "Muga Silk"
  },
  {
    id: "patola",
    slug: "patola",
    name: "Patola Saree",
    region: "Patan, Gujarat",
    tag: "Double Ikat Masterpiece",
    desc: "Revered heirloom drape taking months to weave, featuring identical jewel-toned geometric patterns on both front and reverse.",
    image: "images/categories/patola.jpg",
    filterType: "Patola"
  },
  {
    id: "bandhani",
    slug: "bandhani",
    name: "Bandhani Saree",
    region: "Kutch & Jamnagar, Gujarat",
    tag: "Tie & Dye Heritage",
    desc: "Intricate microscopic hand-tied dots forming swirling Shikari and Gharchola patterns across vibrant crimson and yellow silks.",
    image: "images/categories/bandhani.jpg",
    filterType: "Bandhani"
  },
  {
    id: "leheriya",
    slug: "leheriya",
    name: "Leheriya Saree",
    region: "Jaipur, Rajasthan",
    tag: "Ripple Wave Dye",
    desc: "Celebratory diagonal wave patterns tie-dyed on fluid georgette and chiffon, reminiscent of monsoon wind currents.",
    image: "images/categories/leheriya.jpg",
    filterType: "Leheriya"
  },
  {
    id: "kalamkari",
    slug: "kalamkari",
    name: "Kalamkari Saree",
    region: "Srikalahasti, Andhra Pradesh",
    tag: "Pen-Art Handpainted",
    desc: "Mythological storytelling hand-drawn with bamboo pens using 100% natural vegetable dyes on pure organic cotton silk.",
    image: "images/categories/kalamkari.jpg",
    filterType: "Kalamkari"
  },
  {
    id: "ilkal",
    slug: "ilkal",
    name: "Ilkal Saree",
    region: "Bagalkot, Karnataka",
    tag: "Tope Teni Pallu",
    desc: "Historic daily-wear handloom featuring red and white chevron stripes (Tope Teni) joined seamlessly with Kasuti embroidery.",
    image: "images/categories/ilkal.jpg",
    filterType: "Ilkal"
  },
  {
    id: "chikankari",
    slug: "chikankari",
    name: "Chikankari Saree",
    region: "Lucknow, Uttar Pradesh",
    tag: "Shadow Needlework",
    desc: "Graceful white-on-pastel shadow needlework with Bakhiya and Phanda stitches floating over airy modal and georgette.",
    image: "images/categories/chikankari.jpg",
    filterType: "Chikankari"
  },
  {
    id: "bomkai",
    slug: "bomkai",
    name: "Bomkai Saree",
    region: "Ganjam, Odisha",
    tag: "Tribal Extra-Weft",
    desc: "Sacred temple weave with contrasting ikat borders and stylized mythological motifs of fish, peacocks, and temple lamps.",
    image: "images/categories/bomkai.jpg",
    filterType: "Bomkai"
  },
  {
    id: "phulkari",
    slug: "phulkari",
    name: "Phulkari Saree",
    region: "Punjab",
    tag: "Embroidered Florals",
    desc: "Darning-stitch embroidery using lustrous untwisted silk floss (pat) creating vibrant geometric flower gardens on rich fabric.",
    image: "images/categories/phulkari.jpg",
    filterType: "Phulkari"
  },
  {
    id: "nauvari",
    slug: "nauvari",
    name: "Nauvari Saree",
    region: "Maharashtra",
    tag: "9-Yard Royal Drape",
    desc: "The legendary nine-yard Maratha warrior drape woven with pure silk, celebrated for empowering movement and cultural poise.",
    image: "images/categories/nauvari.jpg",
    filterType: "Nauvari"
  },
  {
    id: "georgette",
    slug: "georgette",
    name: "Georgette Saree",
    region: "Contemporary Indian Weave",
    tag: "Fluid Modern Drape",
    desc: "Lightweight crinkled crepe fabric with graceful fluid fall, adorned with delicate sequins and contemporary border accents.",
    image: "images/categories/georgette.jpg",
    filterType: "Georgette"
  },
  {
    id: "chiffon",
    slug: "chiffon",
    name: "Chiffon Saree",
    region: "Contemporary Indian Weave",
    tag: "Featherlight Grace",
    desc: "Soft, floating sheer drape ideal for sunset soirées, summer festivities, and effortless day-to-evening elegance.",
    image: "images/categories/chiffon.jpg",
    filterType: "Chiffon"
  },
  {
    id: "cotton",
    slug: "cotton",
    name: "Cotton Saree",
    region: "Bengal & South India",
    tag: "Pure Breathable Comfort",
    desc: "Cool, organic handspun cotton sarees including Bengal Jamdani, Chettinad, and Mangalagiri drapes crafted for quiet luxury.",
    image: "images/categories/cotton.jpg",
    filterType: "Cotton"
  },
  {
    id: "crepe",
    slug: "crepe",
    name: "Crepe Saree",
    region: "Mysuru & Surat",
    tag: "Textured Silk Drape",
    desc: "Lustrous pebbled silk with naturally anti-crease durability, draped with refined gold lace borders and delicate accents.",
    image: "images/categories/crepe.jpg",
    filterType: "Crepe"
  },
  {
    id: "organza",
    slug: "organza",
    name: "Organza Saree",
    region: "Contemporary Couture",
    tag: "Translucent Sculptural Sheer",
    desc: "Crisp ethereal sheer fabric with hand-painted botanicals, scalloped cutwork borders, and soft romantic luster.",
    image: "images/categories/organza.jpg",
    filterType: "Organza"
  },
  {
    id: "net",
    slug: "net",
    name: "Net Saree",
    region: "Contemporary Eveningwear",
    tag: "Cocktail Glamour",
    desc: "Delicate fine mesh saree embellished with shimmering self-thread embroidery, pearls, and tonal crystal work.",
    image: "images/categories/net.jpg",
    filterType: "Net"
  },
  {
    id: "ready-to-wear",
    slug: "ready-to-wear",
    name: "Ready-to-Wear Saree",
    region: "Modern Innovation",
    tag: "Pre-Pleated 60-Second Drape",
    desc: "Ingeniously pre-stitched pleats and adjustable waistband delivering a flawless royal silhouette in under one minute.",
    image: "images/categories/ready-to-wear.jpg",
    filterType: "Ready-to-Wear"
  },
  {
    id: "handloom",
    slug: "handloom",
    name: "Handloom Saree",
    region: "Pan-India Artisan Clusters",
    tag: "Certified Authentic Weaves",
    desc: "100% artisan hand-woven drapes supporting traditional weaver guilds with authentic Handloom Mark & Silk Mark credentials.",
    image: "images/categories/handloom.jpg",
    filterType: "Handloom"
  }
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

// 12 Featured Saree Products for "TRENDING NOW"
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
      "images/saree_noor_1.jpg",
      "images/saree_noor_2.jpg",
      "images/categories/kanjivaram.jpg",
      "images/craftsmanship.jpg"
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
    tagline: "Rich Violet Pure Silk with Signature Peacock Tissue Pallu",
    price: 8999,
    compareAtPrice: 12499,
    discount: "28% OFF",
    badge: "Heritage",
    category: "Paithani",
    fabric: "Pure Yeola Silk",
    color: "Royal Violet",
    colorHex: "#4C2258",
    swatches: [
      { name: "Royal Violet", hex: "#4C2258", inStock: true },
      { name: "Peacock Blue", hex: "#184A6E", inStock: true },
      { name: "Sindoor Red", hex: "#8D1924", inStock: true }
    ],
    occasion: "Festive",
    rating: 5.0,
    reviewsCount: 24,
    stock: 7,
    images: [
      "images/saree_zoya_1.jpg",
      "images/saree_zoya_2.jpg",
      "images/categories/paithani.jpg",
      "images/coll_festive.jpg"
    ],
    description: "The pride of Maharashtra. Woven with pure natural silk and real gold zari tapestry, featuring the iconic kaleidoscopic peacock (Mor) motif across the expansive grand pallu.",
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter matching pure silk blouse fabric",
      weave: "Tapestry Handloom Weave",
      origin: "Yeola, Maharashtra",
      weight: "740 grams",
      zariType: "Tested Gold Zari Tissue",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done",
      care: "Strictly dry clean. Refold every 3 months."
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
      "images/saree_kavya_1.jpg",
      "images/categories/mysore-silk.jpg",
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
      "images/coll_festive.jpg",
      "images/saree_zoya_2.jpg",
      "images/craftsmanship.jpg"
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
      "images/saree_kavya_1.jpg",
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
  }
];

// Handloom Regions for "THE HANDLOOM EDIT"
const HANDLOOM_REGIONS = [
  { name: "Pochampally", state: "Telangana", weave: "Double Ikat Silk", image: "images/categories/pochampally.jpg" },
  { name: "Gadwal", state: "Telangana", weave: "Kuta Interlocked Silk", image: "images/categories/gadwal.jpg" },
  { name: "Uppada", state: "Andhra Pradesh", weave: "Fine Jamdani Cotton Silk", image: "images/categories/uppada.jpg" },
  { name: "Chanderi", state: "Madhya Pradesh", weave: "Gossamer Zari Weave", image: "images/categories/chanderi.jpg" },
  { name: "Paithani", state: "Maharashtra", weave: "Peacock Tapestry Silk", image: "images/categories/paithani.jpg" },
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
  getProductsByCategory: (cat) => SAREE_PRODUCTS.filter(p => p.category.toLowerCase() === cat.toLowerCase()),
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
  getNewArrivals: () => SAREE_PRODUCTS.slice(0, 6),
  getBestsellers: () => SAREE_PRODUCTS.filter(p => p.badge === 'Bestseller' || p.badge === 'Trending'),
  search: (query) => SareeCatalog.search(query)
};


const PALLUVO_PRODUCTS = SAREE_PRODUCTS;


