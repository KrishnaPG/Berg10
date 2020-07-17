import React, { Suspense } from 'react';
import { Button, PageHeader } from 'antd';
import importedComponent from 'react-imported-component';
import 'jsoneditor-react/es/editor.min.css';

const PlusCircleOutlined = React.lazy(() => import(/* webpackChunkName: "antIcons", webpackPreload: true */ '@ant-design/icons/PlusCircleOutlined'));


const JsonEditor = importedComponent(() => Promise.all([
	import(/* webpackChunkName: "jsonEd", webpackPrefetch: true */ 'jsoneditor-react'),
	import(/* webpackChunkName: "jsonEd", webpackPrefetch: true */ 'brace'),
	import(/* webpackChunkName: "jsonEd", webpackPrefetch: true */ 'brace/mode/json'),
	import(/* webpackChunkName: "jsonEd", webpackPrefetch: true */ 'brace/theme/github')
]).then(([{ JsonEditor: Editor }, ace]) => {
	return function EditorHoc(props) {
		return (
			<Editor
				ace={ace}
				theme="ace/theme/github"
				{...props}
			/>
		);
	}
}), { async: true });

class TypeRepo extends React.Component {

	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		console.log("mounted repo");
	}
	componentWillUnmount() {
		console.log("unmounted repo");
	}

	render() {
		return <PageHeader
			className="site-page-header"
			title="Type Repository"
			subTitle=""
			extra={[
				<Button key="3" icon={<PlusCircleOutlined />}>Add New Entry</Button>,
				<Button key="2">Operation</Button>,
				<Button key="1" type="primary">
					Primary
        </Button>,
			]}			
		/>		

		// return <Suspense fallback={<div className="LoadingMsg">Loading the Editor...</div>}>
		// 	<JsonEditor
		// 		htmlElementProps={{class: "json-editor-container"}}
		// 		name="Schepe"
		// 		allowedModes={['tree', 'view', 'form', 'code', 'text']}
		// 		mode='code'
		// 		history={true}
		// 		value={{}}
		// 		onChange={this.handleChange}
		// 	/>
		// </Suspense>;
	}

	handleChange = ev => {
		console.log("content changed: ", ev);
	}
};

export default TypeRepo;