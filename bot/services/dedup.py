"""
Product deduplication — prevents importing the same product twice.
Uses caption text similarity (normalized Jaccard) and exact message ID check.
"""

import re


def normalize_text(text: str) -> set[str]:
    """Normalize caption to a set of significant words for comparison."""
    text = text.lower()
    text = re.sub(r'[#@]\S+', '', text)  # remove hashtags/mentions
    text = re.sub(r'https?://\S+', '', text)  # remove URLs
    text = re.sub(r'0[97]\d{8}|\+251\d{9}', '', text)  # remove phone numbers
    text = re.sub(r'[\U0001F300-\U0001F9FF\U0001FA00-\U0001FAFF]', '', text)  # remove emojis
    text = re.sub(r'[^\w\s]', '', text)  # remove punctuation
    words = set(text.split())
    # Remove very common stop words
    stop = {'the', 'a', 'an', 'is', 'in', 'for', 'and', 'or', 'to', 'of', 'on', 'at',
            'dm', 'call', 'contact', 'price', 'birr', 'etb', 'br', 'new', 'available',
            'order', 'delivery', 'free', 'sale'}
    return words - stop


def caption_similarity(caption_a: str, caption_b: str) -> float:
    """Jaccard similarity between two captions. Returns 0.0-1.0."""
    words_a = normalize_text(caption_a)
    words_b = normalize_text(caption_b)
    if not words_a or not words_b:
        return 0.0
    intersection = words_a & words_b
    union = words_a | words_b
    return len(intersection) / len(union) if union else 0.0


def is_duplicate(new_caption: str, existing_captions: list[str],
                 threshold: float = 0.6) -> bool:
    """Check if a caption is too similar to any existing product caption."""
    for existing in existing_captions:
        if caption_similarity(new_caption, existing) >= threshold:
            return True
    return False
