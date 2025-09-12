import os
import pty
import select
import subprocess
import threading
import uuid
import time
import signal
from flask_socketio import SocketIO, emit
from typing import Dict, Optional, List
import logging
import termios
import struct
import fcntl

# 配置日志
logging.basicConfig(
    level=logging.INFO,  # 改为INFO级别，减少DEBUG输出
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('PtyTerminalHandler')

# 调试模式控制
DEBUG_MODE = os.environ.get('PTY_DEBUG', 'false').lower() == 'true'

def debug_log(message: str, *args):
    """仅在调试模式下输出日志"""
    if DEBUG_MODE:
        logger.debug(message, *args)

def info_log(message: str, *args):
    """重要信息日志"""
    logger.info(message, *args)

class PtyTerminalSession:
    def __init__(self, session_id: str, socketio: SocketIO):
        self.session_id = session_id
        self.socketio = socketio
        self.terminals: Dict[str, dict] = {}  # taskId -> {master_fd, slave_fd, process, thread}
        self.running_tasks: Dict[str, bool] = {}  # taskId -> is_running
        debug_log("Created pty terminal session: %s", session_id)
    
    def create_terminal(self, task_id: str, command: str, rows: int = 24, cols: int = 80):
        """创建新的pty终端"""
        try:
            debug_log("Creating pty terminal for task: %s, command: %s", task_id, command)
            
            # 检查任务是否已存在
            if task_id in self.terminals:
                debug_log("Terminal %s already exists", task_id)
                return False
            
            # 创建pty
            master_fd, slave_fd = pty.openpty()
            
            # 设置终端尺寸
            self._set_terminal_size(master_fd, rows, cols)
            
            # 创建进程
            env = os.environ.copy()
            env['TERM'] = 'xterm-256color'
            env['COLORTERM'] = 'truecolor'  # 支持24位真彩色
            env['COLUMNS'] = str(cols)
            env['LINES'] = str(rows)
            # 强制启用颜色输出
            env['CLICOLOR'] = '1'
            env['FORCE_COLOR'] = '1'
            env['CLICOLOR_FORCE'] = '1'
            # 禁用分页器以确保颜色输出
            env['PAGER'] = 'cat'
            env['LESS'] = '-R'  # 允许ANSI颜色通过
            # Python特定的颜色强制
            env['PYTHONUNBUFFERED'] = '1'
            env['PY_COLORS'] = '1'
            
            if os.name == 'nt':  # Windows - 使用winpty或者fallback到subprocess
                # Windows下pty支持有限，可能需要特殊处理
                process = subprocess.Popen(
                    command,
                    shell=True,
                    stdin=slave_fd,
                    stdout=slave_fd,
                    stderr=slave_fd,
                    env=env,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                )
            else:  # Unix/Linux
                process = subprocess.Popen(
                    command,
                    shell=True,
                    stdin=slave_fd,
                    stdout=slave_fd,
                    stderr=slave_fd,
                    env=env,
                    preexec_fn=os.setsid
                )
            
            # 关闭子进程中的slave端
            os.close(slave_fd)
            
            # 设置master端为非阻塞
            fcntl.fcntl(master_fd, fcntl.F_SETFL, os.O_NONBLOCK)
            
            # 保存终端信息
            self.terminals[task_id] = {
                'master_fd': master_fd,
                'process': process,
                'command': command,
                'rows': rows,
                'cols': cols,
                'created_at': time.time()
            }
            self.running_tasks[task_id] = True
            
            # 启动输出读取线程
            output_thread = threading.Thread(
                target=self._read_pty_output, 
                args=(task_id,)
            )
            output_thread.daemon = True
            output_thread.start()
            
            self.terminals[task_id]['thread'] = output_thread
            
            info_log("Terminal created for task: %s", task_id)
            return True
            
        except Exception as e:
            logger.error("Failed to create pty terminal for task %s: %s", task_id, e)
            # 清理资源
            if task_id in self.terminals:
                terminal_info = self.terminals[task_id]
                if 'master_fd' in terminal_info:
                    try:
                        os.close(terminal_info['master_fd'])
                    except:
                        pass
                del self.terminals[task_id]
            return False
    
    def _set_terminal_size(self, fd: int, rows: int, cols: int):
        """设置终端尺寸"""
        try:
            size = struct.pack('HHHH', rows, cols, 0, 0)
            fcntl.ioctl(fd, termios.TIOCSWINSZ, size)
        except Exception as e:
            debug_log("Failed to set terminal size: %s", e)
    
    def resize_terminal(self, task_id: str, rows: int, cols: int):
        """调整终端尺寸"""
        if task_id in self.terminals:
            terminal_info = self.terminals[task_id]
            self._set_terminal_size(terminal_info['master_fd'], rows, cols)
            terminal_info['rows'] = rows
            terminal_info['cols'] = cols
            debug_log("Resized terminal %s to %dx%d", task_id, rows, cols)
            return True
        return False
    
    def write_to_terminal(self, task_id: str, data: str):
        """向终端写入数据（用户输入）"""
        if task_id not in self.terminals:
            debug_log("Terminal %s not found", task_id)
            return False
        
        terminal_info = self.terminals[task_id]
        try:
            # 将字符串编码为字节
            data_bytes = data.encode('utf-8')
            os.write(terminal_info['master_fd'], data_bytes)
            debug_log("Wrote %d bytes to terminal %s", len(data_bytes), task_id)
            return True
        except Exception as e:
            logger.error("Failed to write to terminal %s: %s", task_id, e)
            return False
    
    def _read_pty_output(self, task_id: str):
        """读取pty输出"""
        terminal_info = self.terminals.get(task_id)
        if not terminal_info:
            return
        
        master_fd = terminal_info['master_fd']
        process = terminal_info['process']
        
        try:
            debug_log("Starting pty output reading for task: %s", task_id)
            
            while True:
                # 检查进程是否还在运行
                if process.poll() is not None:
                    debug_log("Process for task %s has terminated", task_id)
                    break
                
                # 使用select检查是否有数据可读
                ready, _, _ = select.select([master_fd], [], [], 0.1)
                
                if ready:
                    try:
                        # 读取数据
                        data = os.read(master_fd, 4096)
                        if data:
                            # 解码并发送到前端
                            output = data.decode('utf-8', errors='replace')
                            debug_log("Read %d bytes from pty %s", len(data), task_id)
                            
                            self.socketio.emit('terminal_output', {
                                'sessionId': self.session_id,
                                'taskId': task_id,
                                'output': output,
                                'type': 'pty'
                            })
                        else:
                            # EOF
                            break
                    except OSError as e:
                        if e.errno == 5:  # EIO - 通常表示pty已关闭
                            debug_log("PTY closed for task %s", task_id)
                            break
                        else:
                            logger.error("Error reading from pty %s: %s", task_id, e)
                            break
            
            # 进程结束处理
            return_code = process.poll() if process else -1
            info_log("Task %s completed with code: %s", task_id, return_code)
            
            self.socketio.emit('terminal_complete', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'exitCode': return_code,
                'message': f'Process exited with code {return_code}'
            })
            
            self.socketio.emit('terminal_status', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'status': 'idle'
            })
            
        except Exception as e:
            logger.error("Error in pty output reading thread for task %s: %s", task_id, e)
            self.socketio.emit('terminal_error', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'error': f'PTY reading failed: {str(e)}'
            })
        finally:
            # 清理任务状态
            self.running_tasks[task_id] = False
            debug_log("PTY output reading thread finished for task: %s", task_id)
    
    def interrupt_terminal(self, task_id: str):
        """中断指定终端"""
        logger.debug("Interrupting terminal: %s", task_id)
        
        if task_id not in self.terminals:
            logger.debug("No terminal found for task: %s", task_id)
            return False
        
        terminal_info = self.terminals[task_id]
        process = terminal_info['process']
        
        if process.poll() is not None:
            logger.debug("Process already terminated for task: %s", task_id)
            return False
        
        try:
            if os.name == 'nt':  # Windows
                # Windows处理
                try:
                    process.terminate()
                    try:
                        process.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
                except Exception as e:
                    logger.error("Failed to terminate Windows process: %s", e)
                    return False
            else:  # Unix/Linux
                # Unix/Linux: 发送SIGTERM到进程组
                try:
                    # 首先尝试发送Ctrl+C (SIGINT)
                    os.write(terminal_info['master_fd'], b'\x03')  # Ctrl+C
                    
                    # 等待一下看是否响应
                    time.sleep(0.5)
                    if process.poll() is None:
                        # 如果还没退出，发送SIGTERM
                        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                        try:
                            process.wait(timeout=3)
                        except subprocess.TimeoutExpired:
                            # 最后使用SIGKILL
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
                'output': '\r\n^C (interrupted)\r\n',
                'type': 'system'
            })
            
            self.socketio.emit('terminal_complete', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'exitCode': -2,  # 中断退出码
                'message': 'Terminal interrupted by user'
            })
            
            logger.info("Terminal interrupted successfully: %s", task_id)
            return True
            
        except Exception as e:
            logger.error("Failed to interrupt terminal %s: %s", task_id, e)
            self.socketio.emit('terminal_error', {
                'sessionId': self.session_id,
                'taskId': task_id,
                'error': f'Failed to interrupt terminal: {str(e)}'
            })
            return False
    
    def cleanup(self):
        """清理资源"""
        logger.debug("Cleaning up pty session: %s", self.session_id)
        
        # 清理所有终端
        for task_id, terminal_info in list(self.terminals.items()):
            try:
                # 关闭进程
                process = terminal_info.get('process')
                if process and process.poll() is None:
                    try:
                        if os.name == 'nt':
                            process.terminate()
                        else:
                            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                        process.wait(timeout=2)
                    except:
                        try:
                            if os.name == 'nt':
                                process.kill()
                            else:
                                os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                            process.wait()
                        except:
                            pass
                
                # 关闭pty master端
                master_fd = terminal_info.get('master_fd')
                if master_fd:
                    try:
                        os.close(master_fd)
                    except:
                        pass
                        
            except Exception as e:
                logger.error("Error cleaning up terminal %s: %s", task_id, e)
        
        # 清理状态
        self.terminals.clear()
        self.running_tasks.clear()
    
    def get_running_tasks(self) -> List[str]:
        """获取正在运行的任务列表"""
        return [task_id for task_id, is_running in self.running_tasks.items() if is_running]
    
    def get_task_status(self, task_id: str) -> str:
        """获取任务状态"""
        if task_id not in self.terminals:
            return 'not_found'
        
        terminal_info = self.terminals[task_id]
        process = terminal_info.get('process')
        if process and process.poll() is None:
            return 'running'
        else:
            return 'completed'

class PtyTerminalHandler:
    def __init__(self, socketio: SocketIO):
        self.socketio = socketio
        self.sessions: Dict[str, PtyTerminalSession] = {}
        self.register_handlers()
        logger.info("PtyTerminalHandler initialized")
    
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
            self.sessions[session_id] = PtyTerminalSession(session_id, self.socketio)
            
            emit('terminal_connected', {
                'sessionId': session_id,
                'message': 'PTY Terminal session established',
                'features': ['pty', 'ansi_colors', 'interactive', 'resize']
            })
            
            logger.info("New pty terminal session created: %s", session_id)
        
        @self.socketio.on('terminal_command')
        def handle_command(data):
            logger.debug("Received terminal_command event: %s", data)
            session_id = data.get('sessionId')
            task_id = data.get('taskId')
            command = data.get('command')
            rows = data.get('rows', 24)
            cols = data.get('cols', 80)
            
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
            if task_id in session.terminals:
                error_msg = 'Terminal already exists'
                logger.error(error_msg)
                emit('terminal_error', {
                    'sessionId': session_id,
                    'taskId': task_id,
                    'error': error_msg
                })
                return
            
            # 发送执行状态
            emit('terminal_status', {
                'sessionId': session_id,
                'taskId': task_id,
                'status': 'creating',
                'command': command
            })
            
            # 在新线程中创建终端
            def create_terminal_async():
                success = session.create_terminal(task_id, command.strip(), rows, cols)
                if success:
                    self.socketio.emit('terminal_status', {
                        'sessionId': session_id,
                        'taskId': task_id,
                        'status': 'running',
                        'command': command
                    })
                else:
                    self.socketio.emit('terminal_error', {
                        'sessionId': session_id,
                        'taskId': task_id,
                        'error': 'Failed to create terminal'
                    })
            
            thread = threading.Thread(target=create_terminal_async)
            thread.daemon = True
            thread.start()
        
        @self.socketio.on('terminal_input')
        def handle_input(data):
            """处理终端输入"""
            logger.debug("Received terminal_input event: %s", data)
            session_id = data.get('sessionId')
            task_id = data.get('taskId')
            input_data = data.get('data', '')
            
            if not session_id or session_id not in self.sessions:
                logger.error("Session not found: %s", session_id)
                return
            
            if not task_id:
                logger.error("Task ID is required for input")
                return
            
            session = self.sessions[session_id]
            success = session.write_to_terminal(task_id, input_data)
            
            if not success:
                emit('terminal_error', {
                    'sessionId': session_id,
                    'taskId': task_id,
                    'error': 'Failed to send input to terminal'
                })
        
        @self.socketio.on('terminal_resize')
        def handle_resize(data):
            """处理终端尺寸调整"""
            logger.debug("Received terminal_resize event: %s", data)
            session_id = data.get('sessionId')
            task_id = data.get('taskId')
            rows = data.get('rows', 24)
            cols = data.get('cols', 80)
            
            if session_id in self.sessions:
                session = self.sessions[session_id]
                session.resize_terminal(task_id, rows, cols)
        
        @self.socketio.on('terminal_interrupt')
        def handle_interrupt(data):
            logger.debug("Received terminal_interrupt event: %s", data)
            session_id = data.get('sessionId')
            task_id = data.get('taskId')
            
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
            
            # 检查终端是否存在
            if task_id not in session.terminals:
                logger.debug("Terminal not found for interrupt: %s", task_id)
                emit('terminal_output', {
                    'sessionId': session_id,
                    'taskId': task_id,
                    'output': 'Terminal not found.\r\n',
                    'type': 'system'
                })
                return
            
            if not session.running_tasks.get(task_id, False):
                logger.debug("No running terminal to interrupt: %s", task_id)
                emit('terminal_output', {
                    'sessionId': session_id,
                    'taskId': task_id,
                    'output': 'No running terminal to interrupt.\r\n',
                    'type': 'system'
                })
                return
            
            # 中断指定终端
            success = session.interrupt_terminal(task_id)
            if success:
                logger.info("Terminal interrupt initiated: %s", task_id)
            else:
                emit('terminal_error', {
                    'sessionId': session_id,
                    'taskId': task_id,
                    'error': 'Failed to interrupt terminal'
                })
        
        @self.socketio.on('terminal_disconnect')
        def handle_disconnect_event(data):
            session_id = data.get('sessionId')
            logger.debug("Received terminal_disconnect for session: %s", session_id)
            if session_id in self.sessions:
                session = self.sessions[session_id]
                session.cleanup()
                del self.sessions[session_id]
                logger.info("PTY Terminal session terminated: %s", session_id)
    
    def cleanup_all_sessions(self):
        """清理所有会话"""
        for session_id, session in list(self.sessions.items()):
            session.cleanup()
            del self.sessions[session_id]
        logger.info("All pty terminal sessions cleaned up")

# 全局清理函数
def cleanup_pty_terminals():
    """清理所有pty终端会话"""
    global pty_terminal_handler
    if pty_terminal_handler:
        pty_terminal_handler.cleanup_all_sessions()
        logger.info("All pty terminal sessions cleaned up")

import atexit
atexit.register(cleanup_pty_terminals)