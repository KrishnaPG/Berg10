/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import "./sidebar-card.scss";

const Home = React.lazy(() => import(/* webpackChunkName: "fl-home", webpackPreload: true */ './Home'));
const Notifications = React.lazy(() => import(/* webpackChunkName: "fl-notify", webpackPreload: true */ './Notifications'));
const Settings = React.lazy(() => import(/* webpackChunkName: "fl-settings", webpackPreload: true */ './Settings'));
const TypeRepo = React.lazy(() => import(/* webpackChunkName: "fl-typeRepo", webpackPreload: true */ './Panels/TypeRepo'));
const TypeRepoAddNew = React.lazy(() => import(/* webpackChunkName: "fl-typeRepoAddNew", webpackPreload: true */ './Panels/TypeRepo.AddNew'));
const Xplore = React.lazy(() => import(/* webpackChunkName: "fl-xplore", webpackPreload: true */ './Xplore'));


const componentMap = {
	"Home": () => <Suspense fallback={<div className="LoadingMsg">Loading the Home...</div>}><Home></Home></Suspense>,
	"Notifications": () => <Suspense fallback={<div className="LoadingMsg">Loading the Notifications...</div>}><Notifications></Notifications></Suspense>,
	"Settings": () => <Suspense fallback={<div className="LoadingMsg">Loading the Settings...</div>}><Settings></Settings></Suspense>,
	"TypeRepo": () => <Suspense fallback={<div className="LoadingMsg">Loading the TypeRepo...</div>}><TypeRepo></TypeRepo></Suspense>,
	"TypeRepo.AddNew": flNode => <Suspense fallback={<div className="LoadingMsg">Loading the TypeRepo.AddNew...</div>}><TypeRepoAddNew {...flNode.getConfig()}></TypeRepoAddNew></Suspense>,
	"Xplore": () => <Suspense fallback={<div className="LoadingMsg">Loading the Xplore...</div>}><Xplore></Xplore></Suspense>,
	"test": () => <h2>Hello World!!</h2>
};

// the flexLayout UI factory
export default function (node) {
	var component = node.getComponent();
	const renderFn = componentMap[component];
	return renderFn ? renderFn(node) : <h2>Missing: {component}</h2>;
}

export function iconFactory(node) {
	return node.getIcon();
}