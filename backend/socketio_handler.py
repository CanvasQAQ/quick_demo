import subprocess
import threading
import uuid
import os
import time
import signal
from flask_socketio import SocketIO, emit
from typing import Dict, Optional, List
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
        self.processes: Dict[str, subprocess.Popen] = {}  # taskId -> process
        self.running_tasks: Dict[str, bool] = {}  # taskId -> is_running
        logger.debug("Created terminal session: %s", session_id)
    
    def execute_command(self, task_id: str, command: str):
        """执行命令并实时输出 - 支持多任务"""
        try:
            logger.debug("Executing command: %s (task: %s)", command, task_id)
            
            # 检查任务是否已存在
            if task_id in self.processes:
                logger.warning("Task %s already exists", task_id)
                return
            
            # 跨平台的命令执行，支持更好的中断处理
            if os.name == 'nt':  # Windows
                process = subprocess.Popen(
                    command,
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    bufsize=1,
                    universal_newlines=True,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                )
            else:  # Unix/Linux
                process = subprocess.Popen(
                    command,
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    bufsize=1,
                    universal_newlines=True,
                    preexec_fn=os.setsid  # 创建新的进程组
                )
            
            self.processes[task_id] = process
            self.running_tasks[task_id] = True
            
            # 启动输出读取线程
            output_thread = threading.Thread(
                target=self._read_output, 
                args=(task_id, command)
            )
            output_thread.daemon = True
            output_thread.start()
            
        except Exception as e:
            logger.error("Failed to execute command: %s", e)
            self.socketio.emit('terminal_error', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'error': 'Failed to start command: ' + str(e)
            })
    
    def _read_output(self, task_id: str, command: str):
        """读取命令输出 - 多任务版本"""
        try:
            logger.debug("Starting output reading for task: %s", task_id)
            
            process = self.processes.get(task_id)
            if not process or not process.stdout:
                return
            
            # 逐行读取输出
            while True:
                line = process.stdout.readline()
                if not line:
                    if process.poll() is not None:
                        break
                    time.sleep(0.1)
                    continue
                
                logger.debug("Output from task %s: %s", task_id, line.strip())
                # 确保每行输出都包含换行符
                output_line = line.rstrip('\r\n') + '\n'
                self.socketio.emit('terminal_output', {
                    'sessionId': self.session_id,
                    'taskId': task_id,
                    'output': output_line,
                    'type': 'stdout'
                })
        
            # 发送完成信号
            return_code = process.poll() if process else -1
            logger.debug("Task %s completed with return code: %s", task_id, return_code)
            
            self.socketio.emit('terminal_complete', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'exitCode': return_code
                # 移除message，不在终端中显示退出码
            })
            
            self.socketio.emit('terminal_status', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'status': 'idle'
            })
            
        except Exception as e:
            logger.error("Error in output reading thread for task %s: %s", task_id, e)
            self.socketio.emit('terminal_error', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'error': 'Output reading failed: ' + str(e)
            })
        finally:
            # 清理任务状态
            self.running_tasks[task_id] = False
            logger.debug("Output reading thread finished for task: %s", task_id)
    
    def interrupt_command(self, task_id: str):
        """中断指定任务"""
        logger.debug("Interrupting task: %s", task_id)
        
        process = self.processes.get(task_id)
        if not process or process.poll() is not None:
            logger.debug("No running process for task: %s", task_id)
            return False
            
        try:
            if os.name == 'nt':  # Windows
                # Windows: 尝试优雅终止，如果失败则强制终止
                try:
                    process.terminate()
                    # 等待短时间看是否优雅退出
                    try:
                        process.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        # 强制杀死进程
                        process.kill()
                        process.wait()
                except Exception as e:
                    logger.error("Failed to terminate Windows process: %s", e)
                    return False
            else:  # Unix/Linux  
                # Unix/Linux: 发送SIGTERM到整个进程组
                try:
                    import signal
                    # 发送SIGTERM到进程组
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                    # 等待进程退出
                    try:
                        process.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        # 如果SIGTERM不起作用，发送SIGKILL
                        logger.warning("SIGTERM timeout, sending SIGKILL to task %s", task_id)
                        os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                        process.wait()
                except ProcessLookupError:
                    # 进程已经退出
                    logger.debug("Process already terminated for task: %s", task_id)
                except Exception as e:
                    logger.error("Failed to terminate Unix process: %s", e)
                    return False
            
            # 立即更新状态
            self.running_tasks[task_id] = False
            
            # 发送中断通知
            self.socketio.emit('terminal_output', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'output': '\n^C (interrupted)\n',
                'type': 'system'
            })
            
            self.socketio.emit('terminal_complete', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'exitCode': -2  # 中断退出码
                # 移除message，不在终端中显示中断信息
            })
            
            self.socketio.emit('terminal_status', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'status': 'idle'
            })
            
            logger.info("Task interrupted successfully: %s", task_id)
            return True
            
        except Exception as e:
            logger.error("Failed to interrupt task %s: %s", task_id, e)
            self.socketio.emit('terminal_error', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'error': 'Failed to interrupt command: ' + str(e)
            })
            return False
    
    def cleanup(self):
        """清理资源 - 支持多任务版本"""
        logger.debug("Cleaning up session: %s", self.session_id)
        
        # 清理所有进程
        for task_id, process in list(self.processes.items()):
            if process.poll() is None:
                try:
                    if os.name == 'nt':  # Windows
                        process.terminate()
                        try:
                            process.wait(timeout=2)
                        except subprocess.TimeoutExpired:
                            process.kill()
                            process.wait()
                    else:  # Unix/Linux
                        # 终止整个进程组
                        try:
                            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                            process.wait(timeout=2)
                        except (subprocess.TimeoutExpired, ProcessLookupError):
                            try:
                                os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                                process.wait()
                            except ProcessLookupError:
                                pass  # 进程已经退出
                except Exception as e:
                    logger.error("Error cleaning up process for task %s: %s", task_id, e)
        
        # 清理状态
        self.processes.clear()
        self.running_tasks.clear()
        
    def get_running_tasks(self) -> List[str]:
        """获取正在运行的任务列表"""
        return [task_id for task_id, is_running in self.running_tasks.items() if is_running]
    
    def get_task_status(self, task_id: str) -> str:
        """获取任务状态"""
        if task_id not in self.processes:
            return 'not_found'
        
        process = self.processes[task_id]
        if process.poll() is None:
            return 'running'
        else:
            return 'completed'

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
            task_id = data.get('taskId')  # 新增taskId字段
            command = data.get('command')
            
            if not session_id or session_id not in self.sessions:
                error_msg = 'Session not found: ' + (session_id or 'unknown')
                logger.error(error_msg)
                emit('terminal_error', {
                    'sessionId': session_id or 'unknown',
                    'taskId': task_id,
                    'error': error_msg
                })
                return
            
            if not task_id:
                error_msg = 'Task ID is required'
                logger.error(error_msg)
                emit('terminal_error', {
                    'sessionId': session_id,
                    'taskId': task_id,
                    'error': error_msg
                })
                return
            
            if not command or not command.strip():
                error_msg = 'Empty command'
                logger.error(error_msg)
                emit('terminal_error', {
                    'sessionId': session_id,
                    'taskId': task_id,
                    'error': error_msg
                })
                return
            
            session = self.sessions[session_id]
            
            # 检查任务是否已存在
            if task_id in session.processes:
                error_msg = 'Task already exists'
                logger.error(error_msg)
                emit('terminal_error', {
                    'sessionId': session_id,
                    'taskId': task_id,
                    'error': error_msg
                })
                return
            
            # 发送执行状态
            logger.debug("Starting command execution: %s (task: %s)", command, task_id)
            emit('terminal_status', {
                'sessionId': session_id,
                'taskId': task_id,
                'status': 'executing',
                'command': command
            })
            
            # 在新线程中执行命令
            thread = threading.Thread(
                target=session.execute_command,
                args=(task_id, command.strip())
            )
            thread.daemon = True
            thread.start()
        
        @self.socketio.on('terminal_interrupt')
        def handle_interrupt(data):
            logger.debug("Received terminal_interrupt event: %s", data)
            session_id = data.get('sessionId')
            task_id = data.get('taskId')  # 新增taskId字段
            
            if not session_id or session_id not in self.sessions:
                error_msg = 'Session not found: ' + (session_id or 'unknown')
                logger.error(error_msg)
                emit('terminal_error', {
                    'sessionId': session_id or 'unknown',
                    'taskId': task_id,
                    'error': error_msg
                })
                return
            
            if not task_id:
                error_msg = 'Task ID is required for interrupt'
                logger.error(error_msg)
                emit('terminal_error', {
                    'sessionId': session_id,
                    'taskId': task_id,
                    'error': error_msg
                })
                return
            
            session = self.sessions[session_id]
            
            # 检查任务是否存在和正在运行
            if task_id not in session.processes:
                logger.debug("Task not found for interrupt: %s", task_id)
                emit('terminal_output', {
                    'sessionId': session_id,
                    'taskId': task_id,
                    'output': 'Task not found.\n',
                    'type': 'system'
                })
                return
            
            if not session.running_tasks.get(task_id, False):
                logger.debug("No running task to interrupt: %s", task_id)
                emit('terminal_output', {
                    'sessionId': session_id,
                    'taskId': task_id,
                    'output': 'No running command to interrupt.\n',
                    'type': 'system'
                })
                return
            
            # 中断指定任务
            success = session.interrupt_command(task_id)
            if success:
                logger.info("Task interrupt initiated: %s", task_id)
            else:
                emit('terminal_error', {
                    'sessionId': session_id,
                    'taskId': task_id,
                    'error': 'Failed to interrupt command'
                })
        
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
