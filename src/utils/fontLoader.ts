/**
 * 字体加载工具类
 * 用于检测字体是否成功加载，提供回退机制
 */

// 调试模式控制
const DEBUG_MODE = process.env.NODE_ENV === 'development' && localStorage.getItem('font-debug') === 'true';

function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`[FontLoader] ${message}`, ...args);
  }
}

export class FontLoader {
  /**
   * 检测字体是否已加载
   * @param fontFamily 字体名称
   * @param timeout 超时时间（毫秒）
   * @returns Promise<boolean>
   */
  static async checkFontLoaded(fontFamily: string, timeout: number = 3000): Promise<boolean> {
    // 如果浏览器不支持 document.fonts API，返回 true（假设字体已加载）
    if (!document.fonts || !document.fonts.check) {
      debugLog('Browser does not support Font Loading API');
      return true;
    }

    try {
      // 使用 document.fonts.check() API 检查字体
      const isLoaded = document.fonts.check(`14px "${fontFamily}"`);
      if (isLoaded) {
        debugLog(`Font "${fontFamily}" already loaded`);
        return true;
      }

      // 如果字体未加载，等待字体加载完成
      return new Promise((resolve) => {
        let timeoutId: NodeJS.Timeout;
        
        const checkFont = () => {
          if (document.fonts.check(`14px "${fontFamily}"`)) {
            clearTimeout(timeoutId);
            debugLog(`Font "${fontFamily}" loaded successfully`);
            resolve(true);
          }
        };

        // 监听字体加载事件
        document.fonts.addEventListener('loadingdone', checkFont);
        
        // 设置超时
        timeoutId = setTimeout(() => {
          document.fonts.removeEventListener('loadingdone', checkFont);
          debugLog(`Font "${fontFamily}" failed to load within ${timeout}ms`);
          resolve(false);
        }, timeout);

        // 立即检查一次
        checkFont();
      });
    } catch (error) {
      debugLog('Error checking font load status:', error);
      return false;
    }
  }

  /**
   * 预加载字体
   * @param fontUrl 字体文件URL
   * @param fontFamily 字体名称
   * @param fontType 字体类型
   */
  static preloadFont(fontUrl: string, fontFamily: string, fontType: string = 'font/ttf'): void {
    // 创建link元素预加载字体
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = fontUrl;
    link.as = 'font';
    link.type = fontType;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // 使用FontFace API加载字体
    if ('FontFace' in window) {
      const fontFace = new FontFace(fontFamily, `url(${fontUrl})`);
      fontFace.load().then(() => {
        document.fonts.add(fontFace);
        debugLog(`Font "${fontFamily}" loaded and added to document`);
      }).catch((error) => {
        debugLog(`Failed to load font "${fontFamily}":`, error);
      });
    }
  }

  /**
   * 获取终端字体栈
   */
  static getTerminalFontStack(): string {
    return [
      'MesloLGS NF',
      'Monaco',
      'Menlo',
      '"Ubuntu Mono"',
      'Consolas',
      '"Liberation Mono"',
      '"DejaVu Sans Mono"',
      '"Courier New"',
      'monospace'
    ].join(', ');
  }

  /**
   * 获取UI字体栈
   */
  static getUIFontStack(): string {
    return [
      '"Source Han Sans CN"',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      '"Noto Sans"',
      'sans-serif'
    ].join(', ');
  }
}

// 页面加载时预加载字体
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // 预加载UI字体
    FontLoader.preloadFont('./src/assets/fonts/SourceHanSansCN-Regular.otf', 'Source Han Sans CN', 'font/otf');
    
    // 预加载终端字体
    FontLoader.preloadFont('./src/assets/fonts/MesloLGS NF Regular.ttf', 'MesloLGS NF', 'font/ttf');
    
    // 检测字体加载状态
    Promise.all([
      FontLoader.checkFontLoaded('Source Han Sans CN', 5000),
      FontLoader.checkFontLoaded('MesloLGS NF', 5000)
    ]).then(([uiFontLoaded, terminalFontLoaded]) => {
      if (uiFontLoaded && terminalFontLoaded) {
        document.documentElement.classList.add('font-loaded');
        debugLog('✅ All fonts loaded successfully');
      } else {
        document.documentElement.classList.add('font-fallback');
        debugLog('⚠️ Some fonts failed to load, using fallback fonts');
      }
    });
  });
}