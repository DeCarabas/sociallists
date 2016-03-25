module.exports = {
  entry: "./sociallists/static/scripts/main.js",
  output: {
    path: "./sociallists/static/scripts/",
    filename: "bundle.js"
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loaders: ['babel?cacheDirectory'],
      }
    ]
  }
};
