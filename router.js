import Vue from 'vue'
import Router from 'vue-router'

//import MyPage from '~/components/my-page'

Vue.use(Router)

export function createRouter(ssrContext, createDefaultRouter, routerOptions) {
	console.error("ssrContext: ", ssrContext, " \n routeroptions:", routerOptions);
	const options = routerOptions ? routerOptions : createDefaultRouter(ssrContext).options;

	return new Router({
		...options,
		routes: fixRoutes(options.routes)
	})
}

function fixRoutes(defaultRoutes) {
	console.log("default routes: ", defaultRoutes);
	// default routes that come from `pages/`
	return defaultRoutes;//.filter(...).map(...)
}