#!/usr/bin/env python3
"""
终端颜色测试脚本 - 验证PTY是否支持丰富的颜色
"""

import os
import sys

def test_basic_colors():
    """测试基本16色"""
    print("\n=== 基本ANSI颜色测试 (16色) ===")
    
    # 前景色测试
    colors = [
        (30, "黑色"), (31, "红色"), (32, "绿色"), (33, "黄色"),
        (34, "蓝色"), (35, "紫色"), (36, "青色"), (37, "白色"),
        (90, "亮黑"), (91, "亮红"), (92, "亮绿"), (93, "亮黄"),
        (94, "亮蓝"), (95, "亮紫"), (96, "亮青"), (97, "亮白")
    ]
    
    for code, name in colors:
        print(f"\033[{code}m■ {name} (代码: {code})\033[0m", end="  ")
        if code == 37 or code == 97:
            print()  # 换行
    print()

def test_256_colors():
    """测试256色"""
    print("\n=== 256色测试 ===")
    
    # 系统色 (0-15)
    print("系统色 (0-15):")
    for i in range(16):
        print(f"\033[48;5;{i}m  \033[0m", end="")
        if (i + 1) % 8 == 0:
            print()
    print()
    
    # 216色立方体 (16-231)
    print("\n216色立方体 (16-231):")
    for r in range(6):
        for g in range(6):
            for b in range(6):
                color = 16 + 36 * r + 6 * g + b
                print(f"\033[48;5;{color}m  \033[0m", end="")
            print("  ", end="")
        print()
    
    # 灰度 (232-255)
    print("\n灰度色阶 (232-255):")
    for i in range(232, 256):
        print(f"\033[48;5;{i}m  \033[0m", end="")
        if (i - 231) % 12 == 0:
            print()
    print()

def test_truecolor():
    """测试24位真彩色"""
    print("\n=== 24位真彩色测试 ===")
    
    # RGB渐变测试
    print("RGB渐变:")
    for i in range(40):
        r = int(255 * i / 39)
        print(f"\033[48;2;{r};0;0m \033[0m", end="")
    print(" 红色渐变")
    
    for i in range(40):
        g = int(255 * i / 39)
        print(f"\033[48;2;0;{g};0m \033[0m", end="")
    print(" 绿色渐变")
    
    for i in range(40):
        b = int(255 * i / 39)
        print(f"\033[48;2;0;0;{b}m \033[0m", end="")
    print(" 蓝色渐变")
    
    # 彩虹效果
    print("\n彩虹效果:")
    for i in range(60):
        r = int(127 * (1 + abs((i * 6 / 60) % 2 - 1)))
        g = int(127 * (1 + abs(((i * 6 / 60) + 2) % 2 - 1)))
        b = int(127 * (1 + abs(((i * 6 / 60) + 4) % 2 - 1)))
        print(f"\033[48;2;{r};{g};{b}m \033[0m", end="")
    print()

def test_text_styles():
    """测试文本样式"""
    print("\n=== 文本样式测试 ===")
    styles = [
        (1, "粗体"),
        (2, "暗色"),
        (3, "斜体"),
        (4, "下划线"),
        (5, "闪烁"),
        (7, "反色"),
        (8, "隐藏"),
        (9, "删除线")
    ]
    
    for code, name in styles:
        print(f"\033[{code}m{name}文本 (代码: {code})\033[0m")

def print_environment_info():
    """打印环境信息"""
    print("=== 终端环境信息 ===")
    env_vars = ['TERM', 'COLORTERM', 'CLICOLOR', 'FORCE_COLOR', 'CLICOLOR_FORCE']
    for var in env_vars:
        value = os.environ.get(var, '未设置')
        print(f"{var}: {value}")
    
    print(f"Python版本: {sys.version}")
    print(f"操作系统: {os.name}")
    
    # 检测终端能力
    if hasattr(os, 'isatty') and os.isatty(1):
        print("标准输出: TTY (支持颜色)")
    else:
        print("标准输出: 非TTY (可能不支持颜色)")

def main():
    print("🌈 终端颜色支持测试")
    print("=" * 50)
    
    print_environment_info()
    test_basic_colors()
    test_256_colors()
    test_truecolor()
    test_text_styles()
    
    print("\n" + "=" * 50)
    print("测试完成！")
    print("如果你看到了丰富的颜色和样式，说明终端支持完整的颜色功能。")
    print("如果只看到普通文本，可能需要检查终端配置或环境变量。")

if __name__ == "__main__":
    main()