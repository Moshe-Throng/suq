/**
 * Shared translations for the Suq web storefront.
 * Add a new language by adding a key to TRANSLATIONS.
 */

export type Lang = "en" | "am";

export interface ShopStrings {
  login: string;
  share: string;
  service: string;
  services: string;
  item: string;
  items: string;
  searchProducts: string;
  searchServices: string;
  all: string;
  newest: string;
  priceAsc: string;
  priceDesc: string;
  noProductsYet: string;
  noServicesYet: string;
  checkBackSoon: string;
  noResults: string;
  clearFilters: string;
  soldOut: string;
  left: string;
  copyLink: string;
  copied: string;
  linkCopied: string;
  restock: string;
  markSoldOut: string;
  buy: string;
  inquire: string;
  book: string;
  moreOnSouk: string;
  browseAll: string;
  chat: string;
  call: string;
  browseMoreShops: string;
  createShopFree: string;
  viewFullPage: string;
  sendInquiry: string;
  buyNow: string;
  bookNow: string;
  getQuote: string;
  buyItem: string;
  bookService: string;
  yourName: string;
  phoneNumber: string;
  phoneSub: string;
  messageOptional: string;
  sending: string;
  sendOrder: string;
  inquirySent: string;
  sellerNotified: string;
  orMessageOn: string;
  loginViaTelegram: string;
  loginDesc: string;
  loginSetup: string;
  openTelegram: string;
  waitingConfirm: string;
  adminMode: string;
  add: string;
  settings: string;
  feedback: string;
  logout: string;
  shopNotFound: string;
  shopNotFoundDesc: string;
  found: string;
  on: string;
  contactPrice: string;
  startingFrom: string;
  birr: string;
  deleteConfirm: string;
  // Product form
  editProduct: string;
  addProduct: string;
  productName: string;
  fixedPrice: string;
  startingFromOption: string;
  contactForPrice: string;
  priceBirr: string;
  descriptionOptional: string;
  noTag: string;
  stockLabel: string;
  uploadingPhoto: string;
  tapToUpload: string;
  savingDots: string;
  saveChanges: string;
  // Feedback modal
  thankYou: string;
  weReadEvery: string;
  shareFeedback: string;
  whatToImprove: string;
  feedbackPlaceholder: string;
  sendFeedbackBtn: string;
  // TikTok
  followOnTiktok: string;
  watchVideo: string;
  tiktokVideo: string;
  shareForTiktok: string;
}

const TRANSLATIONS: Record<Lang, ShopStrings> = {
  en: {
    login: "Login",
    share: "Share",
    service: "service",
    services: "services",
    item: "item",
    items: "items",
    searchProducts: "Search products...",
    searchServices: "Search services...",
    all: "All",
    newest: "Newest",
    priceAsc: "Price ↑",
    priceDesc: "Price ↓",
    noProductsYet: "No products yet",
    noServicesYet: "No services yet",
    checkBackSoon: "Check back soon!",
    noResults: "No results found",
    clearFilters: "Clear filters",
    soldOut: "Sold out",
    left: "left",
    copyLink: "Copy Link",
    copied: "Copied!",
    linkCopied: "Link copied!",
    restock: "Restock",
    markSoldOut: "Mark Sold Out",
    buy: "Buy",
    inquire: "Inquire",
    book: "Book",
    moreOnSouk: "More on souk.et",
    browseAll: "Browse all →",
    chat: "Chat",
    call: "Call",
    browseMoreShops: "Browse more shops →",
    createShopFree: "Create your own shop — free →",
    viewFullPage: "View full page →",
    sendInquiry: "Send Inquiry",
    buyNow: "Buy Now",
    bookNow: "Book Now",
    getQuote: "Get a Quote",
    buyItem: "Buy Item",
    bookService: "Book Service",
    yourName: "Your name",
    phoneNumber: "Phone number",
    phoneSub: "So the seller can reach you back",
    messageOptional: "Message (optional)",
    sending: "Sending...",
    sendOrder: "Send Order",
    inquirySent: "Inquiry sent!",
    sellerNotified: "The seller will be notified on Telegram.",
    orMessageOn: "Or message directly on",
    loginViaTelegram: "Login via Telegram",
    loginDesc: "Click below to open Telegram and confirm your identity. Then come back here.",
    loginSetup: "Setting up login...",
    openTelegram: "Open Telegram",
    waitingConfirm: "Waiting for confirmation...",
    adminMode: "Admin Mode",
    add: "+ Add",
    settings: "Settings",
    feedback: "Feedback",
    logout: "Log out",
    shopNotFound: "Shop not found",
    shopNotFoundDesc: "This shop doesn't exist or has been removed.",
    found: "found",
    on: "on",
    contactPrice: "Contact for pricing",
    startingFrom: "Starting from",
    birr: "Birr",
    deleteConfirm: "Delete this product?",
    editProduct: "Edit Product",
    addProduct: "Add Product",
    productName: "Product name *",
    fixedPrice: "Fixed price",
    startingFromOption: "Starting from",
    contactForPrice: "Contact for price",
    priceBirr: "Price (Birr)",
    descriptionOptional: "Description (optional)",
    noTag: "No tag",
    stockLabel: "Stock",
    uploadingPhoto: "Uploading...",
    tapToUpload: "Tap to upload photo",
    savingDots: "Saving...",
    saveChanges: "Save Changes",
    thankYou: "Thank you!",
    weReadEvery: "We read every message.",
    shareFeedback: "Share Feedback",
    whatToImprove: "What should we improve?",
    feedbackPlaceholder: "What's working, what's not, or what would you like us to add?",
    sendFeedbackBtn: "Send Feedback",
    followOnTiktok: "Follow on TikTok",
    watchVideo: "Watch Video",
    tiktokVideo: "TikTok Video",
    shareForTiktok: "Copy for TikTok",
  },
  am: {
    login: "ግባ",
    share: "አጋራ",
    service: "አገልግሎት",
    services: "አገልግሎቶች",
    item: "ዕቃ",
    items: "ዕቃዎች",
    searchProducts: "ምርቶችን ይፈልጉ...",
    searchServices: "አገልግሎቶችን ይፈልጉ...",
    all: "ሁሉም",
    newest: "አዲስ",
    priceAsc: "ዋጋ ↑",
    priceDesc: "ዋጋ ↓",
    noProductsYet: "ገና ምርቶች የሉም",
    noServicesYet: "ገና አገልግሎቶች የሉም",
    checkBackSoon: "በቅርቡ ይመለሱ!",
    noResults: "ውጤት አልተገኘም",
    clearFilters: "ማጣሪያዎችን ያጥፉ",
    soldOut: "አልቋል",
    left: "ቀሪ",
    copyLink: "ሊንክ ቅዳ",
    copied: "ተቀድቷል!",
    linkCopied: "ሊንክ ተቀድቷል!",
    restock: "አከማች",
    markSoldOut: "አልቋል ምልክት አድርግ",
    buy: "ግዛ",
    inquire: "ጠይቅ",
    book: "ያስይዙ",
    moreOnSouk: "ተጨማሪ በ souk.et",
    browseAll: "ሁሉንም ይመልከቱ →",
    chat: "ቻት",
    call: "ደውል",
    browseMoreShops: "ተጨማሪ ሱቆችን ይመልከቱ →",
    createShopFree: "የራስዎን ሱቅ ይክፈቱ — ነፃ →",
    viewFullPage: "ሙሉ ገጽ ይመልከቱ →",
    sendInquiry: "ጥያቄ ላክ",
    buyNow: "አሁን ግዛ",
    bookNow: "አሁን ያስይዙ",
    getQuote: "ዋጋ ይጠይቁ",
    buyItem: "ዕቃ ግዛ",
    bookService: "አገልግሎት ያስይዙ",
    yourName: "ስምዎ",
    phoneNumber: "ስልክ ቁጥር",
    phoneSub: "ሻጩ እንዲያገኝዎት",
    messageOptional: "መልዕክት (አማራጭ)",
    sending: "በመላክ ላይ...",
    sendOrder: "ትዕዛዝ ላክ",
    inquirySent: "ጥያቄ ተልኳል!",
    sellerNotified: "ሻጩ በቴሌግራም ይነገራል።",
    orMessageOn: "ወይም በቀጥታ ይላኩ በ",
    loginViaTelegram: "በቴሌግራም ግባ",
    loginDesc: "ቴሌግራምን ለመክፈት ከዚህ በታች ይንኩ። ከዛ ወደዚህ ይመለሱ።",
    loginSetup: "ግቢ በማዘጋጀት ላይ...",
    openTelegram: "ቴሌግራም ክፈት",
    waitingConfirm: "ማረጋገጫ በመጠበቅ ላይ...",
    adminMode: "የአስተዳዳሪ ሁነታ",
    add: "+ ጨምር",
    settings: "ቅንብሮች",
    feedback: "አስተያየት",
    logout: "ውጣ",
    shopNotFound: "ሱቁ አልተገኘም",
    shopNotFoundDesc: "ይህ ሱቅ የለም ወይም ተወግዷል።",
    found: "ተገኝተዋል",
    on: "በ",
    contactPrice: "ለዋጋ ያግኙን",
    startingFrom: "ከ",
    birr: "ብር",
    deleteConfirm: "ይህን ምርት ይሰርዙ?",
    editProduct: "ምርት አስተካክል",
    addProduct: "ምርት ጨምር",
    productName: "የምርት ስም *",
    fixedPrice: "ቋሚ ዋጋ",
    startingFromOption: "ከ",
    contactForPrice: "ለዋጋ ያግኙን",
    priceBirr: "ዋጋ (ብር)",
    descriptionOptional: "መግለጫ (አማራጭ)",
    noTag: "ምድብ የለም",
    stockLabel: "ክምችት",
    uploadingPhoto: "በመስቀል ላይ...",
    tapToUpload: "ፎቶ ለመስቀል ይንኩ",
    savingDots: "በማስቀመጥ ላይ...",
    saveChanges: "ለውጦችን አስቀምጥ",
    thankYou: "አመሰግናለሁ!",
    weReadEvery: "ሁሉንም መልዕክት እናነባለን።",
    shareFeedback: "አስተያየት ያጋሩ",
    whatToImprove: "ምን እናሻሽል?",
    feedbackPlaceholder: "ምን እየሠራ ነው፣ ምን አይሠራም፣ ወይም ምን እንጨምር?",
    sendFeedbackBtn: "አስተያየት ላክ",
    followOnTiktok: "በTikTok ይከተሉ",
    watchVideo: "ቪዲዮ ይመልከቱ",
    tiktokVideo: "TikTok ቪዲዮ",
    shareForTiktok: "ለTikTok ቅዳ",
  },
};

export function getStrings(lang: string | null | undefined): ShopStrings {
  const key = (lang || "am") as Lang;
  return TRANSLATIONS[key] || TRANSLATIONS.am;
}

export function fmtPrice(price: number | null, pt: string | null, t: ShopStrings): string {
  if (pt === "contact" || price === null) return t.contactPrice;
  const f = price.toLocaleString();
  if (pt === "starting_from") return `${t.startingFrom} ${f} ${t.birr}`;
  return `${f} ${t.birr}`;
}
