#!/usr/bin/env python3
"""
字体测试脚本 - 验证等宽字体显示效果
"""

def test_monospace_alignment():
    """测试等宽字体对齐效果"""
    print("🔤 等宽字体对齐测试")
    print("=" * 60)
    
    # 测试不同字符的宽度一致性
    test_lines = [
        "1234567890 ABCDEFGHIJ abcdefghij",
        "!@#$%^&*() []{}()<>\"' .,;:?/\\|`~",
        "iiiiiiiiii MMMMMMMMMM wwwwwwwwww",
        ".......... ---------- __________",
        "|||||||||| ////////// \\\\\\\\\\\\\\\\\\\\",
    ]
    
    print("字符宽度一致性测试:")
    for line in test_lines:
        print(f"│{line}│")
    print("└" + "─" * 58 + "┘")
    
    # 测试编程相关符号
    print("\n📝 编程符号显示测试:")
    code_examples = [
        "const func = () => {",
        "  if (condition && !flag) {",
        "    return value ?? 'default';",
        "  }",
        "  // 注释: λ × ÷ ≠ ≤ ≥ ∆ π",
        "};",
        "",
        "def fibonacci(n: int) -> int:",
        "    return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)",
        "",
        "SELECT * FROM users WHERE id IN (1,2,3);",
        "",
        "git log --oneline --graph --decorate --all"
    ]
    
    for code in code_examples:
        print(f"  {code}")
    
    # 测试表格对齐
    print("\n📊 表格对齐测试:")
    table_data = [
        ("PID", "Command", "CPU%", "Memory"),
        ("---", "-------", "----", "------"),
        ("1234", "python3", "12.5", "256MB"),
        ("5678", "node", "8.3", "512MB"),
        ("9012", "electron", "25.1", "1.2GB"),
    ]
    
    for row in table_data:
        print(f"│{row[0]:>6}│{row[1]:<12}│{row[2]:>6}│{row[3]:>8}│")
    
    # 测试终端 prompt 样式
    print("\n🖥️  终端提示符测试:")
    prompts = [
        "user@localhost:~/project$ ls -la",
        "root@server:/var/log# tail -f error.log",
        "developer@macbook:~/code [main]$ git status",
        "[venv] user@ubuntu:~/app$ python manage.py runserver",
    ]
    
    for prompt in prompts:
        print(f"  {prompt}")
    
    print("\n" + "=" * 60)
    print("💡 如果上述内容中的字符对齐良好，说明等宽字体工作正常")
    print("🎯 在终端中运行此脚本可以验证 MesloLGS NF 字体效果")

if __name__ == "__main__":
    test_monospace_alignment()