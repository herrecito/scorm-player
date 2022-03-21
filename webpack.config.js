const path = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin")

module.exports = {
    mode: "development",

    entry: {
        main: "./src/index.js",
        sw: "./src/sw.js"
    },

    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
    },

    plugins: [new HtmlWebpackPlugin({
        chunks: ["main"]
    })],
}
