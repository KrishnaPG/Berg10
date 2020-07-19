/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import "../sidebar-card.scss";

//import CForm from './form';
const CForm = React.lazy(() => import(/* webpackChunkName: "fl-form", webpackPrefetch: true */ './form'));
const Home = React.lazy(() => import(/* webpackChunkName: "fl-home", webpackPrefetch: true */ '../Home'));
const TypeRepo = React.lazy(() => import(/* webpackChunkName: "fl-typeRepo", webpackPrefetch: true */ '../Panels/TypeRepo'));
const TypeRepoAddNew = React.lazy(() => import(/* webpackChunkName: "fl-typeRepoAddNew", webpackPrefetch: true */ '../Panels/TypeRepo.AddNew'));
const Xplore = React.lazy(() => import(/* webpackChunkName: "fl-xplore", webpackPrefetch: true */ '../Xplore'));


const componentMap = {
	"grid": () => <Suspense fallback={<div className="LoadingMsg">Loading the CForm...</div>}><CForm></CForm></Suspense>,
	"Home": () => <Suspense fallback={<div className="LoadingMsg">Loading the Home...</div>}><Home></Home></Suspense>,
	"TypeRepo": () => <Suspense fallback={<div className="LoadingMsg">Loading the TypeRepo...</div>}><TypeRepo></TypeRepo></Suspense>,
	"TypeRepo.AddNew": node => <Suspense fallback={<div className="LoadingMsg">Loading the TypeRepo.AddNew...</div>}><TypeRepoAddNew node={node}></TypeRepoAddNew></Suspense>,
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