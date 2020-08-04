/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import Axios from 'axios';
import { setupCache } from 'axios-cache-adapter';
import { triggerLogout, triggerNotifyError, triggerNotifyWarning } from './triggers';

// Create `axios-cache-adapter` instance
const cache = setupCache({
	exclude: {
		query: false
	},
	limit: 100,
	maxAge: 15 * 60 * 1000,
	debug: false
});

export const gAxios = Axios.create({
	baseURL: "http://localhost:8080/api/",
	adapter: cache.adapter
	//timeout: 1500
});
// setup an interceptor to handle any 401 or 403 errors.
gAxios.interceptors.response.use(null, error => {
	if (error.response) {
		// Vault gives incorrect error code 400, when the client-token is missing
		if (error.response.status <= 401 && error.response.status >= 400) {
			// TODO: save layout (we may need to show it exactly so that user can resume after login)
			// unAuthenticated user, trigger the logout, which will display the loginUI
			triggerLogout();
		}
		// 403 is unAuthorized. We just have to notify the user that they do not have permission.
		// We do NOT trigger login for the 403 or other errors such as 404
		triggerNotifyError(error.response.data.error);
	}
	else {
		// some network error, or server did not respond
		triggerNotifyWarning({ title: (error.message || error), message: (error.description || error.config.url) });
	}
	return Promise.reject(error);
});


export function setAxiosAuthBearer(token) {
	gAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function getTypeDef() {
	return gAxios.get(`typedef?name=schepe`).then(response => response.data);
}