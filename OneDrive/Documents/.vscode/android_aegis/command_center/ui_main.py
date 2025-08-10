import os
import sys
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QListWidget, QTextEdit,
    QLabel, QSplitter, QStatusBar, QCheckBox, QApplication
)
from PyQt5.QtCore import Qt, pyqtSignal

# Import styles and backend
from styles import (
    STYLE_LISTWIDGET, STYLE_LOG, STYLE_LABEL, STYLE_CHECKBOX,
    STYLE_STATUSBAR, FONT_MONO_SMALL
)
from comms.server import SecureServer
from db import LogDatabase

class CommandCenterUI(QWidget):
    # Qt signals for thread-safe updates
    device_connected = pyqtSignal(str)
    device_disconnected = pyqtSignal(str)
    log_signal = pyqtSignal(str)

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Android Aegis - Command Center")
        self.setGeometry(100, 100, 1000, 600)
        self.device_ids = set()
        self.db = LogDatabase()

        self._setup_ui()
        self._connect_signals()
        self._start_server()

    def _setup_ui(self):
        # === DEVICE LIST PANEL ===
        self.device_list = QListWidget()
        self.device_list.setStyleSheet(STYLE_LISTWIDGET)
        self.device_list.setFixedWidth(300)
        self.device_list.addItem("No Devices Connected")

        device_label = QLabel("Connected Devices")
        device_label.setStyleSheet(STYLE_LABEL)

        device_layout = QVBoxLayout()
        device_layout.addWidget(device_label)
        device_layout.addWidget(self.device_list)

        device_panel = QWidget()
        device_panel.setLayout(device_layout)

        # === LOG PANEL ===
        self.log_panel = QTextEdit()
        self.log_panel.setReadOnly(True)
        self.log_panel.setStyleSheet(STYLE_LOG)
        self.log_panel.setFont(FONT_MONO_SMALL)

        log_label = QLabel("Live Event Log")
        log_label.setStyleSheet(STYLE_LABEL)

        self.auto_scroll = QCheckBox("Auto-scroll")
        self.auto_scroll.setChecked(True)
        self.auto_scroll.setStyleSheet(STYLE_CHECKBOX)

        log_layout = QVBoxLayout()
        log_layout.addWidget(log_label)
        log_layout.addWidget(self.log_panel)
        log_layout.addWidget(self.auto_scroll)

        log_panel = QWidget()
        log_panel.setLayout(log_layout)

        # === SPLITTER LAYOUT ===
        splitter = QSplitter(Qt.Horizontal)
        splitter.addWidget(device_panel)
        splitter.addWidget(log_panel)

        # === MAIN LAYOUT ===
        main_layout = QVBoxLayout(self)
        main_layout.addWidget(splitter)

        # === STATUS BAR ===
        self.status_bar = QStatusBar()
        self.status_bar.setStyleSheet(STYLE_STATUSBAR)
        self.status_bar.showMessage("Server starting...")
        main_layout.addWidget(self.status_bar)

        self.setLayout(main_layout)

    def _connect_signals(self):
        self.device_connected.connect(self._add_device)
        self.device_disconnected.connect(self._remove_device)
        self.log_signal.connect(self._append_log)

    def _start_server(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cert_path = os.path.join(base_dir, "certs", "cert.pem")
        key_path = os.path.join(base_dir, "certs", "key.pem")

        self.server = SecureServer(
            cert_file=cert_path,
            key_file=key_path,
            port=9000,
            on_device_connected=self.device_connected.emit,
            on_message_received=self.log_signal.emit,
            on_device_disconnected=self.device_disconnected.emit
        )
        self.server.start()
        self.status_bar.showMessage("Server running on port 9000 — 0 devices connected")

    def _add_device(self, device_id):
        if device_id not in self.device_ids:
            if "No Devices Connected" in [self.device_list.item(i).text() for i in range(self.device_list.count())]:
                self.device_list.clear()

            self.device_ids.add(device_id)
            self.device_list.addItem(device_id)
            self._append_log(f"[+] Device connected: {device_id}")
            self.db.log_event(device_id, "CONNECTED", "Device connected")
            self.status_bar.showMessage(f"Server running on port 9000 — {len(self.device_ids)} device(s) connected")

    def _remove_device(self, device_id):
        if device_id in self.device_ids:
            self.device_ids.remove(device_id)
            for i in range(self.device_list.count()):
                if self.device_list.item(i).text() == device_id:
                    self.device_list.takeItem(i)
                    break
            if not self.device_ids:
                self.device_list.addItem("No Devices Connected")
            self._append_log(f"[-] Device disconnected: {device_id}")
            self.db.log_event(device_id, "DISCONNECTED", "Device disconnected")
            self.status_bar.showMessage(f"Server running on port 9000 — {len(self.device_ids)} device(s) connected")

    def _append_log(self, message):
        self.log_panel.append(f"> {message}")
        if self.auto_scroll.isChecked():
            self.log_panel.moveCursor(self.log_panel.textCursor().End)
        self.db.log_event("SYSTEM", "LOG", message)

    def closeEvent(self, event):
        if self.server:
            self.server.stop()
        if self.db:
            self.db.close()
        event.accept()
