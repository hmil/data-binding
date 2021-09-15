const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require('path');

const mode = process.env.NODE_ENV || 'development';

module.exports = {
    entry: "./src/index.ts",
    mode,
    devServer: {
        static: {
            directory: path.join(__dirname, "public"),
        },
        port: 4000,
        hot: false,
    },
    output: {
        publicPath: "auto",
        path: path.join(__dirname, '/public'),
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader'
            },
            {
                test: /\.module\.css$/i,
                use: ["style-loader", {
                    loader: "css-loader",
                    options: {
                        modules: {
                            mode: "local",
                            auto: true,
                            exportGlobals: true,
                            localIdentName: "shell-[path][name]__[local]--[hash:base64:5]",
                            localIdentContext: path.resolve(__dirname, "src"),
                            namedExport: true,
                        },
                    },
                }]
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.css']
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./public/index.html",
        }),
    ]
};
