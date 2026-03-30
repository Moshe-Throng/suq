"""English strings for Suq bot."""

# ══════════════════════════════════════════════════════════════
# WELCOME & ONBOARDING
# ══════════════════════════════════════════════════════════════

LANG_PROMPT = "Choose your language:"
LANG_CHANGED = "Language set to English"

WELCOME = (
    "🏪 Welcome to Souk.et!\n\n"
    "Turn your Telegram into a beautiful shop — free.\n\n"
    "What type of business are you?"
)

# Legacy (kept for backward compat)
ASK_ROLE = "What would you like to do?"
BTN_SELLER = "I'm a Seller"
BTN_BUYER = "I'm a Buyer"

# ══════════════════════════════════════════════════════════════
# BUSINESS TYPE
# ══════════════════════════════════════════════════════════════

ASK_SHOP_TYPE = "What type of business are you?"
BTN_TYPE_PRODUCT = "🛍 I sell products"
BTN_TYPE_SERVICE = "💼 I offer services"

# ══════════════════════════════════════════════════════════════
# CATEGORIES
# ══════════════════════════════════════════════════════════════

ASK_CATEGORY = "Pick your category:"

# Product categories
CAT_FOOD = "Food & Bakery"
CAT_FASHION = "Fashion & Clothing"
CAT_ELECTRONICS = "Electronics"
CAT_BEAUTY = "Beauty & Cosmetics"
CAT_HANDMADE = "Handmade & Crafts"
CAT_COFFEE = "Coffee & Spices"
CAT_HOME = "Home & Furniture"
CAT_OTHER = "Other"

# Service categories
CAT_SALON = "Beauty & Salon"
CAT_PHOTO = "Photography & Video"
CAT_TUTORING = "Tutoring & Education"
CAT_DESIGN = "Design & Creative"
CAT_REPAIR = "Repair & Technical"
CAT_FITNESS = "Health & Fitness"
CAT_EVENTS = "Events & Catering"
# CAT_OTHER shared with products

# ══════════════════════════════════════════════════════════════
# COLOR PICKER (replaces named template styles)
# ══════════════════════════════════════════════════════════════

ASK_COLOR = "🎨 Pick your brand color:"

# Legacy (kept for backward compat)
ASK_TEMPLATE = "Pick a style for your shop and images:"
TMPL_CLEAN = "✨ Clean"
TMPL_BOLD = "⚡ Bold"
TMPL_ETHIOPIAN = "🇪🇹 Ethiopian"
TMPL_FRESH = "🌿 Fresh"
TMPL_MINIMAL = "◻️ Minimal"
TMPL_WARM = "🌅 Warm"

# ══════════════════════════════════════════════════════════════
# LOCATION
# ══════════════════════════════════════════════════════════════

ASK_LOCATION = "📍 Where is your shop? (optional — tap an area or skip)"
BTN_LOCATION_SKIP = "⏭ Skip"
LOCATION_UPDATED = "📍 Location updated!"

# ══════════════════════════════════════════════════════════════
# SHOP SETUP
# ══════════════════════════════════════════════════════════════

ASK_SHOP_NAME = "What's your business name?"
ASK_THEME_COLOR = "Pick a color theme for your shop:"  # legacy
SHOP_NAME_TAKEN = "That name is already taken. Try another one."
SHOP_NAME_INVALID = "Shop name must be 2-30 characters, letters and numbers only."
SHOP_CREATED = "Your shop \"{name}\" is ready!\n\nYour catalog link:\n{link}\n\nNow send me a photo to add your first {item_type}."
SHOP_CREATED_PRODUCT = "product"
SHOP_CREATED_SERVICE = "service"
SHOP_EXISTS = "You already have a shop: \"{name}\"\n\nCatalog: {link}"

# ══════════════════════════════════════════════════════════════
# PRODUCTS
# ══════════════════════════════════════════════════════════════

ASK_PRODUCT_PHOTO = "Send a photo of your product."
ASK_PRODUCT_NAME = "What's the product name?"
ASK_PRODUCT_PRICE = "Price in Birr? (numbers only)"
PRICE_INVALID = "Please enter a valid number for the price."
ASK_PRODUCT_DESC = "Short description (optional — send /skip to skip)."
PRODUCT_SAVED = "✨ \"{name}\" added! ({price_display})\n\nGenerating marketing images..."
PRODUCT_IMAGES_READY = "📸 4 images ready for \"{name}\"!\n\nSave them and share on your channels.\nAdd another? Just send a photo."
NO_PRODUCTS = "You have no products yet. Use /add to add one."
PRODUCT_DELETED = "Product \"{name}\" deleted."
PRODUCT_LIST_HEADER = "Your products:"

# ══════════════════════════════════════════════════════════════
# SERVICES
# ══════════════════════════════════════════════════════════════

ASK_SERVICE_PHOTO = "Send a photo that shows your work — a portfolio shot, a before/after, or your workspace."
ASK_SERVICE_NAME = "What's the service name?"
ASK_SERVICE_PRICE = "Starting price in Birr? (numbers only)"
ASK_SERVICE_DESC = "Short description of the service (optional — send /skip to skip)."
NO_SERVICES = "You have no services yet. Use /add to add one."
SERVICE_DELETED = "Service \"{name}\" deleted."
SERVICE_LIST_HEADER = "Your services:"

# ══════════════════════════════════════════════════════════════
# PRICE TYPE
# ══════════════════════════════════════════════════════════════

ASK_PRICE_TYPE = "How is this priced?"
BTN_PRICE_FIXED = "💰 Fixed Price"
BTN_PRICE_STARTING = "📊 Starting From"
BTN_PRICE_CONTACT = "💬 Contact for Pricing"

PRICE_DISPLAY_FIXED = "{price} Birr"
PRICE_DISPLAY_STARTING = "Starting from {price} Birr"
PRICE_DISPLAY_CONTACT = "Contact for pricing"

# ══════════════════════════════════════════════════════════════
# ORDERS
# ══════════════════════════════════════════════════════════════

NEW_ORDER = "New order!\n\n{product} — {qty}x\nFrom: {buyer}\n{note}"
ORDER_ACCEPTED = "Order accepted. Buyer has been notified."
ORDER_REJECTED = "Order rejected."
ORDER_COMPLETED = "Order completed!"
NO_ORDERS = "No open orders."
ORDER_LIST_HEADER = "Open orders:"
BUYER_ORDER_ACCEPTED = "Your order for \"{product}\" has been accepted by the seller!"
BUYER_ORDER_REJECTED = "Your order for \"{product}\" was declined by the seller."
BUYER_ORDER_COMPLETED = "Your order for \"{product}\" is complete!"

# ══════════════════════════════════════════════════════════════
# BUYER FLOW
# ══════════════════════════════════════════════════════════════

BUYER_WELCOME = "Welcome to Souk.et!\n\nBrowse shops by visiting their catalog links, or search below."
BUYER_ORDER_PLACED = "Your order has been placed! The seller will be notified."
BUYER_ASK_NAME = "Your name for the order?"
BUYER_ASK_PHONE = "Phone number (optional — send /skip):"
BUYER_ASK_NOTE = "Any notes for the seller? (send /skip to skip)"

# ══════════════════════════════════════════════════════════════
# MENU & HELP
# ══════════════════════════════════════════════════════════════

BTN_ADD_PRODUCT = "Add Product"
BTN_ADD_SERVICE = "Add Service"
BTN_MY_PRODUCTS = "My Products"
BTN_MY_SERVICES = "My Services"
BTN_INQUIRIES = "Inquiries"
BTN_SHOP_LINK = "Shop Link"
BTN_SETTINGS = "Settings"

# Legacy
BTN_MY_ORDERS = "Orders"

HELP = (
    "Souk.et Commands:\n\n"
    "/start — Main menu\n"
    "/add — Add a product or service\n"
    "/products — View your items\n"
    "/orders — View inquiries\n"
    "/shop — Your shop link\n"
    "/language — Change language\n"
    "/help — This message"
)

# ══════════════════════════════════════════════════════════════
# ORDER BUTTONS
# ══════════════════════════════════════════════════════════════

BTN_ACCEPT = "✅ Accept"
BTN_REJECT = "❌ Reject"
BTN_COMPLETE = "✅ Complete"

# ══════════════════════════════════════════════════════════════
# INQUIRIES (new system replacing orders)
# ══════════════════════════════════════════════════════════════

NEW_INQUIRY = "📩 New inquiry!\n\n{item} — {price_display}\n👤 {buyer}{details}"
NO_INQUIRIES = "No new inquiries."
INQUIRY_LIST_HEADER = "New inquiries:"
BTN_MARK_SEEN = "✅ Mark as Seen"
INQUIRY_MARKED_SEEN = "Inquiry marked as seen."

# ══════════════════════════════════════════════════════════════
# SETTINGS
# ══════════════════════════════════════════════════════════════

BTN_SHARE_SHOP = "Share Shop"
SETTINGS_MENU = "What would you like to change?"
BTN_CHANGE_TEMPLATE = "Change Style"
BTN_CHANGE_COLOR = "Brand Color 🎨"
BTN_CHANGE_LOCATION = "Location 📍"
BTN_CHANGE_CATEGORY = "Change Category"
BTN_CHANGE_TYPE = "Change Type"
BTN_EDIT_DESC = "Edit Description"
BTN_CHANGE_LOGO = "Change Logo"
BTN_BACK_MENU = "Back to Menu"
TEMPLATE_UPDATED = "Template style updated!"
COLOR_UPDATED = "Brand color updated!"
CATEGORY_UPDATED = "Category updated!"
TYPE_UPDATED = "Business type updated!"

# Legacy
BTN_CHANGE_THEME = "Change Theme"

ASK_DESCRIPTION = "Send a short description or tagline for your shop (max 120 chars).\n\nSend /skip to remove it."
DESC_SAVED = "Description updated!"
DESC_INVALID = "Description must be under 120 characters."
DESC_REMOVED = "Description removed."

ASK_LOGO = "Send a photo for your shop logo.\n\nSend /skip to remove it."
LOGO_SAVED = "Logo updated!"
LOGO_REMOVED = "Logo removed."

THEME_UPDATED = "Theme color updated!"  # legacy

SHARE_CARD_CAPTION = "Share this with your buyers and on social media!"

BTN_MANAGE_WEB = "🌐 Manage on Web"

# ══════════════════════════════════════════════════════════════
# TIKTOK
# ══════════════════════════════════════════════════════════════

ASK_TIKTOK = "🎬 Send your TikTok profile URL (e.g. https://www.tiktok.com/@yourshop).\n\nSend /skip to remove it."
BTN_CHANGE_TIKTOK = "TikTok 🎬"
TIKTOK_SAVED = "🎬 TikTok link updated!"
TIKTOK_REMOVED = "TikTok link removed."
TIKTOK_INVALID = "Please send a valid TikTok URL (must start with https://tiktok.com/ or https://www.tiktok.com/)."
TIKTOK_TOO_LONG = "TikTok URL is too long (max 255 characters)."
BTN_TIKTOK_BIO = "📋 Copy Link for TikTok Bio"
TIKTOK_BIO_TEXT = "🏪 {shop_name}\n🛍 Browse & order: {link}"
ASK_PRODUCT_TIKTOK = "🎬 TikTok video for this product? Send the URL or /skip."
PRODUCT_TIKTOK_SAVED = "🎬 TikTok video linked!"

# ══════════════════════════════════════════════════════════════
# DEEP LINK MESSAGES
# ══════════════════════════════════════════════════════════════

NO_SHOP_YET = "You don't have a shop yet. Use /start to create one first."
LOGIN_EXPIRED = "This login link has expired. Please try again from the website."
LOGIN_SUCCESS = "You're now logged in on the web!\n\n🏪 {name}"
PRODUCT_NOT_FOUND = "😕 Sorry, this product was not found or is no longer available."
SHOP_NOT_FOUND = "😕 Sorry, this shop is no longer available."
CONTACT_SELLER = "👤 Contact the seller directly:"
BTN_MESSAGE_SHOP = "💬 Message {name}"
NO_DIRECT_MSG = "ℹ️ This seller hasn't set up direct messaging yet."
BTN_VIEW_WEB = "🌐 View on souk.et"

# ══════════════════════════════════════════════════════════════
# LOCATION (area names + GPS)
# ══════════════════════════════════════════════════════════════

LOC_BOLE = "Bole"
LOC_MEGENAGNA = "Megenagna"
LOC_CMC = "CMC"
LOC_PIAZZA = "Piazza"
LOC_MERKATO = "Merkato"
LOC_KAZANCHIS = "Kazanchis"
LOC_SARBET = "Sarbet"
LOC_MEXICO = "Mexico"
LOC_4KILO = "4 Kilo"
LOC_DIREDAWA = "Dire Dawa"
LOC_BAHIRDAR = "Bahir Dar"
LOC_HAWASSA = "Hawassa"
LOC_MEKELLE = "Mekelle"
LOC_ADAMA = "Adama"
LOC_JIMMA = "Jimma"
LOC_GONDAR = "Gondar"
LOC_OTHER = "Other"

BTN_SHARE_LOCATION = "📍 Share GPS Location"
ASK_GPS_LOCATION = "📍 Send your shop's location using Telegram's location sharing.\n\nTap the 📎 icon → Location → send your pin.\n\nOr /skip to cancel."
GPS_LOCATION_SAVED = "📍 GPS location saved!"

# ══════════════════════════════════════════════════════════════
# MISC
# ══════════════════════════════════════════════════════════════

CANCELLED = "Cancelled."
ERROR = "Something went wrong. Please try again."
SKIP = "/skip"

# ══════════════════════════════════════════════════════════════
# STOCK
# ══════════════════════════════════════════════════════════════

ASK_STOCK = "📦 How many in stock? (type a number, or tap Unlimited)"
BTN_STOCK_UNLIMITED = "♾ Unlimited"

# ══════════════════════════════════════════════════════════════
# PRODUCT TAGS
# ══════════════════════════════════════════════════════════════

ASK_TAG = "🏷 Tag this product (helps buyers filter):"
BTN_TAG_SKIP = "⏭ Skip"

# ══════════════════════════════════════════════════════════════
# CATALOG COMMAND
# ══════════════════════════════════════════════════════════════

CATALOG_HEADER = "🏪 <b>{shop_name}</b>\n"
CATALOG_EMPTY = "No products to show yet. Use /add to add your first item."
CATALOG_FOOTER = "\n🔗 <b>Browse full catalog:</b>"
CATALOG_MORE = "...and {count} more"
CATALOG_VIEW_BTN = "🛍 View Full Catalog"

# ══════════════════════════════════════════════════════════════
# FLOW GUARD
# ══════════════════════════════════════════════════════════════

ALREADY_ADDING = "⚠️ You're already adding a listing. Complete the current step or /cancel to stop."
REMIND_PHOTO = "📸 Please send a photo to continue.\n\n(/cancel to stop)"

# ══════════════════════════════════════════════════════════════
# FEEDBACK
# ══════════════════════════════════════════════════════════════

FEEDBACK_PROMPT = "We'd love to hear your thoughts! What's working, what's not, or what would you like us to add?"
FEEDBACK_THANKS = "Thank you for your feedback! We read every message."
FEEDBACK_NUDGE = "How's your experience so far? Send /feedback anytime to share your thoughts."

# ══════════════════════════════════════════════════════════════
# FREE TIER LIMITS
# ══════════════════════════════════════════════════════════════

WAITLIST_MSG = "We're at capacity right now! We'll notify you when spots open up."
PRODUCT_LIMIT = "You've reached the free plan limit of {max} products. Remove some to add more."
FREE_PLAN_INFO = "Free plan: up to {max} products, free for 1 year."
PRODUCT_COUNT = "({count}/{max} products used)"

# ══════════════════════════════════════════════════════════════
# CHANNEL IMPORT
# ══════════════════════════════════════════════════════════════

BTN_IMPORT_CHANNEL = "Import from Channel"
ASK_CHANNEL_LINK = "Send your Telegram channel link or @username.\n\nWe'll import your products automatically.\n\nExample: @MyShopChannel or https://t.me/MyShopChannel"
CHANNEL_INVALID = "That doesn't look like a valid channel link.\nSend @username or https://t.me/channel"
CHANNEL_IMPORTING = "Importing from @{channel}..."
CHANNEL_SCRAPE_FAILED = "Failed to access @{channel}. Make sure it's a public channel."
CHANNEL_NO_PRODUCTS = "No product posts found in @{channel}."
CHANNEL_PARSING = "Found {count} posts. Extracting products..."
CHANNEL_IMPORT_DONE = "Imported {count} products from @{channel}!\n\nYour shop: {link}\n\nAdd @SoukEtBot as admin to your channel for auto-sync."
CHANNEL_IMPORT_ERRORS = "\n({errors} posts skipped — no product info found)"
SYNC_PRODUCT_ADDED = "New product from your channel: {name}"

# ══════════════════════════════════════════════════════════════
# WEEKLY DIGEST
# ══════════════════════════════════════════════════════════════

DIGEST_HEADER = "Weekly Report — {shop_name}"
DIGEST_VIEWS = "Views: {views}"
DIGEST_TAPS = "Contact taps: {taps}"
DIGEST_BEST = "Best: {name} ({views} views)"
DIGEST_TIP_NO_TAPS = "Tip: Try better photos or descriptions to convert views to contacts."
DIGEST_TIP_NO_VIEWS = "Tip: Share your shop link on social media to get more views."
