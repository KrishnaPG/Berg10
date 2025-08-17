/**
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
import React, { Suspense } from 'react';
import { Collapse, CollapsePanel } from '../antComponents';

import 'react-perfect-scrollbar/dist/css/styles.css';

const JSONViewer = React.lazy(() => import(/* webpackChunkName: "jsonViewer", webpackPrefetch: true */ 'react-json-viewer'));
const PerfectScroll = React.lazy(() => import(/* webpackChunkName: "pScroll", webpackPreload: true */ 'react-perfect-scrollbar'));

class AQLQueryPreviews extends React.PureComponent {
	constructor(props) {
		super(props);
	}

	render() {
		if (this.props.previewResults.length <= 0) return null;
		return (<Suspense fallback={<div className="LoadingMsg">Loading the Previews...</div>}>
			<h3>Preview</h3>
			<Collapse className="AQLQueries-PreviewResults">
				{this.props.previewResults.map((result, index) => <CollapsePanel key={index}>
					<PerfectScroll>
						<Suspense fallback={<div className="LoadingMsg">Loading the PreViewer...</div>}>
							<JSONViewer json={result}></JSONViewer>
						</Suspense>
					</PerfectScroll>
				</CollapsePanel>)}
			</Collapse>
		</Suspense>);		
	}
}

export default AQLQueryPreviews;