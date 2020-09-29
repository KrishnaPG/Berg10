/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';

// preloaded chunk starts loading in parallel with the parent chunk.
// pre-fetch chunk starts loading *after* parent is loaded and when the browser is idle.

export const Button = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/button/button'));
export const PageHeader = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/page-header/index'));
export const Switch = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/switch/index'));
export const Tabs = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/tabs/index'));
export const Tooltip = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/tooltip/index'));
