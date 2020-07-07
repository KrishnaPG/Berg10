const AdminBro = require('admin-bro');
const AdminBroExpress = require('admin-bro-expressjs');
const { Database, aql: AQL } = require('arangojs');
const Merge = require('lodash.merge');
const atExit = require('exit-hook'); //Graceful shutdown on termination

const app = require('./app');
const expressWs = require('express-ws')(app, null, {
  wsOptions: {
    maxPayload: 1048576,		// maximum 1MB size message
    path: '',						// only accept matching paths of ws://localhost:3000/
    verifyClient: function ({ origin, req, source }, next) {	// Ref: https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback
      if (req.headers['x-fastify-header'] == 'fastify is awesome !') {
        return next(false, 401, "unAuthorized", { 'x-Retry-After': 120 });
      }
      next(true);
    }
  }
});

app.ws('/schepes', (ws, req) => {
  ws.on("message", msg => {
    console.log("socket message: ", msg);
    const rpcReq = safeParse(msg);
    if (!rpcReq) return; // conn.socket.send(`{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}`);
    makeCollectionQuery(rpcReq.method, rpcReq.params).then(result => ws.send(JSON.stringify({
      jsonrpc: "2.0",
      id: rpcReq.id,
      result
    }))).catch(ex => {
      const error = { code: ex.code, message: ex.message, ctx: ex.ctx };
      ws.send(`{"jsonrpc": "2.0", "error": ${JSON.stringify(error)}, "id": "${rpcReq.id}"}`);
    });
  });
});

const collMethods = {
  "findOne": (coll, query) => coll.firstExample(query),
  "findMany": (coll, ids) => coll.lookupByKeys(ids),
  "find": (coll, { offset, limit, sort, desc }) => {
    return db.query(AQL`
				FOR r IN ${coll}
				LIMIT ${offset}, ${limit}
				SORT r.${sort} ${desc ? "DESC" : "ASC"}
				RETURN r
		`).then(cursor => cursor.all());
  }
};

function makeCollectionQuery(method, { collName, query }) {
  const coll = db.collection(collName);
  const fn = collMethods[method];
  if (!fn) return Promise.reject({ code: -32601, message: "Method not found", ctx: { method, collName } });
  return fn(coll, query);
}

function safeParse(jsonStr) {
  try {
    return JSON.parse(jsonStr);
  }
  catch (ex) {
    console.error("JSON.parse failed for: " + jsonStr);
  }
}

const AdminBroArango = require('./admin-bro-arango');
AdminBro.registerAdapter(AdminBroArango);

const db = new Database({ url: "http://localhost:8529" });
db.useDatabase("default");
db.notifyChange = changeObj => {
  console.log("change Object: ", changeObj);
};

const contentParent = {
  name: 'content',
  icon: 'Accessibility',
};

// const CustomDateComponent = { components: { edit: AdminBro.bundle('./components/test-component') } };

const schColl = db.collection("meta-schepes");
schColl.all().then(cursor => cursor.all()).then(docs => {
  // Each of these docs will be sent as `model` param to the resource constructor
  const resources = docs.map(schepe => {
    // add database accessor.
    schepe.$db = db;

    // add custom overloads for few properties, if any
    const properties = {};
    for (let [fld, fldDefn] of Object.entries(schepe.schema)) { 
      if (fldDefn.type == "dateTime")
        properties[fld] = Merge({}, properties[fld]);//, CustomDateComponent);
    }

    return {
      resource: schepe, 
      // options: {
      //   parent: contentParent,
      //   properties
      // }
    };
  }); 

  // const adminBro = new AdminBro({
  //   //databases: [db],
  //   resources,
  //   rootPath: '/admin',
  //   branding: {
  //     logo: 'https://i.imgur.com/DPVOTkw.png',
  //     companyName: 'Bemizu',
  //     softwareBrothers: false
  //   },
  //   pages: {
  //     customPage: {
  //       label: "Custom page",
  //       handler: async (request, response, context) => {
  //         return {
  //           text: 'I am fetched from the backend',
  //         }
  //       },
  //       component: AdminBro.bundle('./components/some-stats'),
  //     },
  //     anotherPage: {
  //       label: "TypeScript page",
  //       component: AdminBro.bundle('./components/some-stats'),
  //     },
  //   }    
  //   //assets: { globalsFromCDN: false }
  // });
  // const router = AdminBroExpress.buildRouter(adminBro);

  // app.use(adminBro.options.rootPath, router);
  const server = app.listen(8080, () => console.log('AdminBro is under localhost:8080/admin'));
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log('Address in use, retrying...');
      setTimeout(() => {
        server.close();
        server.listen(8080, '0.0.0.0');
      }, 1000);
    }
  });  

  atExit(() => {
    db.close();
    server.close();
  });
});
