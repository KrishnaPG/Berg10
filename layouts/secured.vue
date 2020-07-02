<template>
	
		<div v-if="!isAuthenticated" class="fullHeight">
			<LoginUI :isAuthInProgress="isAuthInProgress" :pubKey="publicKey"/>
		</div>		
		<Nuxt v-else />

</template>

<script>
import { mapGetters, mapActions } from 'vuex';
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
		...mapGetters(['isAuthenticated', 'isAuthInProgress', 'publicKey'])
	}
}
</script>
<style scoped>
#LoginUI {
	height: 100%;
}
</style>