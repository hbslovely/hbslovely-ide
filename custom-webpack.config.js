const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
  plugins: [
    new MonacoWebpackPlugin({
      languages: [
        'javascript',
        'typescript',
        'html',
        'css',
        'json',
        'markdown',
        'python',
        'java',
        'go',
        'rust',
        'php',
        'ruby',
        'shell',
        'sql',
        'xml',
        'yaml'
      ]
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.ttf$/,
        use: ['file-loader']
      }
    ]
  }
}; 