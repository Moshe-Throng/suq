"""
Inquiry/order management for sellers.
Handles inquiry notifications and mark-as-seen callbacks.
Keeps legacy order_action_callback for backward compat.
"""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.db.supabase_client import (
    run_sync, get_shop, get_orders, get_product, update_order_status,
    get_inquiries, mark_inquiry_seen, format_price,
)
from bot.strings.lang import s


def _inquiry_button(t, inquiry_id: str) -> InlineKeyboardMarkup:
    """Build Mark as Seen button."""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(t.BTN_MARK_SEEN, callback_data=f"inq_seen_{inquiry_id}")]
    ])


def _order_buttons(t, order_id: str) -> InlineKeyboardMarkup:
    """Build Accept/Reject buttons (legacy)."""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t.BTN_ACCEPT, callback_data=f"order_accept_{order_id}"),
            InlineKeyboardButton(t.BTN_REJECT, callback_data=f"order_reject_{order_id}"),
        ]
    ])


# ── List inquiries ───────────────────────────────────────────


async def list_orders(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /orders — list new inquiries for the seller."""
    user = update.effective_user
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await update.message.reply_text(t.ERROR)
        return

    inquiries = await run_sync(get_inquiries, shop["id"], "new")
    if not inquiries:
        await update.message.reply_text(
            getattr(t, "NO_INQUIRIES", t.NO_ORDERS)
        )
        return

    await update.message.reply_text(
        getattr(t, "INQUIRY_LIST_HEADER", t.ORDER_LIST_HEADER)
    )
    for inq in inquiries:
        item = inq.get("suq_products") or {}
        item_name = item.get("name", "?")
        price_display = format_price(item.get("price"), item.get("price_type", "fixed"))
        buyer = inq.get("buyer_name", "—")
        msg = inq.get("message") or inq.get("note", "")
        phone = inq.get("buyer_phone", "")

        text = f"📩 {item_name} — {price_display}\n👤 {buyer}"
        if phone:
            text += f"\n📱 {phone}"
        if msg:
            text += f"\n📝 {msg}"

        await update.message.reply_text(
            text, reply_markup=_inquiry_button(t, inq["id"])
        )


async def list_orders_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle menu_orders callback — list inquiries."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(t.ERROR)
        return

    inquiries = await run_sync(get_inquiries, shop["id"], "new")
    if not inquiries:
        await query.edit_message_text(
            getattr(t, "NO_INQUIRIES", t.NO_ORDERS)
        )
        return

    await query.edit_message_text(
        getattr(t, "INQUIRY_LIST_HEADER", t.ORDER_LIST_HEADER)
    )
    for inq in inquiries:
        item = inq.get("suq_products") or {}
        item_name = item.get("name", "?")
        price_display = format_price(item.get("price"), item.get("price_type", "fixed"))
        buyer = inq.get("buyer_name", "—")
        msg = inq.get("message") or inq.get("note", "")
        phone = inq.get("buyer_phone", "")

        text = f"📩 {item_name} — {price_display}\n👤 {buyer}"
        if phone:
            text += f"\n📱 {phone}"
        if msg:
            text += f"\n📝 {msg}"

        await query.message.reply_text(
            text, reply_markup=_inquiry_button(t, inq["id"])
        )


# ── Inquiry actions ──────────────────────────────────────────


async def inquiry_seen_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle inq_seen_{id} — mark inquiry as seen."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    inquiry_id = query.data.replace("inq_seen_", "")
    await run_sync(mark_inquiry_seen, inquiry_id)

    await query.edit_message_reply_markup(reply_markup=None)
    await query.message.reply_text(
        getattr(t, "INQUIRY_MARKED_SEEN", "Inquiry marked as seen.")
    )


# ── Legacy order actions (backward compat) ───────────────────


async def order_action_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle order_accept_{id}, order_reject_{id}, order_complete_{id}."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    parts = query.data.split("_")
    action = parts[1]  # accept, reject, complete
    order_id = parts[2]

    status_map = {"accept": "accepted", "reject": "rejected", "complete": "completed"}
    new_status = status_map.get(action)
    if not new_status:
        return

    order = await run_sync(update_order_status, order_id, new_status)

    if action == "accept":
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton(t.BTN_COMPLETE, callback_data=f"order_complete_{order_id}")]
        ])
        await query.edit_message_reply_markup(reply_markup=keyboard)
        await query.message.reply_text(t.ORDER_ACCEPTED)

        buyer_tid = order.get("buyer_telegram_id")
        if buyer_tid:
            product = await run_sync(get_product, order.get("product_id", ""))
            pname = product["name"] if product else "item"
            try:
                await context.bot.send_message(
                    chat_id=buyer_tid,
                    text=t.BUYER_ORDER_ACCEPTED.format(product=pname),
                )
            except Exception:
                pass

    elif action == "reject":
        await query.edit_message_reply_markup(reply_markup=None)
        await query.message.reply_text(t.ORDER_REJECTED)

        buyer_tid = order.get("buyer_telegram_id")
        if buyer_tid:
            product = await run_sync(get_product, order.get("product_id", ""))
            pname = product["name"] if product else "item"
            try:
                await context.bot.send_message(
                    chat_id=buyer_tid,
                    text=t.BUYER_ORDER_REJECTED.format(product=pname),
                )
            except Exception:
                pass

    elif action == "complete":
        await query.edit_message_reply_markup(reply_markup=None)
        await query.message.reply_text(t.ORDER_COMPLETED)

        buyer_tid = order.get("buyer_telegram_id")
        if buyer_tid:
            product = await run_sync(get_product, order.get("product_id", ""))
            pname = product["name"] if product else "item"
            try:
                await context.bot.send_message(
                    chat_id=buyer_tid,
                    text=t.BUYER_ORDER_COMPLETED.format(product=pname),
                )
            except Exception:
                pass


# ── Notification (called from web API) ───────────────────────


async def notify_seller_new_inquiry(bot, shop: dict, order: dict, product: dict) -> None:
    """Send new inquiry notification to the seller."""
    from bot.strings.lang import s as get_strings
    t = get_strings(shop["telegram_id"])

    buyer = order.get("buyer_name", "—")
    price_display = format_price(product.get("price"), product.get("price_type", "fixed"))

    details = ""
    if order.get("buyer_phone"):
        details += f"\n📱 {order['buyer_phone']}"
    if order.get("message") or order.get("note"):
        msg = order.get("message") or order.get("note", "")
        details += f"\n📝 {msg}"

    text = getattr(t, "NEW_INQUIRY", t.NEW_ORDER).format(
        item=product["name"],
        price_display=price_display,
        buyer=buyer,
        details=details,
        # Legacy placeholders for backward compat
        product=product["name"],
        qty=order.get("quantity", 1),
        note=details,
    )

    await bot.send_message(
        chat_id=shop["telegram_id"],
        text=text,
        reply_markup=_inquiry_button(t, order["id"]),
    )
