const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
  plugins: [
    new MonacoWebpackPlugin({
      languages: ['typescript', 'javascript', 'html', 'css', 'scss', 'json']
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/monaco-editor/min/vs/base/browser/ui/codicons/codicon/codicon.ttf',
          to: 'assets/monaco/codicon.ttf'
        }
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