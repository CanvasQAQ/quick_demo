import subprocess
import threading
import uuid
import os
import time
from flask_socketio import SocketIO, emit
from typing import Dict, Optional
import logging

# 配置日志 - Windows 兼容
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('TerminalHandler')

class TerminalSession:
    def __init__(self, session_id: str, socketio: SocketIO):
        self.session_id = session_id
        self.socketio = socketio
        self.process: Optional[subprocess.Popen] = None
        self.is_running = False
        logger.debug("Created terminal session: %s", session_id)
    
    def execute_command(self, command: str):
        """执行命令并实时输出 - Windows 兼容版本"""
        try:
            logger.debug("Executing command: %s", command)
            
            # Windows 兼容的命令执行
            self.process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                bufsize=1,
                universal_newlines=True,
                # Windows 特定设置
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
            )
            
            self.is_running = True
            
            # 启动输出读取线程
            output_thread = threading.Thread(target=self._read_output)
            output_thread.daemon = True
            output_thread.start()
            
        except Exception as e:
            logger.error("Failed to execute command: %s", e)
            self.socketio.emit('terminal_error', {
                'sessionId': self.session_id,
                'error': 'Failed to start command: ' + str(e)
            })
    
    def _read_output(self):
        """读取命令输出 - Windows 兼容版本"""
        try:
            logger.debug("Starting output reading for session: %s", self.session_id)
            
            if self.process and self.process.stdout:
                # 逐行读取输出
                while True:
                    line = self.process.stdout.readline()
                    if not line:
                        if self.process.poll() is not None:
                            break
                        time.sleep(0.1)
                        continue
                    
                    logger.debug("Output: %s", line.strip())
                    self.socketio.emit('terminal_output', {
                        'sessionId': self.session_id,
                        'output': line.rstrip(),
                        'type': 'stdout'
                    })
            
            # 发送完成信号
            return_code = self.process.poll() if self.process else -1
            logger.debug("Command completed with return code: %s", return_code)
            
            self.socketio.emit('terminal_complete', {
                'sessionId': self.session_id,
                'exitCode': return_code,
                'message': 'Command execution completed with code ' + str(return_code)
            })
            
            self.socketio.emit('terminal_status', {
                'sessionId': self.session_id,
                'status': 'idle'
            })
            
        except Exception as e:
            logger.error("Error in output reading thread: %s", e)
            self.socketio.emit('terminal_error', {
                'sessionId': self.session_id,
                'error': 'Output reading failed: ' + str(e)
            })
        finally:
            self.is_running = False
            logger.debug("Output reading thread finished for session: %s", self.session_id)
    
    def cleanup(self):
        """清理资源 - Windows 兼容版本"""
        logger.debug("Cleaning up session: %s", self.session_id)
        if self.process and self.process.poll() is None:
            try:
                # Windows 使用不同的终止方式
                if os.name == 'nt':  # Windows
                    self.process.terminate()
                else:  # Unix/Linux
                    self.process.terminate()
                self.process.wait(timeout=2)
            except:
                try:
                    self.process.kill()
                except:
                    pass
        self.is_running = False

class TerminalHandler:
    def __init__(self, socketio: SocketIO):
        self.socketio = socketio
        self.sessions: Dict[str, TerminalSession] = {}
        self.register_handlers()
        logger.info("TerminalHandler initialized")
    
    def register_handlers(self):
        """注册SocketIO事件处理器"""
        
        @self.socketio.on('connect')
        def handle_connect():
            logger.debug("Client connected to SocketIO")
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            logger.debug("Client disconnected from SocketIO")
        
        @self.socketio.on('terminal_connect')
        def handle_connect_event(data):
            logger.debug("Received terminal_connect event: %s", data)
            session_id = str(uuid.uuid4())
            self.sessions[session_id] = TerminalSession(session_id, self.socketio)
            
            logger.debug("Emitting terminal_connected for session: %s", session_id)
            emit('terminal_connected', {
                'sessionId': session_id,
                'message': 'Terminal session established'
            })
            
            logger.info("New terminal session created: %s", session_id)
        
        @self.socketio.on('terminal_command')
        def handle_command(data):
            logger.debug("Received terminal_command event: %s", data)
            session_id = data.get('sessionId')
            command = data.get('command')
            
            if not session_id or session_id not in self.sessions:
                error_msg = 'Session not found: ' + (session_id or 'unknown')
                logger.error(error_msg)
                emit('terminal_error', {
                    'sessionId': session_id or 'unknown',
                    'error': error_msg
                })
                return
            
            if not command or not command.strip():
                error_msg = 'Empty command'
                logger.error(error_msg)
                emit('terminal_error', {
                    'sessionId': session_id,
                    'error': error_msg
                })
                return
            
            session = self.sessions[session_id]
            
            if session.is_running:
                error_msg = 'Another command is already running'
                logger.error(error_msg)
                emit('terminal_error', {
                    'sessionId': session_id,
                    'error': error_msg
                })
                return
            
            # 发送执行状态
            logger.debug("Starting command execution: %s", command)
            emit('terminal_status', {
                'sessionId': session_id,
                'status': 'executing',
                'command': command
            })
            
            # 在新线程中执行命令
            thread = threading.Thread(
                target=session.execute_command,
                args=(command.strip(),)
            )
            thread.daemon = True
            thread.start()
        
        @self.socketio.on('terminal_disconnect')
        def handle_disconnect_event(data):
            session_id = data.get('sessionId')
            logger.debug("Received terminal_disconnect for session: %s", session_id)
            if session_id in self.sessions:
                session = self.sessions[session_id]
                session.cleanup()
                del self.sessions[session_id]
                logger.info("Terminal session terminated: %s", session_id)
    
    def cleanup_all_sessions(self):
        """清理所有会话"""
        for session_id, session in list(self.sessions.items()):
            session.cleanup()
            del self.sessions[session_id]
        logger.info("All terminal sessions cleaned up")

# 全局清理函数
def cleanup_terminals():
    """清理所有终端会话"""
    global terminal_handler
    if terminal_handler:
        terminal_handler.cleanup_all_sessions()
        logger.info("All terminal sessions cleaned up")

import atexit
atexit.register(cleanup_terminals)
