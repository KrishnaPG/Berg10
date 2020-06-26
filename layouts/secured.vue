<template>
	<div>
		<div v-if="!isAuthenticated" >
			<LoginUI :currentPath="currentPath" :isAuthInProgress="isAuthInProgress"/>
		</div>		
		<Nuxt v-else />
	</div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
const LoginUI =  () => import(/* webpackChunkName: "loginUI" */ '~/components/loginUI');

export default {
	name: 'layout-secured',
	components: {
		LoginUI
	},
	methods: {
		...mapActions([
			'logout'	// maps `this.logout()` to `this.$store.dispatch('logout')`
		])
	},
	computed: {
		currentPath: function() { console.log("layout path: ", this.$route.path);
			return this.$route.path;
		},
		...mapGetters(['isAuthenticated', 'loggedInUser', 'isAuthInProgress'])
	}
}
</script>