<template>
	<pro-layout
		:title="title"
		:menus="menus"
		:collapsed="collapsed"
		:mediaQuery="query"
		:isMobile="isMobile"
		:handleMediaQuery="handleMediaQuery"
		:handleCollapse="handleCollapse"
		v-bind="uiSettings"
	>
		<template v-slot:rightContentRender>
			<div>
				rightContentRender
			</div>
		</template>
		<template v-slot:footerRender>
			<div>footerRender</div>
		</template>
		<setting-drawer :settings="uiSettings" @change="handleSettingChange" />
		<router-view />
	</pro-layout>	
</template>
<script>
import ProLayout, { SettingDrawer, updateTheme } from '@ant-design-vue/pro-layout';
//import LogoSvg from '@/assets/base-384px.jpg';

const defaultSettings = {
	navTheme: 'dark', // theme for nav menu
	primaryColor: '#52C41A', // primary color of ant design
	layout: 'sidemenu', // nav menu position: `sidemenu` or `topmenu`
	contentWidth: 'Fluid', // layout of content: `Fluid` or `Fixed`, only works when layout is topmenu
	fixedHeader: false, // sticky header
	fixSiderbar: false, // sticky siderbar
	colorWeak: true,
	menu: {
		locale: true
	},
	title: 'Berg10',
	weight : false ,
	iconfontUrl: '',
	production: process.env.NODE_ENV === 'production' && process.env.VUE_APP_PREVIEW !== 'true'	
}

export default {
	name: "dashboard",
	components:{
		ProLayout, SettingDrawer
	},
	data () {
		return {
			menus: [],
			collapsed: false,
			title: defaultSettings.title,
			isMobile: false,
			query: {},
			uiSettings: {
				layout: defaultSettings.layout, // 'sidemenu', 'topmenu'
				contentWidth: defaultSettings.layout === 'sidemenu' ? false : defaultSettings.contentWidth === 'Fixed',
				theme: defaultSettings.navTheme,
				primaryColor: defaultSettings.primaryColor,
				fixedHeader: defaultSettings.fixedHeader,
				fixSiderbar: defaultSettings.fixSiderbar,
				colorWeak: defaultSettings.colorWeak,
				hideHintAlert: false,
				hideCopyButton: false				
			}
		}
	},
	created () {
		//this.menus = asyncRouterMap.find(item => item.path === '/').children
	},	
	mounted() {
		// initial update color
		updateTheme(this.uiSettings.primaryColor);
	},
	methods: {
		handleMediaQuery (query) {
			this.query = query;
			if (this.isMobile && !query['screen-xs']) {
				this.isMobile = false;
				return;
			}
			if (!this.isMobile && query['screen-xs']) {
				this.isMobile = true;
				this.collapsed = false;
				this.uiSettings.contentWidth = false;
			}
		},
		handleCollapse (collapsed) {
			this.collapsed = collapsed;
		},
		handleSettingChange ({ type, value }) {
			console.log('type', type, value);
			type && (this.uiSettings[type] = value);
			switch (type) {
			case 'contentWidth':
				this.uiSettings[type] = value === 'Fixed';
				break;
			case 'layout':
				if (value === 'sidemenu') {
					this.uiSettings.contentWidth = false;
				} else {
					this.uiSettings.fixSiderbar = false;
					this.uiSettings.contentWidth = true;
				}
				break;
			}
		}		
		// logoRender () {
		// 	return (<h1>hello</h1>)
		// }
	}	
}
</script>
