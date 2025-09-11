import eventlet
eventlet.monkey_patch()
import sys
from flask import Flask, jsonify
import logging
from flask_socketio import SocketIO
from flask_cors import CORS



# 配置日志 - Windows 兼容
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-terminal'
app.config['DEBUG'] = True
CORS(app, resources={r"/*": {"origins": "*"}})

# 初始化 SocketIO
socketio = SocketIO(app, 
                   cors_allowed_origins="*", 
                   async_mode='eventlet',
                   logger=True,
                   engineio_logger=True)

# 导入并初始化PTY终端处理器
try:
    from pty_handler import PtyTerminalHandler
    pty_terminal_handler = PtyTerminalHandler(socketio)
    print("[INFO] PTY Terminal handler initialized successfully")
    terminal_handler = pty_terminal_handler  # 保持向后兼容的变量名
except ImportError as e:
    print(f"[ERROR] Failed to import pty_handler: {e}")
    # Fallback to old handler
    try:
        from socketio_handler import TerminalHandler
        terminal_handler = TerminalHandler(socketio)
        print("[INFO] Fallback to old terminal handler")
    except Exception as e2:
        print(f"[ERROR] Failed to initialize any terminal handler: {e2}")
        terminal_handler = None
except Exception as e:
    print(f"[ERROR] Failed to initialize PTY terminal handler: {e}")
    terminal_handler = None

@app.route('/health')
def health_check():
    terminal_status = 'available' if terminal_handler else 'unavailable'
    terminal_type = 'pty' if hasattr(terminal_handler, 'sessions') and hasattr(list(terminal_handler.sessions.values())[0] if terminal_handler.sessions else type('dummy', (), {}), 'terminals') else 'basic'
    return jsonify({
        'status': 'healthy', 
        'message': 'Flask server is running',
        'terminal': {
            'status': terminal_status,
            'type': terminal_type,
            'features': ['pty', 'ansi_colors', 'interactive', 'resize', 'multi_task'] if terminal_type == 'pty' else ['basic', 'multi_task']
        }
    })

@app.route('/')
def index():
    return jsonify({'message': 'Flask server with terminal support is running'})

@app.route('/api/data')
def get_data():
    return jsonify({'data': 'Hello from Flask!'})

if __name__ == '__main__':
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    else:
        port = 5000
    
    print(f"Starting Flask server with SocketIO on port {port}")
    print(f" * Running on http://127.0.0.1:{port}")
    print(f" * Health check: http://127.0.0.1:{port}/health")
    print(f" * WebSocket endpoint: ws://127.0.0.1:{port}")
    
    # 使用 SocketIO 运行应用
    socketio.run(
        app,
        host='127.0.0.1', 
        port=port, 
        debug=True,
        use_reloader=False,
        log_output=True
    )
