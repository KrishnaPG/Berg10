/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React from 'react';

import CForm from './form';

// the flexLayout UI factory
export default function(node) {
	var component = node.getComponent();
	if (component === "grid") {
		return (<div>
			<CForm></CForm>
		</div>);
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
	}
}