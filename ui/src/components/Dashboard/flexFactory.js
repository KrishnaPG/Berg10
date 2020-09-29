/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import "./sidebar-card.scss";

// preloaded chunk starts loading in parallel with the parent chunk.
// pre-fetch chunk starts loading *after* parent is loaded and when the browser is idle.

const Xplore = React.lazy(() => import(/* webpackChunkName: "fl-xplore", webpackPreload: true */ './Xplore'));
const Home = React.lazy(() => import(/* webpackChunkName: "fl-home" */ './Home'));
const Notifications = React.lazy(() => import(/* webpackChunkName: "fl-notify" */ './Notifications'));
const Properties = React.lazy(() => import(/* webpackChunkName: "fl-props" */ './Properties'));
const Settings = React.lazy(() => import(/* webpackChunkName: "fl-settings" */ './Settings'));

const AQLQueries = React.lazy(() => import(/* webpackChunkName: "fl-aql"*/ './Panels/AQLQueries'));
const AQLQueriesAddNew = React.lazy(() => import(/* webpackChunkName: "fl-aqlAddNew" */ './Panels/AQLQueries.AddNew'));
const DMNAddNew = React.lazy(() => import(/* webpackChunkName: "fl-dmnAddNew" */ './Panels/DMN.AddNew'));
const TypeRepo = React.lazy(() => import(/* webpackChunkName: "fl-typeRepo" */ './Panels/TypeRepo'));
const TypeRepoAddNew = React.lazy(() => import(/* webpackChunkName: "fl-typeRepoAddNew" */ './Panels/TypeRepo.AddNew'));
const Users = React.lazy(() => import(/* webpackChunkName: "fl-queryView" */ './Panels/Users'));


const componentMap = {
	"Home": () => <Suspense fallback={<div className="LoadingMsg">Loading the Home...</div>}><Home></Home></Suspense>,
	"Notifications": () => <Suspense fallback={<div className="LoadingMsg">Loading the Notifications...</div>}><Notifications></Notifications></Suspense>,
	"Properties": flNode => <Suspense fallback={<div className="LoadingMsg">Loading the Properties...</div>}><Properties {...flNode.getConfig()}></Properties></Suspense>,
	"Settings": () => <Suspense fallback={<div className="LoadingMsg">Loading the Settings...</div>}><Settings></Settings></Suspense>,
	"Xplore": () => <Suspense fallback={<div className="LoadingMsg">Loading the Xplore...</div>}><Xplore></Xplore></Suspense>,

	"AQLQueries": () => <Suspense fallback={<div className="LoadingMsg">Loading the Queries...</div>}><AQLQueries></AQLQueries></Suspense>,
	"AQLQueries.AddNew": flNode => <Suspense fallback={<div className="LoadingMsg">Loading the AQLQueries.AddNew...</div>}><AQLQueriesAddNew {...flNode.getConfig()}></AQLQueriesAddNew></Suspense>,
	"DMN.AddNew": flNode => <Suspense fallback={<div className="LoadingMsg">Loading the DMN.AddNew...</div>}><DMNAddNew {...flNode.getConfig()}></DMNAddNew></Suspense>,
	"Users": () => <Suspense fallback={<div className="LoadingMsg">Loading the Users...</div>}><Users></Users></Suspense>,
	"TypeRepo": () => <Suspense fallback={<div className="LoadingMsg">Loading the TypeRepo...</div>}><TypeRepo></TypeRepo></Suspense>,
	"TypeRepo.AddNew": flNode => <Suspense fallback={<div className="LoadingMsg">Loading the TypeRepo.AddNew...</div>}><TypeRepoAddNew {...flNode.getConfig()}></TypeRepoAddNew></Suspense>,
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