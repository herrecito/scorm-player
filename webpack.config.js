import { dirname, resolve } from "path"
import { fileURLToPath } from "url"

import { VueLoaderPlugin } from "vue-loader"
import ESLintPlugin from "eslint-webpack-plugin"
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

    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: "vue-loader"
            },

            {
                test: /\.css$/i,
                use: [
                    "style-loader",
                    "css-loader",
                    "postcss-loader"
                ],
            },
        ]
    },

    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/index.html",
            chunks: ["main"]
        }),
        new VueLoaderPlugin(),
        new ESLintPlugin()
    ],
}
