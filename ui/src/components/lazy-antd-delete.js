/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';

export const Button = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/button/button'));
export const Col = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/grid/col'));
export const Form = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/form/Form'));
export const FormItem = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/form/FormItem'));
export const Input = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/input/Input'));
export const InputPassword = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/input/Password'));
export const Message = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/message/index'));
export const Row = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/grid/row'));
export const Spin = React.lazy(() => import(/* webpackChunkName: "antLogin", webpackPreload: true */ 'antd/lib/spin/index'));

export const Avatar = React.lazy(() => import(/* webpackChunkName: "antSidebars", webpackPreload: true */ 'antd/lib/avatar/index'));
export const Card = React.lazy(() => import(/* webpackChunkName: "antSidebars", webpackPreload: true */ 'antd/lib/card/index'));
export const Meta = React.lazy(() => import(/* webpackChunkName: "antSidebars", webpackPreload: true */ 'antd/lib/card/Meta'));
export const Menu = React.lazy(() => import(/* webpackChunkName: "antSidebars", webpackPreload: true */ 'antd/lib/menu/index'));
export const MenuItem = React.lazy(() => import(/* webpackChunkName: "antSidebars", webpackPreload: true */ 'antd/lib/menu/MenuItem'));
export const SubMenu = React.lazy(() => import(/* webpackChunkName: "antSidebars", webpackPreload: true */ 'antd/lib/menu/SubMenu'));

export const PageHeader = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/page-header/index'));
export const Tabs = React.lazy(() => import(/* webpackChunkName: "antPanels", webpackPreload: true */ 'antd/lib/tabs/index'));