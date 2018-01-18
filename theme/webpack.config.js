const webpack = require('webpack');
const { resolve } = require('path');
const UglifyPlugin = require('uglifyjs-webpack-plugin');
const loadEnv = require('./lib/load-env');
const configureBabel = require('./babel.config.js');

// mark dependencies for vendor bundle
const libs = ['react', 'react-dom', 'react-redux', 'react-router-dom', 'redux'];

module.exports = overrides => {
    if (Array.isArray(overrides)) {
      throw Error(`Environment conflict: cannot use webpack --env option to provide multiple environments. Supplied environment was ${overrides}`);
    }

    const env = loadEnv(overrides);
    const environment = env.get('environment');
    const babelOptions = configureBabel(environment);
    const isProd = environment === "production";
    // resolve directories
    const dirRoot = resolve(__dirname);
    const dirSource = resolve(dirRoot, 'src');
    const dirOutput = resolve(dirRoot, env.get('THEME_PATH'), 'en_US/bundles');
    const dirModules = resolve(dirRoot, 'node_modules');

    console.log(`Environment: ${environment}`);

    // create the default config for development-like environments
    const config = {
        context: dirSource,
        entry: {
            client: resolve(dirSource, 'index.js')
        },
        output: {
            path: dirOutput,
            publicPath: env.get('PUBLIC_PATH'),
            filename: '[name].js',
            chunkFilename: '[name].js'
        },
        module: {
            rules: [
                {
                    include: [dirSource],
                    test: /\.js$/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: { ...babelOptions, cacheDirectory: true }
                        }
                    ]
                },
                {
                    test: /\.css$/,
                    use: [
                        'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1
                            }
                        }
                    ]
                }
            ]
        },
        resolve: {
            modules: [dirRoot, dirModules],
            mainFiles: ['index'],
            extensions: ['.js']
        },
        plugins: [
            new webpack.NoEmitOnErrorsPlugin(),
            new webpack.EnvironmentPlugin({
                NODE_ENV: environment
            })
        ],
        devServer: {
            contentBase: false,
            port: 8080,
            publicPath: '/'
        },
        devtool: 'source-map'
    };

    // modify the default config for production-like environments
    if (isProd) {
        // disable sourcemaps
        delete config.devtool;

        // add a second entry point for third-party runtime dependencies
        config.entry.vendor = libs;

        // add the CommonsChunk plugin to generate more than one bundle
        config.plugins.push(
            new webpack.optimize.CommonsChunkPlugin({
                names: ['vendor']
            })
        );

        // add the UglifyJS plugin to minify the bundle and eliminate dead code
        config.plugins.push(new UglifyPlugin());
    }

    return config;
};
