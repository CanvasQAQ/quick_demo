# 字体文件说明

请将以下字体文件放置在此目录中：

- `MesloLGS NF Regular.ttf` - 终端等宽字体
- `SourceHanSansCN-Regular.otf` - 中文UI字体

## 字体分工

### UI界面字体 (Source Han Sans CN)
- **应用场景**: 所有UI界面文本、按钮、菜单、标签等
- **字体特性**: 
  - 优秀的中文显示效果
  - 现代化的界面设计
  - 多种字重支持
  - 与系统字体良好融合

### 终端字体 (MesloLGS NF)
- **应用场景**: Xterm.js终端、命令文本、代码显示
- **字体特性**:
  - 完美等宽对齐
  - Nerd Font图标支持
  - 高代码可读性
  - 终端优化设计

## 字体来源

### MesloLGS NF
- [Nerd Fonts 官方仓库](https://github.com/ryanoasis/nerd-fonts/releases)
- [直接下载](https://github.com/ryanoasis/nerd-fonts/raw/master/patched-fonts/Meslo/S/Regular/complete/Meslo%20LG%20S%20Regular%20Nerd%20Font%20Complete.ttf)

### Source Han Sans CN (思源黑体)
- [Adobe官方下载](https://github.com/adobe-fonts/source-han-sans/releases)
- [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+SC)

## 使用说明

字体通过CSS变量自动应用：
- `--ui-font-family`: UI界面字体栈
- `--terminal-font-family`: 终端字体栈

开发者可以通过类名应用字体：
- `.ui-font`: 应用UI字体
- `.terminal-font`: 应用终端字体