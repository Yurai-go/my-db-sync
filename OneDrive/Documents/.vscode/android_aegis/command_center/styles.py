from PyQt5.QtGui import QFont, QColor, QPalette
from PyQt5.QtCore import Qt

# === Fonts ===
FONT_MONO_SMALL = QFont("Courier New", 10)
FONT_LABEL = QFont("Segoe UI", 10, QFont.Bold)
FONT_HEADER = QFont("Segoe UI", 12, QFont.Bold)

# === Colors ===
COLOR_BG_DARK = "#121212"
COLOR_PANEL_DARK = "#1f1f1f"
COLOR_TEXT_LIGHT = "#ffffff"
COLOR_ACCENT = "#03DAC6"
COLOR_LABEL = "#bbbbbb"
COLOR_DISABLED = "#777777"

# === Stylesheets ===

STYLE_LISTWIDGET = f"""
    QListWidget {{
        background-color: {COLOR_PANEL_DARK};
        color: {COLOR_TEXT_LIGHT};
        border: none;
    }}
"""

STYLE_LOG = f"""
    QTextEdit {{
        background-color: {COLOR_BG_DARK};
        color: {COLOR_ACCENT};
        border: none;
    }}
"""

STYLE_LABEL = f"""
    QLabel {{
        color: {COLOR_LABEL};
        font-weight: bold;
        font-size: 16px;
    }}
"""

STYLE_CHECKBOX = f"""
    QCheckBox {{
        color: {COLOR_TEXT_LIGHT};
    }}
"""

STYLE_STATUSBAR = f"""
    QStatusBar {{
        background-color: {COLOR_PANEL_DARK};
        color: {COLOR_TEXT_LIGHT};
    }}
"""

# === Global Palette Function ===

def apply_dark_palette(app):
    palette = QPalette()
    palette.setColor(QPalette.Window, QColor(COLOR_BG_DARK))
    palette.setColor(QPalette.WindowText, QColor(COLOR_TEXT_LIGHT))
    palette.setColor(QPalette.Base, QColor(COLOR_PANEL_DARK))
    palette.setColor(QPalette.AlternateBase, QColor("#2c2c2c"))
    palette.setColor(QPalette.Text, QColor(COLOR_TEXT_LIGHT))
    palette.setColor(QPalette.Button, QColor("#333333"))
    palette.setColor(QPalette.ButtonText, QColor(COLOR_TEXT_LIGHT))
    palette.setColor(QPalette.Highlight, QColor(COLOR_ACCENT))
    palette.setColor(QPalette.HighlightedText, QColor("#000000"))
    app.setPalette(palette)
