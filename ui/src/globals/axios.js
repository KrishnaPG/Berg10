/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import Axios from 'axios';
import { triggerLogout, triggerNotifyError, triggerNotifyWarning } from './triggers';

export const gAxios = Axios.create({
	baseURL: "http://localhost:8089/api/",
	//timeout: 1500
});
// setup an interceptor to handle any 401 or 403 errors.
gAxios.interceptors.response.use(null, error => {
	if (error.response) {
		// Vault gives incorrect error code 400, when the client-token is missing
		if (error.response.status <= 401 && error.response.status >= 400) {
			// unAuthenticated user, trigger the logout, which will display the loginUI
			triggerLogout();
		}
		// 403 is unAuthorized. We just have to notify the user that they do not have permission.
		// We do NOT trigger login for the 403 or other errors such as 404
		triggerNotifyError(error.response.data.error);
	}
	else {
		// some network error, or server did not respond
		triggerNotifyWarning({ message: (error.message || error), description: (error.description || error.config.url)});
	}
	return Promise.reject(error);
});


export function setAxiosAuthBearer(token) {
	gAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function getTypeDef() {

}