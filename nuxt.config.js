
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
			{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
		]
	},
	/*
	** Global CSS
	*/
	css: [
	],
	/*
	** Plugins to load before mounting the App
	** https://nuxtjs.org/guide/plugins
	*/
	plugins: [
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
		//'@nuxtjs/auth-next',
		// Doc: https://axios.nuxtjs.org/usage
		'@nuxtjs/axios',
		'@nuxtjs/pwa',
		// Doc: https://github.com/nuxt/content
		'@nuxt/content'
	],
	auth: {
		localStorage: {
			prefix: 'Nuxt_',
		},		
		redirect: {
			login: '/login', // redirect user when not connected
			callback: '/auth/signed-in'
		},
		strategies: {
			cookie: {
				cookie: { name: 'adminBro-session' }
			},			
			// local: {
			// 	token: {
			// 		required: false,
			// 		type: false
			// 	},
			// 	user: {
			// 		property: 'user',
			// 		autoFetch: false
			// 	},				
			// 	endpoints: {
			// 		login: { url: '/api/auth/login', method: 'post' },
			// 	}				
			// },
			// auth0: {
			// 	domain: process.env.AUTH0_DOMAIN,
			// 	client_id: process.env.AUTH0_CLIENT_ID
			// },
			// github: {
			// 	"clientID": "512b910f75a7693425a0",
			// 	"clientSecret": "2b3acdb7efc1fdda598adc6cea98dfdff5bd8b70",
			// },
			// google: {
			// 	"client_id": "975446056155-u44va7d4gup2mqreujfl7r69u5rb2h98.apps.googleusercontent.com",
			// 	"clientSecret": "Ll3zJG789GA1r0zwzUtNDC_Z",
			// },
		}
	},	
	/*
	** Axios module configuration
	** See https://axios.nuxtjs.org/options
	*/
	axios: {},
	/*
	** Content module configuration
	** See https://content.nuxtjs.org/configuration
	*/
	content: {},
	/*
	** Build configuration
	** See https://nuxtjs.org/api/configuration-build/
	*/
	build: {
	},
	router: {
		middleware: ['auth']
	}	
}
