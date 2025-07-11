import path from "node:path";

export default {
  mode: process.env.NODE_ENV === "development" ? "development" : "production",
  entry: {
    main: "./src/main.ts",
    worker: "./src/worker.ts",
  },
  output: {
    path: path.resolve("./", "build"),
    filename: "[name].js",
    chunkFilename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        use: [
          "html-tag-js/jsx/tag-loader.js",
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "@biomejs/wasm-web": path.resolve("./", "node_modules/@biomejs/wasm-web"),
    },
  },
};
