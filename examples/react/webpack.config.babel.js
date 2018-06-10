import webpack from 'webpack'
import path from 'path'


const resolveSwapCoreSrcPath = (filePath) => path.resolve(__dirname, `../../src/${filePath}`)

const globals = {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
}

const webpackConfig = {

  mode: process.env.NODE_ENV,

  entry: {
    'swap.auth': resolveSwapCoreSrcPath('services/swap.auth'),
    'swap.orders': resolveSwapCoreSrcPath('services/swap.orders'),
    'swap.room': resolveSwapCoreSrcPath('services/swap.room'),
    'swap.app': resolveSwapCoreSrcPath('swap.app'),
    'swap.flows': resolveSwapCoreSrcPath('swap.flows'),
    'swap.swap': resolveSwapCoreSrcPath('swap.swap'),
    'swap.swaps': resolveSwapCoreSrcPath('swap.swaps'),
  },

  output: {
    path: path.join(__dirname, 'swap-core'),
    filename: '[name].js',
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },

  resolve: {
    alias: {
      'swap.auth': resolveSwapCoreSrcPath('services/swap.auth'),
      'swap.orders': resolveSwapCoreSrcPath('services/swap.orders'),
      'swap.room': resolveSwapCoreSrcPath('services/swap.room'),
      'swap.app': resolveSwapCoreSrcPath('swap.app'),
      'swap.flows': resolveSwapCoreSrcPath('swap.flows'),
      'swap.swap': resolveSwapCoreSrcPath('swap.swap'),
      'swap.swaps': resolveSwapCoreSrcPath('swap.swaps'),
    },
    extensions: [ '.js', '.jsx', '.scss' ],
    plugins: [],
  },

  plugins: [
    new webpack.DefinePlugin(globals),
  ],
}


export default webpackConfig
