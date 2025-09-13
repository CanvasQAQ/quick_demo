// Xterm.js 主题配置

export interface XtermTheme {
  name: string;
  displayName: string;
  isLight?: boolean;
  colors: {
    background: string;
    foreground: string;
    cursor: string;
    cursorAccent: string;
    selection: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
  };
}

export const XTERM_THEMES: Record<string, XtermTheme> = {
  dark: {
    name: 'dark',
    displayName: 'Dark',
    isLight: false,
    colors: {
      background: '#1e1e1e',
      foreground: '#cccccc',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selection: '#3a3d41',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff'
    }
  },

  light: {
    name: 'light',
    displayName: 'Light',
    isLight: true,
    colors: {
      background: '#e8e7e7',
      foreground: '#333333',
      cursor: '#000000',
      cursorAccent: '#ffffff',
      selection: '#b5d5ff',
      black: '#000000',
      red: '#cd3131',
      green: '#008000',
      yellow: '#ffff00',
      blue: '#0000ff',
      magenta: '#bc3fbc',
      cyan: '#008080',
      white: '#c0c0c0',
      brightBlack: '#808080',
      brightRed: '#ff0000',
      brightGreen: '#00ff00',
      brightYellow: '#ffff00',
      brightBlue: '#0080ff',
      brightMagenta: '#ff00ff',
      brightCyan: '#00ffff',
      brightWhite: '#ffffff'
    }
  },

  'onehalf-dark': {
    name: 'onehalf-dark',
    displayName: 'OneHalf Dark',
    isLight: false,
    colors: {
      background: '#282c34',
      foreground: '#dcdfe4',
      cursor: '#dcdfe4',
      cursorAccent: '#282c34',
      selection: '#474e5d',
      black: '#282c34',
      red: '#e06c75',
      green: '#98c379',
      yellow: '#e5c07b',
      blue: '#61afef',
      magenta: '#c678dd',
      cyan: '#56b6c2',
      white: '#dcdfe4',
      brightBlack: '#5a6374',
      brightRed: '#e06c75',
      brightGreen: '#98c379',
      brightYellow: '#e5c07b',
      brightBlue: '#61afef',
      brightMagenta: '#c678dd',
      brightCyan: '#56b6c2',
      brightWhite: '#dcdfe4'
    }
  },

  'onehalf-light': {
    name: 'onehalf-light',
    displayName: 'OneHalf Light',
    isLight: true,
    colors: {
      background: '#e3e3e3',
      foreground: '#383a42',
      cursor: '#383a42',
      cursorAccent: '#fafafa',
      selection: '#bfceff',
      black: '#383a42',
      red: '#e45649',
      green: '#50a14f',
      yellow: '#c18401',
      blue: '#0184bc',
      magenta: '#a626a4',
      cyan: '#0997b3',
      white: '#fafafa',
      brightBlack: '#4f525d',
      brightRed: '#e45649',
      brightGreen: '#50a14f',
      brightYellow: '#c18401',
      brightBlue: '#0184bc',
      brightMagenta: '#a626a4',
      brightCyan: '#0997b3',
      brightWhite: '#fafafa'
    }
  },

  'solarized-dark': {
    name: 'solarized-dark',
    displayName: 'Solarized Dark',
    isLight: false,
    colors: {
      background: '#002b36',
      foreground: '#839496',
      cursor: '#839496',
      cursorAccent: '#002b36',
      selection: '#073642',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#002b36',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3'
    }
  },

  'solarized-light': {
    name: 'solarized-light',
    displayName: 'Solarized Light',
    isLight: true,
    colors: {
      background: '#fdf6e3',
      foreground: '#657b83',
      cursor: '#657b83',
      cursorAccent: '#fdf6e3',
      selection: '#eee8d5',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#002b36',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3'
    }
  }
};

export const DEFAULT_THEME = 'dark';

// 获取主题列表
export const getThemeList = (): XtermTheme[] => {
  return Object.values(XTERM_THEMES);
};

// 获取主题
export const getTheme = (themeName: string): XtermTheme => {
  return XTERM_THEMES[themeName] || XTERM_THEMES[DEFAULT_THEME];
};

// 判断是否为浅色主题
export const isLightTheme = (themeName: string): boolean => {
  const theme = getTheme(themeName);
  return theme.isLight || false;
};

// 获取主题的选中样式
export const getSelectionStyle = (themeName: string): { color: string; opacity: string; mixBlendMode: string } => {
  const theme = getTheme(themeName);
  const isLight = isLightTheme(themeName);

  if (isLight) {
    return {
      color: 'rgba(0, 102, 204, 0.35)',
      opacity: '1',
      mixBlendMode: 'normal'
    };
  } else {
    return {
      color: theme.colors.selection,
      opacity: '0.4',
      mixBlendMode: 'multiply'
    };
  }
};

// 创建动态选中样式
export const createSelectionStyle = (themeName: string): string => {
  const selectionConfig = getSelectionStyle(themeName);
  const isLight = isLightTheme(themeName);

  return `
    .xterm-selection div {
      background-color: ${selectionConfig.color} !important;
      opacity: ${selectionConfig.opacity} !important;
      mix-blend-mode: ${selectionConfig.mixBlendMode};
    }

    /* 使用更高权重的选择器来确保选中效果 */
    ${isLight ? `
    .terminal-wrapper .xterm-selection div,
    .xterm .xterm-selection div {
      background-color: ${selectionConfig.color} !important;
      opacity: ${selectionConfig.opacity} !important;
      mix-blend-mode: ${selectionConfig.mixBlendMode} !important;
      border: none !important;
    }
    ` : `
    .terminal-wrapper .xterm-selection div,
    .xterm .xterm-selection div {
      background-color: ${selectionConfig.color} !important;
      opacity: ${selectionConfig.opacity} !important;
      mix-blend-mode: ${selectionConfig.mixBlendMode} !important;
    }
    `}
  `;
};

// 保存主题到 localStorage
export const saveTheme = (themeName: string): void => {
  localStorage.setItem('xterm-theme', themeName);
};

// 从 localStorage 加载主题
export const loadTheme = (): string => {
  return localStorage.getItem('xterm-theme') || DEFAULT_THEME;
};