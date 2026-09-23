/**
 * PALLUVO Luxury Saree Catalog
 * Contemporary Indian Fashion Brand — "Every drape, a little magic"
 */

const PALLUVO_PRODUCTS = [
  {
    id: "pal-001",
    slug: "noor-silk-saree",
    name: "Noor Silk Saree",
    tagline: "Pure Kanjivaram Mulberry Silk with Muted Champagne Zari",
    price: 4999,
    compareAtPrice: 6999,
    badge: "Bestseller",
    category: "Silk",
    collection: "Silk Stories",
    fabric: "Pure Kanjivaram Silk",
    color: "Emerald Green",
    colorHex: "#1C3B2E",
    swatches: [
      { name: "Emerald Green", hex: "#1C3B2E", inStock: true },
      { name: "Royal Wine", hex: "#4A1824", inStock: true },
      { name: "Muted Gold", hex: "#C5A880", inStock: true }
    ],
    occasion: "Wedding",
    mood: "Festive & Opulent",
    rating: 4.9,
    reviewsCount: 28,
    stock: 14,
    images: [
      "images/hero_campaign.jpg",
      "images/saree_noor_1.jpg",
      "images/saree_noor_2.jpg",
      "images/craftsmanship.jpg"
    ],
    description: "The Noor Silk Saree is an homage to timeless South Indian weaving heritage, reimagined with contemporary restraint. Woven from 100% pure mulberry silk, it features delicate matte champagne gold zari along the border and an understated geometric pallu designed for effortless draping.",
    highlights: [
      "Certified 100% Pure Mulberry Silk Mark",
      "Handwoven by master artisans in Kanchipuram",
      "Featherlight drape with rich, fluid fall",
      "Pre-finished with soft fall and edging pico"
    ],
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter unstitched matching silk fabric",
      weave: "Interlocking Kadiyal handloom weave",
      weight: "580 grams",
      borderZari: "Tested matte champagne gold zari",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done"
    },
    fabricCare: "Strictly dry clean only. Store draped in a breathable cotton muslin bag away from direct sunlight. Refold periodically along different lines.",
    blouseOptions: [
      { id: "unstitched", name: "Unstitched Matching Fabric (0.8m)", price: 0 },
      { id: "tailored-sleeveless", name: "Custom Tailored - Deep V-Neck Sleeveless", price: 1200 },
      { id: "tailored-elbow", name: "Custom Tailored - Classic Elbow Sleeve & Sweetheart Neck", price: 1200 },
      { id: "ready-padded", name: "Ready-to-Wear Premium Padded Corset Blouse", price: 1800 }
    ],
    featured: true,
    bestseller: true,
    newArrival: false
  },
  {
    id: "pal-002",
    slug: "meher-organza-saree",
    name: "Meher Organza Saree",
    tagline: "Hand-painted Botanical Florals on Sheer Silk Organza",
    price: 3899,
    compareAtPrice: 5299,
    badge: "New Arrival",
    category: "Organza",
    collection: "Contemporary Drapes",
    fabric: "Silk Organza",
    color: "Powder Blush",
    colorHex: "#E5B9BA",
    swatches: [
      { name: "Powder Blush", hex: "#E5B9BA", inStock: true },
      { name: "Mint Mist", hex: "#BDD5C4", inStock: true },
      { name: "Ivory Whisper", hex: "#F3ECE3", inStock: true }
    ],
    occasion: "Festive",
    mood: "Soft & Romantic",
    rating: 4.8,
    reviewsCount: 19,
    stock: 9,
    images: [
      "images/saree_meher_1.jpg",
      "images/saree_meher_2.jpg",
      "images/coll_contemp.jpg",
      "images/blog_1.jpg"
    ],
    description: "Whisper-light and ethereal, the Meher Saree captures feminine romance. Crafted from sheer woven silk organza, each piece features delicate hand-painted wild botanical motifs outlined with subtle scalloped resham embroidery along the border.",
    highlights: [
      "Sheer lightweight silk organza",
      "Hand-painted floral motifs with scallop detailing",
      "Breathable and fluid structure",
      "Perfect for sunset ceremonies and daytime celebrations"
    ],
    specifications: {
      length: "5.5 meters",
      width: "44 inches",
      blouseLength: "0.8 meter raw silk unstitched piece",
      weave: "Powerloom organza with artisanal hand painting",
      weight: "320 grams",
      borderZari: "Matte resham and micro cut-work",
      transparency: "Semi-sheer",
      fallPico: "Complimentary fall and pico edging done"
    },
    fabricCare: "Dry clean only. Do not wring or spray perfume directly on the hand-painted fabric. Use mild steam ironing on reverse.",
    blouseOptions: [
      { id: "unstitched", name: "Unstitched Matching Fabric (0.8m)", price: 0 },
      { id: "tailored-sleeveless", name: "Custom Tailored - Deep V-Neck Sleeveless", price: 1200 },
      { id: "tailored-elbow", name: "Custom Tailored - Classic Elbow Sleeve", price: 1200 },
      { id: "ready-padded", name: "Ready-to-Wear Premium Padded Corset Blouse", price: 1800 }
    ],
    featured: true,
    bestseller: false,
    newArrival: true
  },
  {
    id: "pal-003",
    slug: "aira-chanderi-saree",
    name: "Aira Chanderi Saree",
    tagline: "Handwoven Chanderi Cotton-Silk with Muted Ashrafi Bootis",
    price: 4299,
    compareAtPrice: 5899,
    badge: "Staff Pick",
    category: "Chanderi",
    collection: "Everyday Elegance",
    fabric: "Chanderi Silk Cotton",
    color: "Champagne Sand",
    colorHex: "#D8C7B0",
    swatches: [
      { name: "Champagne Sand", hex: "#D8C7B0", inStock: true },
      { name: "Sage Mist", hex: "#9EADA0", inStock: true },
      { name: "Dusty Charcoal", hex: "#4A4542", inStock: true }
    ],
    occasion: "Everyday",
    mood: "Minimal & Modern",
    rating: 4.9,
    reviewsCount: 34,
    stock: 18,
    images: [
      "images/saree_aira_1.jpg",
      "images/saree_aira_2.jpg",
      "images/coll_everyday.jpg",
      "images/craftsmanship.jpg"
    ],
    description: "The Aira Chanderi Saree embodies quiet luxury. Spun from a feather-soft blend of fine silk and organic cotton, it balances breathable comfort with an alluring subtle sheen. Finished with microscopic ashrafi gold coin motifs woven directly on handlooms in Madhya Pradesh.",
    highlights: [
      "Authentic GI-tagged Chanderi handloom weave",
      "Silk-cotton blend suited for day-long wearing",
      "Antiqued gold zari mini motifs",
      "Sophisticated minimal neutral palette"
    ],
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter matching Chanderi cotton-silk fabric",
      weave: "Traditional pit loom handloom",
      weight: "390 grams",
      borderZari: "Matte antique gold zari",
      transparency: "Subtle translucent",
      fallPico: "Complimentary fall and pico edging done"
    },
    fabricCare: "Gentle dry clean recommended. Can be hand washed separately in cold water with mild silk detergent after 3rd wear.",
    blouseOptions: [
      { id: "unstitched", name: "Unstitched Matching Fabric (0.8m)", price: 0 },
      { id: "tailored-sleeveless", name: "Custom Tailored - High Neck Cutaway", price: 1200 },
      { id: "tailored-elbow", name: "Custom Tailored - Three-Quarter Classic", price: 1200 },
      { id: "ready-padded", name: "Ready-to-Wear Padded Blouse", price: 1800 }
    ],
    featured: true,
    bestseller: true,
    newArrival: false
  },
  {
    id: "pal-004",
    slug: "zoya-tissue-saree",
    name: "Zoya Tissue Saree",
    tagline: "Liquid Gold Metallic Sheen with Minimalist Pleat Texture",
    price: 5499,
    compareAtPrice: 7499,
    badge: "Trending",
    category: "Tissue",
    collection: "Wedding Edit",
    fabric: "Metallic Tissue Silk",
    color: "Liquid Gold",
    colorHex: "#C9AA74",
    swatches: [
      { name: "Liquid Gold", hex: "#C9AA74", inStock: true },
      { name: "Rose Gold Sheen", hex: "#C98E84", inStock: true },
      { name: "Silver Moonlight", hex: "#C5CCD0", inStock: true }
    ],
    occasion: "Wedding",
    mood: "Festive & Opulent",
    rating: 5.0,
    reviewsCount: 42,
    stock: 7,
    images: [
      "images/saree_zoya_1.jpg",
      "images/saree_zoya_2.jpg",
      "images/coll_wedding.jpg",
      "images/insta_2.jpg"
    ],
    description: "A showstopper designed for momentous evenings. The Zoya Tissue Saree is woven with ultra-fine metallic silk threads that shimmer gracefully under candlelight without ever feeling stiff or scratchy. Drapes like a liquid cascade.",
    highlights: [
      "Ultra-soft fine tissue silk weave",
      "Luminous light-catching metallic luster",
      "Clean borderless contemporary finish",
      "Editorial favorite for destination cocktail events"
    ],
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.85 meter brocade tissue silk fabric",
      weave: "Fine zari weft and silk warp",
      weight: "480 grams",
      borderZari: "Seamless micro piped border",
      transparency: "Opaque when draped",
      fallPico: "Complimentary fall and pico edging done"
    },
    fabricCare: "Strictly professional dry clean. Do not spray moisture or perfumes directly. Store rolled or flat.",
    blouseOptions: [
      { id: "unstitched", name: "Unstitched Matching Fabric (0.85m)", price: 0 },
      { id: "tailored-sleeveless", name: "Custom Tailored - Minimalist Bralette Blouse", price: 1400 },
      { id: "tailored-elbow", name: "Custom Tailored - Square Neck Blouse", price: 1200 },
      { id: "ready-padded", name: "Ready-to-Wear Premium Padded Corset", price: 1800 }
    ],
    featured: true,
    bestseller: true,
    newArrival: false
  },
  {
    id: "pal-005",
    slug: "ira-handloom-saree",
    name: "Ira Handloom Saree",
    tagline: "Organic Handspun Linen-Silk with Earthy Selvedge Contrast",
    price: 3699,
    compareAtPrice: 4999,
    badge: "Artisanal",
    category: "Handloom",
    collection: "Everyday Elegance",
    fabric: "Handloom Linen-Silk",
    color: "Olive Sage",
    colorHex: "#6B7559",
    swatches: [
      { name: "Olive Sage", hex: "#6B7559", inStock: true },
      { name: "Terracotta Earth", hex: "#A8533F", inStock: true },
      { name: "Natural Ecru", hex: "#EDE7DC", inStock: true }
    ],
    occasion: "Everyday",
    mood: "Minimal & Modern",
    rating: 4.7,
    reviewsCount: 16,
    stock: 12,
    images: [
      "images/saree_ira_1.jpg",
      "images/saree_ira_2.jpg",
      "images/coll_everyday.jpg",
      "images/blog_3.jpg"
    ],
    description: "Designed for the woman who appreciates tactile simplicity. Spun on village handlooms from organic natural linen infused with fine mulberry silk warp for a graceful drape that softens uniquely with every single wash.",
    highlights: [
      "100% natural organic handloom yarn",
      "Contrasting woven selvedge detail",
      "Crinkle-resistant linen-silk blend",
      "Effortless office-to-dinner transition"
    ],
    specifications: {
      length: "5.5 meters",
      width: "46 inches",
      blouseLength: "0.8 meter matching handloom fabric",
      weave: "Charkha-spun handloom weave",
      weight: "440 grams",
      borderZari: "Natural yarn selvedge, no metal",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done"
    },
    fabricCare: "Hand wash gently in cold water with mild eco-detergent or dry clean. Hang dry in shade. Light steam iron.",
    blouseOptions: [
      { id: "unstitched", name: "Unstitched Matching Fabric (0.8m)", price: 0 },
      { id: "tailored-sleeveless", name: "Custom Tailored - High Neck Collar Blouse", price: 1200 },
      { id: "ready-padded", name: "Ready-to-Wear Linen Padded Blouse", price: 1800 }
    ],
    featured: false,
    bestseller: false,
    newArrival: true
  },
  {
    id: "pal-006",
    slug: "ruhani-silk-saree",
    name: "Ruhani Silk Saree",
    tagline: "Varanasi Kadwa Weave in Royal Wine with Antique Silver & Gold",
    price: 6299,
    compareAtPrice: 8999,
    badge: "Heritage",
    category: "Silk",
    collection: "Festive Edit",
    fabric: "Banarasi Mulberry Silk",
    color: "Deep Wine",
    colorHex: "#4C1425",
    swatches: [
      { name: "Deep Wine", hex: "#4C1425", inStock: true },
      { name: "Peacock Teal", hex: "#16424E", inStock: true },
      { name: "Midnight Black", hex: "#19181B", inStock: true }
    ],
    occasion: "Festive",
    mood: "Bold & Beautiful",
    rating: 4.9,
    reviewsCount: 31,
    stock: 5,
    images: [
      "images/saree_ruhani_1.jpg",
      "images/saree_ruhani_2.jpg",
      "images/coll_festive.jpg",
      "images/craftsmanship.jpg"
    ],
    description: "An heirloom-grade masterpiece woven in Varanasi using the famed Kadwa technique, where each individual floral buta is etched by hand on the loom without loose threads behind. Dyed in a rich royal wine hue that glows under warm ambient lighting.",
    highlights: [
      "Authentic Varanasi Kadwa handloom technique",
      "Dual tone Sona-Rupa (Gold & Silver) zari work",
      "Heirloom piece to be cherished across generations",
      "Luxurious drape that holds pleats crisply"
    ],
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "1 meter matching brocade silk fabric",
      weave: "Kadwa handloom jaal",
      weight: "650 grams",
      borderZari: "Heritage Sona-Rupa antique zari",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done"
    },
    fabricCare: "Strictly dry clean only. Wrap in soft cotton or mull fabric. Air out in shade once every six months.",
    blouseOptions: [
      { id: "unstitched", name: "Unstitched Matching Fabric (1.0m)", price: 0 },
      { id: "tailored-elbow", name: "Custom Tailored - Deep Scoop Back with Tassels", price: 1400 },
      { id: "ready-padded", name: "Ready-to-Wear Premium Brocade Blouse", price: 1900 }
    ],
    featured: true,
    bestseller: true,
    newArrival: false
  },
  {
    id: "pal-007",
    slug: "tara-georgette-saree",
    name: "Tara Georgette Saree",
    tagline: "Fine Viscose Georgette with Delicate Tonal Chikankari & Mukaish",
    price: 4499,
    compareAtPrice: 5999,
    badge: "Editorial Pick",
    category: "Georgette",
    collection: "Contemporary Drapes",
    fabric: "Viscose Georgette",
    color: "Lilac Haze",
    colorHex: "#B8A7BD",
    swatches: [
      { name: "Lilac Haze", hex: "#B8A7BD", inStock: true },
      { name: "Sky Dew", hex: "#ADC1CF", inStock: true },
      { name: "Cream Pearl", hex: "#F3EFE6", inStock: true }
    ],
    occasion: "Festive",
    mood: "Soft & Romantic",
    rating: 4.8,
    reviewsCount: 22,
    stock: 11,
    images: [
      "images/saree_tara_1.jpg",
      "images/saree_meher_1.jpg",
      "images/coll_contemp.jpg",
      "images/insta_5.jpg"
    ],
    description: "Like a gentle mist, the Tara Saree drapes like water over the body. Crafted in pure viscose georgette, it is embroidered with tonal Lucknowi shadow work and peppered with micro-mukaish metal dots that catch the light like stars.",
    highlights: [
      "Fluid 60-gram pure viscose georgette",
      "Artisanal tonal Chikankari embroidery",
      "Embedded delicate mukaish metal work",
      "Figure-flattering drape that requires zero pinning"
    ],
    specifications: {
      length: "5.5 meters",
      width: "44 inches",
      blouseLength: "0.8 meter matching embroidered fabric",
      weave: "Crepe georgette with hand embroidery",
      weight: "420 grams",
      borderZari: "Scalloped thread embroidery",
      transparency: "Semi-translucent",
      fallPico: "Complimentary fall and pico edging done"
    },
    fabricCare: "Dry clean only. Gentle steam pressing.",
    blouseOptions: [
      { id: "unstitched", name: "Unstitched Matching Fabric (0.8m)", price: 0 },
      { id: "tailored-sleeveless", name: "Custom Tailored - Sweetheart Sleeveless", price: 1200 },
      { id: "ready-padded", name: "Ready-to-Wear Padded Blouse", price: 1800 }
    ],
    featured: false,
    bestseller: false,
    newArrival: true
  },
  {
    id: "pal-008",
    slug: "kavya-tussar-silk-saree",
    name: "Kavya Tussar Silk Saree",
    tagline: "Wild Tussar Silk with Earthy Handblock Kalamkari Details",
    price: 5199,
    compareAtPrice: 6899,
    badge: "Craft Heritage",
    category: "Silk",
    collection: "Silk Stories",
    fabric: "Pure Tussar Silk",
    color: "Ochre Mustard",
    colorHex: "#C19245",
    swatches: [
      { name: "Ochre Mustard", hex: "#C19245", inStock: true },
      { name: "Indigo Charcoal", hex: "#2C3949", inStock: true }
    ],
    occasion: "Everyday",
    mood: "Bold & Beautiful",
    rating: 4.9,
    reviewsCount: 18,
    stock: 8,
    images: [
      "images/saree_kavya_1.jpg",
      "images/saree_noor_2.jpg",
      "images/craftsmanship.jpg",
      "images/insta_3.jpg"
    ],
    description: "Celebrated for its coarse natural texture and rich organic gold sheen, the Kavya Saree is woven from wild tussar silk farmed sustainably in Eastern India. Features hand-carved teakwood block prints dyed with natural vegetable pigments.",
    highlights: [
      "100% authentic wild forest Tussar silk",
      "Natural block printing using vegetable dyes",
      "Distinctive textured raw silk touch",
      "Breathable yet rich thermal comfort"
    ],
    specifications: {
      length: "5.5 meters",
      width: "45 inches",
      blouseLength: "0.8 meter contrasting raw tussar piece",
      weave: "Handwoven wild tussar",
      weight: "510 grams",
      borderZari: "Ganga-Jamuna contrasting selvedge",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done"
    },
    fabricCare: "Dry clean only. Store wrapped in undyed muslin cloth.",
    blouseOptions: [
      { id: "unstitched", name: "Unstitched Matching Fabric (0.8m)", price: 0 },
      { id: "tailored-elbow", name: "Custom Tailored - Boat Neck 3/4 Sleeve", price: 1200 },
      { id: "ready-padded", name: "Ready-to-Wear Padded Blouse", price: 1800 }
    ],
    featured: false,
    bestseller: false,
    newArrival: false
  },
  {
    id: "pal-009",
    slug: "sitara-sequin-saree",
    name: "Sitara Sequin Saree",
    tagline: "Midnight Peacock Blue Drape with Hand-Strung Micro Sequins",
    price: 5899,
    compareAtPrice: 7999,
    badge: "Trending",
    category: "Georgette",
    collection: "Festive Edit",
    fabric: "Crepe Georgette",
    color: "Midnight Peacock",
    colorHex: "#102F3F",
    swatches: [
      { name: "Midnight Peacock", hex: "#102F3F", inStock: true },
      { name: "Champagne Nude", hex: "#D6C2A9", inStock: true },
      { name: "Raven Black", hex: "#151515", inStock: true }
    ],
    occasion: "Party",
    mood: "Bold & Beautiful",
    rating: 5.0,
    reviewsCount: 37,
    stock: 6,
    images: [
      "images/saree_sitara_1.jpg",
      "images/saree_zoya_2.jpg",
      "images/coll_festive.jpg",
      "images/insta_1.jpg"
    ],
    description: "Designed for nocturnal glamour. The Sitara Saree features thousands of matte micro-sequins meticulously hand-strung onto fluid Japanese crepe georgette. Reflects subtle glimmer rather than loud sparkle, embodying understated opulence.",
    highlights: [
      "Matte mini sequins that catch low light gracefully",
      "Fluid crepe georgette base with effortless pleats",
      "Zero snagging on jewellery",
      "The ultimate Sangeet & Reception showstopper"
    ],
    specifications: {
      length: "5.5 meters",
      width: "44 inches",
      blouseLength: "0.8 meter matching sequin work fabric",
      weave: "Micro-sequin embellishment on crepe",
      weight: "590 grams",
      borderZari: "Matte satin piped border",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done"
    },
    fabricCare: "Strictly dry clean. Hang carefully on padded hanger to avoid friction.",
    blouseOptions: [
      { id: "unstitched", name: "Unstitched Matching Fabric (0.8m)", price: 0 },
      { id: "tailored-sleeveless", name: "Custom Tailored - Infinity Cut Bralette", price: 1400 },
      { id: "ready-padded", name: "Ready-to-Wear Sequin Padded Blouse", price: 1900 }
    ],
    featured: true,
    bestseller: true,
    newArrival: false
  },
  {
    id: "pal-010",
    slug: "ananya-bandhani-saree",
    name: "Ananya Bandhani Saree",
    tagline: "Authentic Gujarati Bandhej on Pure Gajji Silk with Zari Border",
    price: 4799,
    compareAtPrice: 6499,
    badge: "Artisanal",
    category: "Silk",
    collection: "Festive Edit",
    fabric: "Pure Gajji Silk",
    color: "Coral Vermilion",
    colorHex: "#B83A2C",
    swatches: [
      { name: "Coral Vermilion", hex: "#B83A2C", inStock: true },
      { name: "Mustard Gold", hex: "#BA8C37", inStock: true }
    ],
    occasion: "Festive",
    mood: "Festive & Opulent",
    rating: 4.8,
    reviewsCount: 25,
    stock: 10,
    images: [
      "images/saree_ananya_1.jpg",
      "images/saree_aira_1.jpg",
      "images/coll_silk.jpg",
      "images/craftsmanship.jpg"
    ],
    description: "Every single dot on the Ananya Saree has been pinched and tied by hand by women artisans in Bhuj, Gujarat. Hand-dyed on thick, lustrous Gajji silk that feels velvety against the skin and frames traditional heritage in a modern silhouette.",
    highlights: [
      "Authentic Khatri hand-tied Bandhej dots",
      "Heavy pure Gajji silk with rich satin sheen",
      "Traditional red & rust auspicious hues",
      "Woven Banarasi gold zari lagdi patta border"
    ],
    specifications: {
      length: "5.5 meters",
      width: "44 inches",
      blouseLength: "0.8 meter matching Bandhani Gajji piece",
      weave: "Hand-tie-dye on handloom Gajji silk",
      weight: "560 grams",
      borderZari: "Pure Banarasi woven zari",
      transparency: "Opaque",
      fallPico: "Complimentary fall and pico edging done"
    },
    fabricCare: "Strictly dry clean. Iron with light roll press to preserve the iconic raised Bandhej texture.",
    blouseOptions: [
      { id: "unstitched", name: "Unstitched Matching Fabric (0.8m)", price: 0 },
      { id: "tailored-elbow", name: "Custom Tailored - Sweetheart Neck Blouse", price: 1200 },
      { id: "ready-padded", name: "Ready-to-Wear Premium Blouse", price: 1800 }
    ],
    featured: false,
    bestseller: false,
    newArrival: false
  }
];

// Helper functions for catalog queries
const ProductsCatalog = {
  getAll: () => PALLUVO_PRODUCTS,
  getById: (id) => PALLUVO_PRODUCTS.find(p => p.id === id || p.slug === id),
  getBySlug: (slug) => PALLUVO_PRODUCTS.find(p => p.slug === slug || p.id === slug),
  getBestsellers: () => PALLUVO_PRODUCTS.filter(p => p.bestseller),
  getNewArrivals: () => PALLUVO_PRODUCTS.filter(p => p.newArrival || p.featured).slice(0, 6),
  getByCollection: (colName) => PALLUVO_PRODUCTS.filter(p => p.collection.toLowerCase().includes(colName.toLowerCase())),
  getByCategory: (category) => category === "All" ? PALLUVO_PRODUCTS : PALLUVO_PRODUCTS.filter(p => p.category === category),
  getByMood: (mood) => PALLUVO_PRODUCTS.filter(p => p.mood.toLowerCase() === mood.toLowerCase()),
  search: (query) => {
    if (!query || query.trim() === "") return [];
    const q = query.toLowerCase().trim();
    return PALLUVO_PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.fabric.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.collection.toLowerCase().includes(q) ||
      p.occasion.toLowerCase().includes(q) ||
      p.color.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q)
    );
  }
};
