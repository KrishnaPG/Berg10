import VuexPersistence from 'vuex-persist'
import localForage from 'localforage';

const localTable = localForage.createInstance({
	name: "Berg10",
	storeName: 'default',
	description: 'Default storage for Berg10 Local Data'
});

export default ({ store }) => {
	window.onNuxtReady(() => {
		console.log("on nuxt ready");
		new VuexPersistence({
			storage: localTable,
			asyncStorage: true,
			key: 'Berg10'
		}).plugin(store);
		store.restored.then(() => console.log("store restored: ", store.state));
	});
}