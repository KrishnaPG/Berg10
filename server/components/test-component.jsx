import { Box } from 'admin-bro'
import ArangoJS from "arangojs/lib/web";

const dbConfig = {
	url: "http://localhost:8529",
	dbName: "default",
	auth: {
		username: "test",
		password: "password"
	}
};

var db = new ArangoJS.Database({ url: "http://localhost:8529" });
db.useDatabase(dbConfig.dbName);
db.useBasicAuth(dbConfig.auth.username, dbConfig.auth.password);

db.listCollections().then(function (collections) {
	alert("Your collections: " + collections.map(function (collection) {
		return collection.name;
	}).join(", "));
});

const UserComponent = props => {
	const [colls, setColls] = React.useState("");
	React.useEffect(() => {	// will be called whenever any value in the second param changes; for now single call
		console.log("useeffect");
		db.collections().then(collections =>
			setColls(collections.map(coll => ({ key: coll.name, value: coll })))
		).then(() => {
			console.log("colls: ", colls);
		});
	}, []);

	return (
		<div>
			<h1>A user</h1>
			<p>{colls}</p>
		</div>
	);
};

// import React from "react";

// class UserComponent extends React.Component {
// 	constructor(props) {
// 		super(props);
// 		this.state = {
// 			email: "",
// 			password: ""
// 		};
// 	}

// 	componentDidMount() { }

// 	componentShouldUpdate() { }

// 	componentWillUnmount() { }

// 	render() {
// 		return (
// 			<div>
// 				<h1>A user</h1>
// 			</div>
// 		);
// 	}
// }

export default UserComponent