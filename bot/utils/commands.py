"""
Per-user command menu helper.
Sets the Telegram "/" command list for a specific user in their chosen language.
"""

from telegram import BotCommand, BotCommandScopeChat

COMMANDS_EN = [
    BotCommand("menu", "Open seller dashboard"),
    BotCommand("add", "Add a product or service"),
    BotCommand("products", "View your items"),
    BotCommand("orders", "View inquiries"),
    BotCommand("shop", "Your shop link"),
    BotCommand("catalog", "Share product catalog"),
    BotCommand("language", "Change language"),
    BotCommand("help", "List commands"),
]

COMMANDS_AM = [
    BotCommand("menu", "የሻጭ ዳሽቦርድ ክፈት"),
    BotCommand("add", "ምርት ወይም አገልግሎት ጨምር"),
    BotCommand("products", "ዝርዝሮችዎን ይመልከቱ"),
    BotCommand("orders", "ጥያቄዎች ይመልከቱ"),
    BotCommand("shop", "የሱቅ ሊንክ"),
    BotCommand("catalog", "ካታሎግ ያጋሩ"),
    BotCommand("language", "ቋንቋ ቀይር"),
    BotCommand("help", "ትዕዛዞች ዝርዝር"),
]

_LANG_COMMANDS = {"en": COMMANDS_EN, "am": COMMANDS_AM}


async def set_user_commands(bot, user_id: int, lang: str) -> None:
    """Set the command menu for a specific user in their preferred language."""
    commands = _LANG_COMMANDS.get(lang, COMMANDS_AM)
    try:
        await bot.set_my_commands(
            commands,
            scope=BotCommandScopeChat(chat_id=user_id),
        )
    except Exception:
        pass
