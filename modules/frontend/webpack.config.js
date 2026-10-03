import path from 'path';

import dotenv from 'dotenv';
dotenv.config();
console.info(`CRM_SCRIPTS_WATCH: ${process.env.CRM_SCRIPTS_WATCH}`);

export default {
 context: path.resolve(process.cwd(), 'src'),
 entry: {
		cg: './cg.ts',
	},
	devtool: 'source-map',
	mode: 'development',
	watch: process.env["CRM_SCRIPTS_WATCH"] == "true",
	watchOptions: {
		ignored: /node_modules/
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},

			{
				test: /cg\.module\.json/,
				type: 'asset/resource',
				generator: {
					filename: 'cg.module.json'
				}
			},
		],

	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js']
	},
	output: {
		filename: (pathData) => pathData.chunk.name == 'cg' ? '[name].js' : '[id].js',
		path: process.cwd() + '/dist',
		assetModuleFilename: '[path][base]'
	},
}