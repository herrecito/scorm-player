import { dirname, resolve } from "path"
import { fileURLToPath } from "url";

import HtmlWebpackPlugin from "html-webpack-plugin"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
    mode: "development",

    entry: {
        main: "./src/index.js",
        sw: "./src/sw.js"
    },

    output: {
        filename: "[name].js",
        path: resolve(__dirname, "dist"),
    },

    plugins: [new HtmlWebpackPlugin({
        chunks: ["main"]
    })],
}
