"""
Caption parser — extracts product name and price from Telegram channel captions.
Uses regex heuristics. Can be upgraded to Claude Haiku later for better accuracy.
"""

import re


def parse_caption(caption: str) -> dict:
    """Extract product info from a channel post caption.
    Returns {name, price, price_type, description}."""
    if not caption or not caption.strip():
        return {"name": None, "price": None, "price_type": "contact", "description": None}

    text = caption.strip()
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # --- Extract price ---
    price = None
    price_type = "contact"

    # Patterns: "1,500 birr", "1500 ETB", "2000 br", "Price: 3,000", "ዋጋ 1500 ብር"
    price_patterns = [
        r'(\d[\d,]*\d)\s*(?:birr|etb|br|ብር)',  # "1500 birr", "1,500 ETB"
        r'(?:price|ዋጋ|ware)[:\s]*(\d[\d,]*\d)',  # "Price: 1500"
        r'(\d{3,7})\s*(?:birr|etb|br|ብር)',  # relaxed
    ]

    for pattern in price_patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            price_str = m.group(1).replace(",", "")
            try:
                price = int(float(price_str))
                if 10 <= price <= 10_000_000:  # sanity check
                    price_type = "fixed"
                    break
                else:
                    price = None
            except (ValueError, TypeError):
                pass

    # Check for "starting from" patterns
    if price:
        starting_patterns = [r'(?:starting|from|ጀምሮ|minimum|min)', r'(?:starting\s+from|ከ\s*\d)']
        for pat in starting_patterns:
            if re.search(pat, text, re.IGNORECASE):
                price_type = "starting_from"
                break

    # Check for "DM for price" / "contact for price" patterns (only if about pricing)
    dm_patterns = [r'dm\s+for\s+pric', r'contact\s+for\s+pric', r'inbox\s+for\s+pric',
                   r'ለዋጋ\s+ያግኙ', r'ዋጋ\s+ይጠይቁ', r'price\s*on\s*dm']
    if not price:  # only override if no price was found
        for pat in dm_patterns:
            if re.search(pat, text, re.IGNORECASE):
                price_type = "contact"
                price = None
                break

    # If no price found, check for standalone numbers that look like prices
    # Skip phone numbers (09/07 prefix, 10+ digits)
    if price is None and price_type == "contact":
        # Remove phone numbers first
        clean_text = re.sub(r'(?:0[97]\d{8}|\+251\d{9})', '', text)
        standalone = re.findall(r'\b(\d{2,7})\b', clean_text)
        for num_str in standalone:
            num = int(num_str)
            if 50 <= num <= 500_000:  # plausible Ethiopian price range
                price = num
                price_type = "fixed"
                break

    # --- Extract name ---
    name = None

    # First non-empty line is usually the product name
    # Skip lines that are just emojis, hashtags, or contact info
    for line in lines:
        clean = re.sub(r'[#@]\S+', '', line)  # remove hashtags/mentions
        clean = re.sub(r'[\U0001F300-\U0001F9FF]', '', clean).strip()  # remove emojis
        clean = re.sub(r'https?://\S+', '', clean).strip()  # remove URLs
        clean = re.sub(r'0\d{9}', '', clean).strip()  # remove phone numbers

        # Skip lines that are just price info
        if re.match(r'^[\d,.\s]+(?:birr|etb|br|ብር)?$', clean, re.IGNORECASE):
            continue
        # Skip very short lines
        if len(clean) < 3:
            continue
        # Skip lines that are just "DM for price" etc
        if re.match(r'^(?:dm|contact|call|inbox|price)', clean, re.IGNORECASE):
            continue

        name = clean[:80]  # cap at 80 chars
        break

    # Fallback: use first 50 chars of caption
    if not name:
        clean = re.sub(r'[#@]\S+', '', text)
        clean = re.sub(r'https?://\S+', '', clean).strip()
        name = clean[:50] if clean else "Product"

    # --- Description ---
    # Everything after the first line, excluding price/contact lines
    desc_lines = []
    seen_name = False
    for line in lines:
        if not seen_name:
            seen_name = True
            continue
        # Skip price/contact/hashtag lines
        if re.match(r'^[\d,.\s]+(?:birr|etb|br|ብር)?$', line, re.IGNORECASE):
            continue
        if re.match(r'^[#@]', line):
            continue
        if re.match(r'^(?:dm|contact|call|inbox|0\d{9})', line, re.IGNORECASE):
            continue
        desc_lines.append(line)

    description = "\n".join(desc_lines).strip()[:500] if desc_lines else None

    return {
        "name": name,
        "price": price,
        "price_type": price_type,
        "description": description,
    }
