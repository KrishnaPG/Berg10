/**
 * Needed to activate the store, which is required for the nuxt-auth module
 */
import Axios from 'axios';

export const state = () => ({
	user: null,
	authInProgress: false
});

export const getters = {
	isAuthenticated(state) {
		return state.user;
	},

	loggedInUser(state) {
		return state.user;
	},

	isAuthInProgress(state) {
		return state.authInProgress;
	}
};

// Do not use mutations directly (use actions to commit anything to the store)
export const mutations = {
	SET_USER(store, data) {
		store.user = data;
	},
	SET_PROGRESS(store, progress) {
		store.authInProgress = progress;
	}
};

export const actions = {
	login({ commit }, _user) {
		commit('SET_PROGRESS', true);
		// try retrieving user details from the server. The cookies will be automatically
		// picked up by the `withCredentials=true` property. If cookie is not valid, then
		// server will reject us.
		return Axios.get('http://localhost:8080/api/user', { withCredentials: true }).then(res => {
			commit('SET_USER', res.data.user);
		}).finally(() => commit('SET_PROGRESS', false));
	},

	logout({ commit }) {		
		commit('SET_USER', null);
		return Axios.get('http://localhost:8080/api/logout', { withCredentials: true }).then(res => console.log("response: , ", res));
	}
};