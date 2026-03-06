# souk.et — Build Specification
## Telegram Storefront Bot + Content Factory + Web Catalog

---

## BRANDING

- **Name:** souk.et
- **Bot Username:** @SoukEtBot
- **Domain:** souk.et
- **Primary Color:** #FF6B35 (Souk Orange)
- **Accent Color:** #FFB800 (Gold)
- **Dark Background:** #0A0A0F
- **Light Background:** #FFF8F3 (Warm Cream)
- **Font:** DM Sans (Google Fonts) — all UI, templates, web catalog
- **Tagline:** "Your shop, made beautiful."
- **Logo:** Market stall icon with scalloped awning, open doorway, and sparkle accent. SVG provided separately.

---

## WHAT YOU ARE BUILDING

A Telegram bot called souk.et (@SoukEtBot) that lets Ethiopian small sellers turn their Telegram channel into a professional shop. The bot does three things:

1. **Storefront**: Sellers add items (photo + name + price), post a browsable catalog in their Telegram channel, and receive structured contact requests from buyers.
2. **Content Factory**: For every item added, the bot auto-generates beautiful marketing images in 4 aspect ratios (square, story/reel, landscape, tile) that sellers download and post to Instagram, TikTok, WhatsApp, etc.
3. **Web Catalog**: Every shop gets a free web page at `souk.et/shopslug` showing all their items with "Contact on Telegram" buttons.

---

## THE PIPELINE — One Smooth Conversation

The entire setup must feel like chatting with a friend, not filling out a form. No dead ends. No confusion. Every message from the bot should have a clear next action.

### Step 1: Welcome + Business Type Selection

User starts the bot. Bot sends:

```
🏪 Welcome to souk.et!

Turn your Telegram into a beautiful shop — free.

What type of business are you?
```

Two inline buttons:
- `🛍 I sell products` (physical goods: clothes, food, electronics, crafts)
- `💼 I offer services` (hairdressing, photography, tutoring, design)

**This choice determines everything downstream.** Store it as `shop.type = "product" | "service"`.

### Step 2: Shop Name

Bot:
```
What's your business name?
```
User types name. Bot stores it, auto-generates slug (lowercase, no spaces, no special chars).

### Step 3: Category

Bot sends category buttons. **Different categories per business type:**

**If Product:**
`[Food & Bakery]` `[Fashion & Clothing]` `[Electronics]` `[Beauty & Cosmetics]` `[Handmade & Crafts]` `[Coffee & Spices]` `[Home & Furniture]` `[Other]`

**If Service:**
`[Beauty & Salon]` `[Photography & Video]` `[Tutoring & Education]` `[Design & Creative]` `[Repair & Technical]` `[Health & Fitness]` `[Events & Catering]` `[Other]`

### Step 4: Location (Optional)

Bot:
```
Do you have a physical location?

Share a location pin, or skip for now.
```

Buttons: `[📍 Share Location]` `[Skip]`

If they share a location pin, store GPS coordinates. If they type an address, store as text.

### Step 5: Phone (Optional but Prompted)

Bot:
```
Add a phone number so customers can reach you directly?
```

Buttons: `[Skip]` — or user types phone number.

### Step 6: First Item

Bot:
```
Your shop is ready! Now let's add your first [product/item].

Just send me a photo.
```

**If Product type:** "Send me a photo of your product."
**If Service type:** "Send me a photo that shows your work — a portfolio shot, a before/after, or your workspace."

User sends photo. Then:

Bot: `"What's the name?"` → User types name.

**If Product:**
Bot: `"Price in Birr?"` → User types number.
Bot: `"How many in stock?"` → User types number (or bot offers `[Unlimited]` button).

**If Service:**
Bot: `"Price in Birr? (or type 'quote' if price varies)"` → User types number or "quote".
If they type a number, it displays as "Starting from X Birr" on the catalog.
If they type "quote", it displays as "Contact for pricing".
No stock question for services.

### Step 7: Content Generation — THE MAGIC MOMENT

Bot:
```
✨ [Product/Item] added!

Generating your marketing images...
```

Brief pause (1-2 seconds for drama, even if generation is instant).

Then bot sends **4 images as a media group** (album):

1. **Square (1080×1080)** — "For Instagram feed, Facebook, Telegram"
2. **Story/Reel (1080×1920)** — "For Instagram Story, TikTok, YouTube Shorts"
3. **Landscape (1200×628)** — "For Facebook share, Twitter/X, Telegram header"
4. **Catalog Tile (600×600)** — "For WhatsApp, multi-product posts"

Followed by a text message:
```
📸 4 images ready! Save them and share:

📱 Post the Story/Reel to TikTok & Instagram Stories
📸 Post the Square to your Instagram feed
🔗 Your catalog: souk.et/[slug]

Add another? Just send a photo.
Type /catalog to post your shop in your channel.
```

### Step 8: Ongoing — Adding More Items

After the first item, the flow is streamlined. Seller just sends a photo at any time and the bot starts the add flow. No command needed. Photo = new item.

### Step 9: Posting Catalog to Channel

Seller types `/catalog` in any group or channel where the bot is added (seller must add bot as admin to their channel).

Bot posts a rich catalog message:

**If Product shop:**
```
🏪 [Shop Name]
📍 [Location] · [Category]

🛍 [Product 1 Name] — [Price] Birr
🛍 [Product 2 Name] — [Price] Birr
🛍 [Product 3 Name] — [Price] Birr
...

Tap a product to contact seller 👇
```

With inline buttons per item: `[Product Name — Price Birr]`

When a buyer taps a product button → bot sends them to a DM where it shows the product detail with a `[📩 Contact Seller]` button.

**If Service shop:**
```
💼 [Shop Name]
📍 [Location] · [Category]

💼 [Service 1] — Starting from [Price] Birr
💼 [Service 2] — Contact for pricing
...

Tap a service to contact 👇
```

Same inline button flow.

### Step 10: Contact Flow (Buyer Side)

When a buyer taps "Contact Seller" on any item:

Bot asks buyer:
```
📩 Contacting [Shop Name] about [Item Name]

Leave a short message for the seller (or just tap Send):
```

Button: `[📩 Send Contact Request]`

Or buyer can type a message first.

Bot notifies seller:
```
📩 New inquiry!

👤 [Buyer name] (@username)
📦 Interested in: [Item Name]
💬 Message: "[their message or 'No message']"
📱 [Phone if available]

Reply directly: @[buyer_username]
```

Buyer gets:
```
✅ Your message was sent to [Shop Name]!
They usually respond within [X time].
```

This replaces "Order" — it's honest, works for both products and services, and still gives the seller a structured lead.

---

## CONTENT FACTORY — Detailed Template Spec

### Design Principles

The generated images must be dramatically better than what sellers can make themselves. The gap between "phone photo with Amharic text" and "souk.et-generated card" must be enormous. This gap IS the product.

Every template must:
- Put the product/service photo on a designed background (NOT a flat solid color — use gradients, subtle patterns, or soft shadows)
- Use a typeface that looks expensive (Google Fonts: use DM Sans for body, and a display font like Playfair Display or Clash Display for the product name)
- Display the price in a way that pops (colored badge, contrasting block, highlighted)
- Include the shop name subtly
- Add one micro-detail that says "designed" — a thin line, a geometric accent, a dot pattern
- Include the watermark: `souk.et/[slug]` in small text at the bottom

### The 6 Template Styles

Each item generates images in the seller's chosen template. Seller picks their template style during setup (can change anytime via /settings). The 6 styles:

**1. Clean White**
- Background: White/off-white (#FAFAFA) with very subtle gray gradient toward edges
- Product photo: centered with soft drop shadow beneath it
- Name: Dark charcoal, semi-bold, clean sans-serif
- Price: Purple (#7C3AED) bold in a rounded pill/badge
- Accent: Thin hairline divider between photo and text
- Vibe: Apple Store product page

**2. Bold Dark**
- Background: Near-black (#0A0A0F) to dark charcoal gradient
- Product photo: with a subtle glow/rim light effect around edges
- Name: White, bold
- Price: Gradient text (purple to pink: #7C3AED → #EC4899)
- Accent: Subtle geometric shapes in the background (circles, lines at 10% opacity)
- Vibe: Premium tech product launch

**3. Ethiopian Heritage**
- Background: Warm cream (#FDF6EC) 
- Border: Traditional Ethiopian cross-stitch pattern (tilf) in earth tones along top and bottom edges
- Product photo: with a warm tone filter
- Name: Dark brown, slightly decorative serif
- Price: Deep gold/brown (#92400E) 
- Accent: Small Ethiopian cross motif in corner
- Vibe: Ethiopian Airlines duty-free catalog

**4. Fresh Pop**
- Background: Bright color automatically extracted from the dominant color of the product photo (use the image's primary hue, saturated, at 15% opacity as background, with full saturation accent elements)
- Product photo: slightly larger, bleeds to edges
- Name: White or dark (auto-contrast based on background brightness), thick bold
- Price: White text on a solid color block matching the extracted color
- Accent: Rounded blob shapes in background at low opacity
- Vibe: Instagram brand account, Gen-Z energy

**5. Minimal Line**
- Background: Pure white
- Product photo: moderate size, centered
- Border: Single thin line (1px, light gray) rectangle with generous padding
- Name: Elegant serif font, regular weight, letter-spaced
- Price: Same serif, slightly bolder
- Accent: Nothing. Restraint IS the design. Lots of white space.
- Vibe: High-end gallery, luxury boutique

**6. Warm Gradient**
- Background: Warm gradient (peach to coral, or terracotta to amber — auto-selected to complement the product photo colors)
- Product photo: with white border/frame effect (like a polaroid)
- Name: White, friendly rounded font
- Price: White, large, bold
- Accent: Subtle grain/noise texture over the gradient (2-3% opacity)
- Vibe: Lifestyle brand, warm and inviting

### Aspect Ratio Specs

For EACH template style, generate these 4 sizes:

| Format | Pixels | Aspect Ratio | Layout Notes |
|--------|--------|-------------|--------------|
| Square | 1080 × 1080 | 1:1 | Product photo takes top 60%, name + price bottom 40%. Balanced. |
| Story/Reel | 1080 × 1920 | 9:16 | Product photo top 55%, big vertical space for name + price + CTA button graphic. Shop name at very top. |
| Landscape | 1200 × 628 | ~1.91:1 | Product photo on left 45%, name + price + shop branding on right 55%. Or product centered with text overlay. |
| Tile | 600 × 600 | 1:1 | Compact version. Product fills most of the frame. Name + price overlay at bottom with semi-transparent bar. |

### Service-Specific Template Adjustments

When `shop.type === "service"`:
- Price label says "Starting from [X] Birr" or "Contact for pricing" (never just the number)
- The CTA on Story/Reel format says "Book Now" or "Get a Quote" instead of "Order Now"
- The photo area is treated as "portfolio" — maybe a subtle "Our Work" or "Portfolio" label

### Special Content Commands

Beyond per-item generation:

| Command | What It Generates |
|---------|------------------|
| `/poster` | Multi-item grid (2×3 or 3×3). All items with photos + prices. Shop header, QR code footer. Generated in Square (1080×1080) and Story (1080×1920) formats. |
| `/card` | Digital business card. Shop name, phone, location, category, QR code to web catalog. Square format + Tile format. |
| `/qr` | Just the QR code image linking to souk.et/[slug]. Clean, printable. |
| `/sale [item_id] [new_price]` | Generates a sale card: crossed-out old price, bold new price, "SALE" badge. All 4 formats. |

### Watermark

Every generated image includes at the bottom:
- Text: `souk.et/[slug]` in the template's secondary/muted color
- Font size: approximately 2.5% of image height
- Position: bottom-center, with small padding
- Opacity: 70-80% — visible but not obnoxious

---

## WEB CATALOG PAGE — souk.et/[slug]

### Technical Requirements
- Server-rendered HTML. No heavy JS framework. Must load in under 2 seconds on 3G.
- Mobile-first. Design for 360px width. Must look perfect on cheap Android phones.
- Responsive — also looks good on desktop for when sellers share the link on laptop.

### Page Layout (Top to Bottom)

**1. Header (Gradient Background)**
- Background: gradient using the seller's template primary color (e.g., Clean White gets a subtle purple gradient, Bold Dark gets a dark gradient, Ethiopian gets warm brown gradient)
- Shop name: large, bold, the template's display font
- Category badge: small pill/chip below the name
- Location: with 📍 icon (if provided)
- Status: "New Shop" badge for shops under 30 days (later: star rating)

**2. Action Bar (Sticky on scroll)**
- `[💬 Telegram]` — links to t.me/SoukEtBot?start=shop_[id]
- `[📞 Call]` — tel: link (if phone provided)
- `[📍 Directions]` — Google Maps link (if location provided)
- `[📤 Share]` — native share API or copy link

**3. Items Grid**
- 2-column grid on mobile
- Each item card: photo (square, fills card width), name below, price below name
- Product shops: price shown as "[X] Birr", stock indicator if low ("2 left!")
- Service shops: price shown as "From [X] Birr" or "Contact for pricing"
- Each card has a CTA button: `[📩 Contact]` — deep links to bot DM with item pre-selected: `t.me/SoukEtBot?start=contact_[item_id]`
- Items that are out of stock: grayed out with "Sold out" overlay (products only)

**4. About Section (Collapsible)**
- Tap "About [Shop Name]" to expand
- Bio text (if seller wrote one)
- Payment methods: Telebirr / CBE / Bank Transfer / Cash icons (from seller's checkbox selection during setup)
- Delivery info: "Delivers in Addis" / "Pickup only" / "Shipping available" (seller selects)
- Open hours (if set)

**5. Footer**
- "Powered by souk.et — Create your free shop" with link to bot
- Small QR code

### Design Feel

The web page should feel like a premium Shopify store, not a directory listing. Key details:
- Product images should have subtle hover/tap scale effect (transform: scale(1.02) on hover)
- Smooth scroll behavior
- Product images lazy-load with a fade-in
- The header gradient should feel branded and intentional
- Typography must be sharp — use the same font family as the templates
- Price should be the most visually prominent element on each card (it's what buyers look for)
- The "Contact" button should be high-contrast and feel tappable (not a tiny text link)

---

## SELLER DASHBOARD COMMANDS

All via Telegram bot DM:

| Command | Function |
|---------|----------|
| `/start` | Setup flow (first time) or main menu (returning) |
| Send a photo | Add new item flow |
| `/items` | List all items. Tap any to edit name/price/stock or delete. |
| `/catalog` | Post browsable catalog in current chat/channel |
| `/poster` | Generate multi-item grid image |
| `/card` | Generate digital business card |
| `/qr` | Generate QR code for web catalog |
| `/sale [item] [price]` | Generate sale content for an item |
| `/stats` | Basic stats: total inquiries, most-viewed items, web page visits |
| `/settings` | Edit shop name, phone, location, hours, payment methods, template style, bio |
| `/help` | Show all commands |

---

## DATA MODEL

### shops
- id (primary key)
- owner_telegram_id (unique)
- name
- slug (unique, auto-generated from name)
- type: "product" | "service"
- category
- location_lat (nullable)
- location_lng (nullable)
- location_text (nullable)
- phone (nullable)
- bio (nullable)
- template_style: "clean" | "bold" | "ethiopian" | "fresh" | "minimal" | "warm" (default: "clean")
- payment_methods: JSON array (e.g., ["telebirr", "cbe", "bank", "cash"])
- delivery_info (nullable)
- open_hours (nullable, JSON)
- created_at

### items
- id (primary key)
- shop_id (foreign key)
- name
- price (nullable — null means "contact for pricing")
- price_type: "fixed" | "starting_from" | "contact" 
- stock (nullable — null for services or unlimited)
- photo_file_id (Telegram file ID)
- photo_url (stored copy for web page)
- is_active (boolean, default true)
- sort_order
- created_at

### inquiries
- id (primary key)
- shop_id
- item_id
- buyer_telegram_id
- buyer_name
- buyer_username (nullable)
- message (nullable)
- status: "new" | "seen" | "replied"
- created_at

---

## WHAT NOT TO BUILD (yet)

- No payment processing. Sellers handle payments themselves. This is correct for Ethiopia right now.
- No reviews or ratings. Phase 2.
- No seller verification badges. Phase 2.
- No discovery directory. Phase 2.
- No analytics dashboard beyond basic /stats. Phase 2.
- No multi-language. Amharic only for MVP. English commands as aliases.
- No in-bot image editing (crop, filter). Just template application.
- No AI image processing (background removal, enhancement). Phase 2 — use rembg or remove.bg API later.

---

## IMAGE GENERATION APPROACH

Use server-side HTML-to-image rendering:
- Build each template as an HTML/CSS layout
- Use Puppeteer (headless Chrome) or a lighter alternative like `node-html-to-image` to render to PNG
- Template function signature: `generateImage(templateStyle, format, { photo, name, price, priceType, shopName, slug }) → Buffer`
- Store generated images and send via Telegram bot API as photos
- For the web catalog: serve product photos directly, no template rendering needed

Template HTML/CSS should be designed with absolute precision:
- Use Google Fonts (loaded in the HTML)
- Use CSS gradients, shadows, and subtle effects
- The photo should be loaded as a base64 data URI or local file path
- Output: PNG at the exact pixel dimensions specified

---

## FILE STRUCTURE (suggested)

```
suq/
  bot/
    index.js          — Bot entry point, webhook or polling
    handlers/
      start.js        — Setup flow
      addItem.js       — Photo → name → price → generate content
      catalog.js       — /catalog command
      contact.js       — Buyer contact flow
      commands.js      — /items, /stats, /settings, /help, /poster, /card, /qr, /sale
    middleware/
      session.js       — Track conversation state per user
  
  content/
    generator.js       — Main generation orchestrator
    templates/
      clean.html       — Clean White template (parameterized)
      bold.html        — Bold Dark template
      ethiopian.html   — Ethiopian Heritage template
      fresh.html       — Fresh Pop template
      minimal.html     — Minimal Line template
      warm.html        — Warm Gradient template
    renderer.js        — HTML → PNG rendering (Puppeteer/node-html-to-image)
  
  web/
    server.js          — Express/Fastify server for web catalog
    views/
      catalog.ejs      — Shop catalog page template (server-rendered)
      item.ejs         — Individual item page (for deep links)
    public/
      style.css        — Minimal CSS for web pages
      photos/          — Stored product photos for web serving
  
  db/
    database.js        — SQLite setup and queries (PostgreSQL later)
    migrations/        — Schema migrations
  
  utils/
    slug.js            — Name → slug generation
    format.js          — Price formatting with commas + Birr
    color.js           — Extract dominant color from product photo (for Fresh Pop template)
```

---

## DEPLOYMENT

- Bot + Web on same server (Railway, Render, or any $5-10/month VPS)
- Domain: souk.et (or whatever domain is chosen) pointing to the web server
- Bot webhook pointing to the bot endpoint
- SQLite for MVP (switch to PostgreSQL when >500 sellers)
- Product photos stored on disk or S3-compatible storage (Cloudflare R2 is free tier)

---

## DEFINITION OF DONE

The MVP is complete when:

1. A seller can go from /start to their first generated content images in under 3 minutes
2. All 4 aspect ratio images are generated for each item in the seller's chosen template
3. The images look dramatically more professional than a typical Telegram channel product post
4. The web catalog page loads in under 2 seconds on mobile and looks like a premium store
5. A buyer can tap "Contact" on any item (in Telegram catalog or web page) and the seller gets a structured notification
6. The seller can post /catalog in their channel and it displays a clean browsable catalog
7. The watermark souk.et/[slug] appears on every generated image
8. /poster, /card, and /qr commands work
9. /items lets sellers manage (edit/delete) their items
10. The whole thing runs on a $5-10/month server
