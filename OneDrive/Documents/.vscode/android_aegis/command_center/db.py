import sqlite3
import os
from datetime import datetime

class LogDatabase:
    def __init__(self, db_path="command_center/aegis_logs.db"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self._create_table()

    def _create_table(self):
        with self.conn:
            self.conn.execute('''
                CREATE TABLE IF NOT EXISTS logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    device_id TEXT,
                    event_type TEXT,
                    message TEXT
                )
            ''')

    def log_event(self, device_id, event_type, message):
        timestamp = datetime.utcnow().isoformat()
        with self.conn:
            self.conn.execute(
                'INSERT INTO logs (timestamp, device_id, event_type, message) VALUES (?, ?, ?, ?)',
                (timestamp, device_id, event_type, message)
            )

    def close(self):
        self.conn.close()
