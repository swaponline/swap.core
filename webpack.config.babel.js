import webpack from 'webpack'
import path from 'path'


const globals = {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
}

const webpackConfig = {
  mode: process.env.NODE_ENV,
  entry: {},

  output: {
    path: path.join(__dirname, 'example'),
    filename: 'swap-core.js',
    libraryTarget: 'umd',
    library: 'swapCore',
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      }
    ]
  },

  plugins: [
    new webpack.DefinePlugin(globals),
  ]
}


export default webpackConfig
