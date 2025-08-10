import sys
from PyQt5.QtWidgets import QApplication
from PyQt5.QtGui import QPalette, QColor
from ui_main import CommandCenterUI

def apply_dark_theme(app):
    """Applies a custom dark theme to the entire PyQt application."""
    palette = QPalette()
    palette.setColor(QPalette.Window, QColor("#121212"))
    palette.setColor(QPalette.WindowText, QColor("#ffffff"))
    palette.setColor(QPalette.Base, QColor("#1f1f1f"))
    palette.setColor(QPalette.AlternateBase, QColor("#2c2c2c"))
    palette.setColor(QPalette.Text, QColor("#ffffff"))
    palette.setColor(QPalette.Button, QColor("#333333"))
    palette.setColor(QPalette.ButtonText, QColor("#ffffff"))
    palette.setColor(QPalette.Highlight, QColor("#03DAC6"))
    palette.setColor(QPalette.HighlightedText, QColor("#000000"))
    app.setPalette(palette)

def main():
    """Main entry point for the Android Aegis Command Center."""
    app = QApplication(sys.argv)
    apply_dark_theme(app)

    window = CommandCenterUI()
    window.show()

    try:
        exit_code = app.exec_()
    finally:
        # Graceful shutdown of background services
        if hasattr(window, 'server') and window.server:
            window.server.stop()
        if hasattr(window, 'db') and window.db:
            window.db.close()

    sys.exit(exit_code)

if __name__ == "__main__":
    main()
