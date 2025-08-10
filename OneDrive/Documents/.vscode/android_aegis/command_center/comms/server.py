import socket
import ssl
import threading

class SecureServer(threading.Thread):
    def __init__(self, cert_file, key_file, port, on_device_connected, on_message_received, on_device_disconnected):
        super().__init__()
        self.cert_file = cert_file
        self.key_file = key_file
        self.port = port
        self.on_device_connected = on_device_connected
        self.on_message_received = on_message_received
        self.on_device_disconnected = on_device_disconnected
        self.clients = {}
        self.running = True

    def run(self):
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile=self.cert_file, keyfile=self.key_file)

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM, 0) as sock:
            sock.bind(('0.0.0.0', self.port))
            sock.listen(5)

            with context.wrap_socket(sock, server_side=True) as ssock:
                self.on_message_received("Secure server started on port {}".format(self.port))
                while self.running:
                    try:
                        conn, addr = ssock.accept()
                        threading.Thread(target=self.handle_client, args=(conn, addr), daemon=True).start()
                    except Exception as e:
                        self.on_message_received(f"Server error: {e}")

    def handle_client(self, conn, addr):
        try:
            device_id = conn.recv(1024).decode("utf-8").strip()
            self.clients[device_id] = conn
            self.on_device_connected(device_id)

            while True:
                data = conn.recv(4096)
                if not data:
                    break
                self.on_message_received(f"[{device_id}] {data.decode('utf-8')}")

        except Exception as e:
            self.on_message_received(f"[!] Error with {addr}: {e}")
        finally:
            self.on_device_disconnected(device_id)
            conn.close()

    def stop(self):
        self.running = False
