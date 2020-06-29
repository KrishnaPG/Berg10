
export default {
	/*
	** Nuxt rendering mode
	** See https://nuxtjs.org/api/configuration-mode
	*/
	mode: 'spa',
	/*
	** Nuxt target
	** See https://nuxtjs.org/api/configuration-target
	*/
	target: 'static',
	/*
	** Headers of the page
	** See https://nuxtjs.org/api/configuration-head
	*/
	head: {
		title: process.env.npm_package_name || '',
		meta: [
			{ charset: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ hid: 'description', name: 'description', content: process.env.npm_package_description || '' }
		],
		link: [
			{ rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico' },
			{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css?family=Poiret+One' }
		]		
	},
	/*
	** Global CSS
	*/
	css: [
		'@/assets/main.css',
	],	
	/*
	** Plugins to load before mounting the App
	** https://nuxtjs.org/guide/plugins
	*/
	plugins: [
		'@/plugins/antd',
		// { src: '@/plugins/vuex-persist', ssr: false } <- we are using cookies, and not using this
	],
	/*
	** Auto import components
	** See https://nuxtjs.org/api/configuration-components
	*/
	components: true,
	/*
	** Nuxt.js dev-modules
	*/
	buildModules: [
		// Doc: https://github.com/nuxt-community/eslint-module
		'@nuxtjs/eslint-module'
	],
	/*
	** Nuxt.js modules
	*/
	modules: [
		// Doc: https://axios.nuxtjs.org/usage
		'@nuxtjs/axios',
		'@nuxtjs/pwa',
		// Doc: https://github.com/nuxt/content
		'@nuxt/content'
	],	
	/*
	** Axios module configuration
	** See https://axios.nuxtjs.org/options
	*/
	axios: {},
	/*
	** Build configuration
	** See https://nuxtjs.org/api/configuration-build/
	*/
	build: {
		extend(config, { isClient, loaders: { vue, less } }) {
			// Extend only webpack config for client-bundle
			if (isClient) {
				vue.transformAssetUrls.video = ['src', 'poster'];
				less.lessOptions = Object.assign({}, less.lessOptions, { javascriptEnabled: true });
			}
		}		
	},	
	/*
	** Content module configuration
	** See https://content.nuxtjs.org/configuration
	*/
	content: {},
	// accessible as context.env
	env: {
		redirects: {
			afterLogin: { path: "/profile" }
		}
	},
	router: {
		middleware: ['auth']
	}	
}
