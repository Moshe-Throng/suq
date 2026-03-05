"""
Order management for sellers.
Handles order notifications, accept/reject/complete callbacks.
"""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from bot.db.supabase_client import (
    run_sync, get_shop, get_orders, get_product, update_order_status,
)
from bot.strings.lang import s


def _order_buttons(t, order_id: str) -> InlineKeyboardMarkup:
    """Build Accept/Reject buttons in the user's language."""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(t.BTN_ACCEPT, callback_data=f"order_accept_{order_id}"),
            InlineKeyboardButton(t.BTN_REJECT, callback_data=f"order_reject_{order_id}"),
        ]
    ])


async def list_orders(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /orders — list open orders for the seller."""
    user = update.effective_user
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await update.message.reply_text(t.ERROR)
        return

    orders = await run_sync(get_orders, shop["id"], "new")
    if not orders:
        await update.message.reply_text(t.NO_ORDERS)
        return

    await update.message.reply_text(t.ORDER_LIST_HEADER)
    for order in orders:
        product_name = order.get("suq_products", {}).get("name", "?")
        price = order.get("suq_products", {}).get("price", 0)
        buyer = order.get("buyer_name", "—")
        note = order.get("note", "")

        text = f"📦 {product_name} — {price:,} Birr\n👤 {buyer}"
        if note:
            text += f"\n📝 {note}"

        await update.message.reply_text(
            text, reply_markup=_order_buttons(t, order["id"])
        )


async def list_orders_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle menu_orders callback."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    t = s(user.id)

    shop = await run_sync(get_shop, user.id)
    if not shop:
        await query.edit_message_text(t.ERROR)
        return

    orders = await run_sync(get_orders, shop["id"], "new")
    if not orders:
        await query.edit_message_text(t.NO_ORDERS)
        return

    await query.edit_message_text(t.ORDER_LIST_HEADER)
    for order in orders:
        product_name = order.get("suq_products", {}).get("name", "?")
        price = order.get("suq_products", {}).get("price", 0)
        buyer = order.get("buyer_name", "—")
        note = order.get("note", "")

        text = f"📦 {product_name} — {price:,} Birr\n👤 {buyer}"
        if note:
            text += f"\n📝 {note}"

        await query.message.reply_text(
            text, reply_markup=_order_buttons(t, order["id"])
        )


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


async def notify_seller_new_order(bot, shop: dict, order: dict, product: dict) -> None:
    """Send new order notification to the seller (called from web API or buyer flow)."""
    from bot.strings.lang import s as get_strings
    t = get_strings(shop["telegram_id"])

    buyer = order.get("buyer_name", "—")
    note_text = ""
    if order.get("note"):
        note_text = f"\n📝 {order['note']}"
    if order.get("buyer_phone"):
        note_text += f"\n📱 {order['buyer_phone']}"

    text = t.NEW_ORDER.format(
        product=product["name"],
        qty=order.get("quantity", 1),
        buyer=buyer,
        note=note_text,
    )

    await bot.send_message(
        chat_id=shop["telegram_id"],
        text=text,
        reply_markup=_order_buttons(t, order["id"]),
    )
