## Resource Endpoints
The Resource REST endpoints are compatible with FeathersJS endpoints. Below is a mapping of resource methods to REST API calls:

| Resource Method | HTTP Method | Path        |
|-----------------|-------------|-------------|
| .find()         | GET         | /messages   |
| .get()          | GET         | /messages/1 |
| .create()       | POST        | /messages   |
| .update()       | PUT         | /messages/1 |
| .patch()        | PATCH       | /messages/1 |
| .remove()       | DELETE      | /messages/1 |

Reference: [FeathersJS REST](https://docs.feathersjs.com/api/client/rest.html#find)

## Permissions
Each `Typedef` includes a `table` name that specifies where the instances of that type are stored. Each `tableEntry` inside that `table` is a resource that belongs to one `resourceGroup` exclusively. 

One resource belongs to only one `resourceGroup`, and multiple resources may be grouped into a single `resourceGroup`. When a resource is created:
 1. a `resource owner` user-group is created that is associated with the resource
 1. current user is added to the `resource owner` user-group. This membership stays valid irrespective of all contexts.
 1. the created resource is put into the user's default resource-group for the current `appCtx`.
 1. give all permissions to the `resource owner` group for the default resource-group.

The default resource-group for a user may vary depending on the `appCtx`.


A `user` may belong to multiple `userGroup`s. When a user signs-up,
 1. user account is created with the profile data (email, password etc.)
 1. user is added to the `Everyone` user group.
 1. a built-in `default` resourceGroup is created for him for the current `appCtx`.


 User can later create additional `resourceGroup`s as required. When a resource is assigned to the user, he has to assign that resource to one his resourceGroups.

 User can create additional `userGroup`s. Each `userGroup` may have different access permissions for each of his `resourceGroup`s.

 When a new `appCtx` is created:
  1. for each user, create a new default `resourceGroup` and assign it,
  2. make sure the `ugCtx`, `rgCtx`, `permCtx` are derived uniquely from the name of `appCtx`.

## Queries

#### Query: default resource-group of an user
```
FOR rg IN defaultRG
 FILTER rg._from == @userId && rg.appCtx == @appCtx
 LIMIT 1
RETURN rg
```

#### Query: resources owned by an user
````
FOR m IN memberOf
 FILTER m._from == @userId
 FOR r IN resources
  FILTER r.ownerUG == m._to
RETURN { m, r }
````

#### Query: user-groups which the user is memberOf
````
 FOR mem IN `memberOf`
 FILTER mem._from == @userId && mem.ugCtx in [null, @ugCtx]
 RETURN mem._to 
````

#### Query: permitted methods on a resource for a user
```
 // get the type of resource
 LET rType = (
   FOR r IN `resources`
   FILTER r._id == @resourceId
   LIMIT 1
   RETURN r.type
 )[0]
 
 // get the methods available on the resource (based on its type)
 LET rMethods = (
    FOR tm IN `typeMethods`
    FILTER tm.type == rType
    RETURN tm
 )
 
 // get the resourceGroup to which the resource belongsTo
 LET rg = (
   FOR belong IN `belongsTo`
   FILTER belong._from == @resourceId && belong.rgCtx == @rgCtx
   LIMIT 1
   RETURN belong._to
 )[0]
 
  // get the method rules based on the resource-group
 LET mRules = (
   FOR method in rMethods
     FOR vertex, edge, path IN 2 OUTBOUND @userId GRAPH "system_relations"
     FILTER path.edges[0].ugCtx in [null, @ugCtx] && path.edges[1].permCtx == @permCtx 
     FILTER vertex.rg == rg && vertex.type == rType && REGEX_TEST(method.name, vertex.method) 
   RETURN { m: method.name, p: vertex.permit, r: vertex.method, rlId: vertex._id, ug: path.edges[1]._from }
 )
 
RETURN { rType, rMethods, rg, mRules }

```