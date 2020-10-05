/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';

// preloaded chunk starts loading in parallel with the parent chunk.
// pre-fetch chunk starts loading *after* parent is loaded and when the browser is idle.

export const Button = React.lazy(() => import(/* webpackChunkName: "antButton", webpackPreload: true */ 'antd/es/button/button'));
export const PageHeader = React.lazy(() => import(/* webpackChunkName: "antPageHeader", webpackPreload: true */ 'antd/es/page-header/index'));
export const Switch = React.lazy(() => import(/* webpackChunkName: "antSwitch", webpackPreload: true */ 'antd/es/switch/index'));
export const Tabs = React.lazy(() => import(/* webpackChunkName: "antTabs", webpackPreload: true */ 'antd/es/tabs/index'));
export const Tooltip = React.lazy(() => import(/* webpackChunkName: "antTooltip", webpackPreload: true */ 'antd/es/tooltip/index'));

export const Avatar = React.lazy(() => import(/* webpackChunkName: "antAvatar", webpackPreload: true */ 'antd/es/avatar/index'));
export const Card = React.lazy(() => import(/* webpackChunkName: "antCard", webpackPreload: true */ 'antd/es/card/index'));
export const Meta = React.lazy(() => import(/* webpackChunkName: "antCard", webpackPreload: true */ 'antd/es/card/Meta'));
export const Menu = React.lazy(() => import(/* webpackChunkName: "antMenu", webpackPreload: true */ 'antd/es/menu/index'));
export const MenuItem = React.lazy(() => import(/* webpackChunkName: "antMenu", webpackPreload: true */ 'antd/es/menu/MenuItem'));
export const SubMenu = React.lazy(() => import(/* webpackChunkName: "antMenu", webpackPreload: true */ 'antd/es/menu/SubMenu'));

export const Collapse = React.lazy(() => import(/* webpackChunkName: "antCollapse", webpackPreload: true */ 'antd/es/collapse/Collapse'));
export const CollapsePanel = React.lazy(() => import(/* webpackChunkName: "antCollapse", webpackPreload: true */ 'antd/es/collapse/CollapsePanel'));

export const Modal = React.lazy(() => import(/* webpackChunkName: "antModal", webpackPreload: true */ 'antd/es/modal/Modal'));