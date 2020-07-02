import { defineConfig } from 'umi';
import routes from './route.config';
import { IrisBlue } from './theme';

export default defineConfig({
  sula: {
    locale: {
      default: 'en-US',
    },
  },
  nodeModulesTransform: {
    type: 'none',
    exclude: [],
  },
  hash: true,
  history: {
    type: 'hash',
  },
  // https://umijs.org/plugins/plugin-layout#locale
  locale: {
    default: 'en-US',
    antd: true,
    baseNavigator: true,
  },
  // https://github.com/umijs/umi/issues/4363
  title: false,
  routes,
  ignoreMomentLocale: true,
  layout: {
    locale: true,
  },
  theme: IrisBlue,
  // Reduce patch size
  targets: {
    chrome: 83,
    firefox: false,
    safari: false,
    edge: false,
    ios: false,
  },  
});
