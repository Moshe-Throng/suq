"""English strings for Suq bot."""

# ══════════════════════════════════════════════════════════════
# WELCOME & ONBOARDING
# ══════════════════════════════════════════════════════════════

LANG_PROMPT = "Choose your language:"
LANG_CHANGED = "Language set to English"

WELCOME = (
    "Welcome to Suq!\n\n"
    "Turn your Telegram channel into a professional storefront.\n\n"
    "Add products, get beautiful marketing images, and manage orders — all from this bot."
)

ASK_ROLE = "What would you like to do?"
BTN_SELLER = "I'm a Seller"
BTN_BUYER = "I'm a Buyer"

# ══════════════════════════════════════════════════════════════
# SHOP SETUP
# ══════════════════════════════════════════════════════════════

ASK_SHOP_NAME = "Let's set up your shop!\n\nWhat's your shop name?"
ASK_THEME_COLOR = "Pick a color theme for your shop:"
SHOP_NAME_TAKEN = "That name is already taken. Try another one."
SHOP_NAME_INVALID = "Shop name must be 2-30 characters, letters and numbers only."
SHOP_CREATED = "Your shop \"{name}\" is ready!\n\nYour catalog link:\n{link}\n\nShare this with your buyers."
SHOP_EXISTS = "You already have a shop: \"{name}\"\n\nCatalog: {link}"

# ══════════════════════════════════════════════════════════════
# PRODUCTS
# ══════════════════════════════════════════════════════════════

ASK_PRODUCT_PHOTO = "Send a photo of your product."
ASK_PRODUCT_NAME = "What's the product name?"
ASK_PRODUCT_PRICE = "Price in Birr? (numbers only)"
PRICE_INVALID = "Please enter a valid number for the price."
ASK_PRODUCT_DESC = "Short description (optional — send /skip to skip)."
PRODUCT_SAVED = "Product \"{name}\" saved! ({price} Birr)\n\nGenerating marketing images..."
PRODUCT_IMAGES_READY = "Here are your marketing images for \"{name}\"!\n\nShare these on your channels."
NO_PRODUCTS = "You have no products yet. Use /add to add one."
PRODUCT_DELETED = "Product \"{name}\" deleted."
PRODUCT_LIST_HEADER = "Your products:"

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

BUYER_WELCOME = "Welcome to Suq!\n\nBrowse shops by visiting their catalog links, or search below."
BUYER_ORDER_PLACED = "Your order has been placed! The seller will be notified."
BUYER_ASK_NAME = "Your name for the order?"
BUYER_ASK_PHONE = "Phone number (optional — send /skip):"
BUYER_ASK_NOTE = "Any notes for the seller? (send /skip to skip)"

# ══════════════════════════════════════════════════════════════
# MENU & HELP
# ══════════════════════════════════════════════════════════════

BTN_ADD_PRODUCT = "Add Product"
BTN_MY_PRODUCTS = "My Products"
BTN_MY_ORDERS = "Orders"
BTN_SHOP_LINK = "Shop Link"
BTN_SETTINGS = "Settings"

HELP = (
    "Suq Commands:\n\n"
    "/start — Main menu\n"
    "/add — Add a new product\n"
    "/products — View your products\n"
    "/orders — View open orders\n"
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
# SETTINGS
# ══════════════════════════════════════════════════════════════

BTN_SHARE_SHOP = "Share Shop"
SETTINGS_MENU = "What would you like to change?"
BTN_CHANGE_THEME = "Change Theme"
BTN_EDIT_DESC = "Edit Description"
BTN_CHANGE_LOGO = "Change Logo"
BTN_BACK_MENU = "Back to Menu"

ASK_DESCRIPTION = "Send a short description or tagline for your shop (max 120 chars).\n\nSend /skip to remove it."
DESC_SAVED = "Description updated!"
DESC_INVALID = "Description must be under 120 characters."
DESC_REMOVED = "Description removed."

ASK_LOGO = "Send a photo for your shop logo.\n\nSend /skip to remove it."
LOGO_SAVED = "Logo updated!"
LOGO_REMOVED = "Logo removed."

THEME_UPDATED = "Theme color updated!"

SHARE_CARD_CAPTION = "Share this with your buyers and on social media!"

# ══════════════════════════════════════════════════════════════
# MISC
# ══════════════════════════════════════════════════════════════

CANCELLED = "Cancelled."
ERROR = "Something went wrong. Please try again."
SKIP = "/skip"
