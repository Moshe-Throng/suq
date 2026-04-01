"""
AI product classifier — uses OpenRouter (Gemini) to extract structured product data.
Extracts: name, price, category, tags, audience (kids/men/women/unisex),
         stock status, description, size/color variants.
"""

import os
import json
import logging
import httpx
from pathlib import Path
from dotenv import load_dotenv

_env_paths = [
    Path(__file__).parent.parent.parent / ".env",
    Path(__file__).parent.parent.parent.parent / ".env",
]
for _p in _env_paths:
    if _p.exists():
        load_dotenv(_p, override=True)

logger = logging.getLogger("suq.ai_classifier")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL = "google/gemini-2.0-flash-001"  # free on OpenRouter

SYSTEM_PROMPT = """You are a product data extractor for an Ethiopian Telegram marketplace.
Given a Telegram channel post caption, extract structured product information.

Return ONLY valid JSON with these fields:
{
  "name": "Clean product name (no emojis, no hashtags, max 60 chars)",
  "price": null or integer in Ethiopian Birr,
  "price_type": "fixed" | "starting_from" | "contact",
  "category": one of: "fashion", "electronics", "food", "beauty", "handmade", "coffee", "home", "kids", "pets", "other",
  "tags": ["tag1", "tag2"] from: ["dresses", "tops", "pants", "shoes", "bags", "accessories", "phones", "laptops", "cakes", "bread", "makeup", "skincare", "coffee", "spices", "furniture", "decor", "toys", "baby", "cat", "dog", "pet_food"],
  "audience": "kids" | "men" | "women" | "unisex" | "babies",
  "stock_status": "in_stock" | "out_of_stock",
  "description": "1-2 sentence description (or null)",
  "phone": "phone number if present (or null)",
  "size_info": "size details if mentioned (or null)",
  "color_info": "colors if mentioned (or null)"
}

Rules:
- If caption is in Amharic, still return English field values
- "category" must be one of the listed options — use best judgment
- For kids/baby products, category MUST be "kids" and audience "kids" or "babies"
- For pet products, category MUST be "pets"
- Price: extract from "1500 birr", "ዋጋ 2000", "Price: 3,500 ETB" etc. Remove phone numbers (09/07 prefix).
- If "sold out", "finished", "አልቋል" → stock_status = "out_of_stock"
- tags: pick 1-3 most relevant from the list
- If you can't extract a field, use null"""


async def classify_product(caption: str) -> dict | None:
    """Classify a product caption using AI. Returns structured data or None on failure."""
    if not OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY not set, falling back to regex parser")
        return None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": f"Caption:\n{caption}"},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 500,
                },
            )

        if resp.status_code != 200:
            logger.warning(f"OpenRouter returned {resp.status_code}: {resp.text[:200]}")
            return None

        data = resp.json()
        content = data["choices"][0]["message"]["content"]

        # Extract JSON from response (handle markdown code blocks)
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        result = json.loads(content)

        # Validate required fields
        if not isinstance(result, dict) or not result.get("name"):
            return None

        # Normalize
        result["name"] = str(result["name"])[:80]
        if result.get("price") is not None:
            try:
                result["price"] = int(float(str(result["price"]).replace(",", "")))
            except (ValueError, TypeError):
                result["price"] = None
        if result.get("category") not in ("fashion", "electronics", "food", "beauty",
                                           "handmade", "coffee", "home", "kids", "pets", "other"):
            result["category"] = "other"
        if result.get("price_type") not in ("fixed", "starting_from", "contact"):
            result["price_type"] = "contact" if result.get("price") is None else "fixed"
        if result.get("stock_status") not in ("in_stock", "out_of_stock"):
            result["stock_status"] = "in_stock"

        return result

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse AI response as JSON: {e}")
        return None
    except Exception as e:
        logger.warning(f"AI classification failed: {e}")
        return None


async def classify_batch(captions: list[str], max_concurrent: int = 3) -> list[dict | None]:
    """Classify multiple captions concurrently. Returns list of results (None for failures)."""
    import asyncio

    semaphore = asyncio.Semaphore(max_concurrent)

    async def _classify(caption: str) -> dict | None:
        async with semaphore:
            result = await classify_product(caption)
            await asyncio.sleep(0.2)  # rate limit buffer
            return result

    tasks = [_classify(c) for c in captions]
    return await asyncio.gather(*tasks)
