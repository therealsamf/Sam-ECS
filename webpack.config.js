
/**
 * This webpack config file is for use with the client side code only. NodeJS doesn't need it with server side 
 */
module.exports = {
  entry: {
    'SamECS': __dirname + '/src/index.js'
  },
  output: {
    path: __dirname,
    filename: 'sam-ecs.js'
  },
  resolve: {
    root: [
      __dirname + "/node_modules"
    ]
  },
  module: {
    loaders: [
      {
        test: /\.js$/, loader: "babel-loader", query: {
          presets: ['es2015']
        }
      }
    ]
  }
}