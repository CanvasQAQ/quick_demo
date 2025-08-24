import sys
from flask import Flask, jsonify
import logging

# 禁用Flask的默认日志
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Flask server is running'})

@app.route('/')
def index():
    return jsonify({'message': 'Flask server is running'})

@app.route('/api/data')
def get_data():
    return jsonify({'data': 'Hello from Flask!'})

if __name__ == '__main__':
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    else:
        port = 5000
    
    print(f"Starting Flask server on port {port}")
    print(f" * Running on http://127.0.0.1:{port}")
    print(f" * Health check: http://127.0.0.1:{port}/health")
    
    # 禁用调试信息和访问日志
    app.run(
        host='127.0.0.1', 
        port=port, 
        debug=False,
        use_reloader=False
    )
