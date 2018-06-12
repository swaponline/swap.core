import webpack from 'webpack'
import path from 'path'


const resolveSrcPath = (filePath) => path.resolve(__dirname, `./src/${filePath}`)

const globals = {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
}

const webpackConfig = {

  mode: 'production',

  entry: {
    'auth': resolveSrcPath('swap.auth/umd.js'),
    'orders': resolveSrcPath('swap.orders/umd.js'),
    'room': resolveSrcPath('swap.room/umd.js'),
    'app': resolveSrcPath('swap.app/umd.js'),
    'flows': resolveSrcPath('swap.flows/umd.js'),
    'swap': resolveSrcPath('swap.swap/umd.js'),
    'swaps': resolveSrcPath('swap.swaps/umd.js'),
  },

  output: {
    path: path.join(__dirname, 'umd'),
    filename: 'swap.[name].js',
    libraryTarget: 'umd',
    library: [ 'swap', '[name]' ],
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

  // resolve: {
  //   alias: {
  //     'swap.auth': resolveSrcPath('swap.auth'),
  //     'swap.orders': resolveSrcPath('swap.orders'),
  //     'swap.room': resolveSrcPath('swap.room'),
  //     'swap.app': resolveSrcPath('swap.app'),
  //     'swap.flows': resolveSrcPath('swap.flows'),
  //     'swap.swap': resolveSrcPath('swap.swap'),
  //     'swap.swaps': resolveSrcPath('swap.swaps'),
  //   },
  // },

  plugins: [
    new webpack.DefinePlugin(globals),
    new webpack.ProvidePlugin({
      'swap.auth': 'swap.auth',
      'swap.orders': 'swap.orders',
      'swap.room': 'swap.room',
      'swap.app': 'swap.app',
      'swap.flows': 'swap.flows',
      'swap.swap': 'swap.swap',
      'swap.swaps': 'swap.swaps',
    }),
  ],
}


export default webpackConfig
