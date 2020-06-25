module.exports = {
	root: true,
	env: {
		"browser": true,
		"es2020": true,
		"node": true,
		"jest": true
	},
	parserOptions: {
		parser: 'babel-eslint'
	},
	extends: [
		'plugin:nuxt/recommended',
		"eslint:recommended"
	],
	"ignorePatterns": [
		"node_modules/"
	],  
	plugins: [
	],
	// add your custom rules here
	rules: {
		"indent": [
			"error",
			"tab"
		],
		"linebreak-style": [
			"error",
			"windows"
		],
		"no-unused-vars": [
			"error",
			{
				"argsIgnorePattern": "^_"
			}
		],    
	}
}
