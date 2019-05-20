const path = require('path');

module.exports = (env, argv) => ({
    entry: './src/index.ts',
    output: {
        filename: 'swf2js.js',
        path: path.resolve(__dirname, 'dist')
    },
    devtool: (argv.mode === 'development') ? 'inline-source-map' : 'source-map',
    stats: 'errors-only',
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,

                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            context: path.resolve(__dirname, 'src')
                        }
                    }
                ]
            }
        ]
    }
})
