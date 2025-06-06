module.exports = (api) => {
	api.cache(true);

	return {
		presets: [
			[
				"babel-preset-expo",
				{
					jsxImportSource: "nativewind",
				},
			],
			"nativewind/babel",
		],

		plugins: [
			[
				"module-resolver",
				{
					root: ["./"],

					alias: {
						"#": "./",
						"@": "./src/",
						"tailwind.config": "./tailwind.config.js",
					},
				},
			],
			// ["transform-remove-console", { "exclude": [process.env.APP_VARIANT === 'development' ? "warn" : ""] }]
		],
	};
};
