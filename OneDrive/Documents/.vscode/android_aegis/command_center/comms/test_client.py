import socket
import ssl
import time

SERVER_HOST = 'localhost'
SERVER_PORT = 9000
DEVICE_ID = 'sentinel_01'
MESSAGE = 'Hello from Sentinel!'

context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
context.check_hostname = False
context.verify_mode = ssl.CERT_NONE  # WARNING: In production, verify certs!

with socket.create_connection((SERVER_HOST, SERVER_PORT)) as sock:
    with context.wrap_socket(sock, server_hostname=SERVER_HOST) as ssock:
        print("[CLIENT] Connected to Command Center")

        # Send device ID
        ssock.sendall(DEVICE_ID.encode('utf-8'))
        time.sleep(1)  # Wait a bit before sending the message

        # Send a test message
        ssock.sendall(MESSAGE.encode('utf-8'))
        print(f"[CLIENT] Sent message: {MESSAGE}")

        time.sleep(2)  # Keep connection alive briefly
