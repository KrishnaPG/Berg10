/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';

//import CForm from './form';
const CForm = React.lazy(() => import(/* webpackChunkName: "comp", webpackPreload: true */ './form'));

const componentMap = {
	"grid": () => <Suspense fallback={<div className="LoadingMsg">Loading the CForm...</div>}><CForm></CForm></Suspense>,
	"treeExplorer": () => <h1>Hello</h1>,
};

// the flexLayout UI factory
export default function (node) {
	var component = node.getComponent();
	const renderFn = componentMap[component];
	return renderFn ? renderFn(node) : <h2>Missing: {component}</h2>;
}
		//return <button>{node.getName()}</button>;
		// return (
		//   <div>
		//     <CreateForm
		//       initialValues={{
		//         gender: ['male'],
		//       }}
		//       fields={[
		//         {
		//           name: 'name',
		//           label: '姓名',
		//           field: 'input',
		//         },
		//       ]}
		//       submit={{
		//         url: 'https://www.mocky.io/v2/5185415ba171ea3a00704eed',
		//         method: 'POST',
		//       }}
		//     />
		//   </div>
		// );      