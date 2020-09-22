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


 User can later create additional `resourceGroup`s as required. When a resource is assigned to the user, he has to assign that resource to one of his resourceGroups.

 User can create additional `userGroup`s. Each `userGroup` may have different set of access permissions for each of his `resourceGroup`s. 
 
 Each `userGroup` also has a profile extension-type that adds additional attributes to the user, specific to that group context. The values for that profile extension-type for each user are stored on the `membership` edge (between `user` and the corresponding `userGroup`).

 When a new `appCtx` is created:
  1. for each user, create a new default `resourceGroup` and assign it,
  2. make sure the `ugCtx`, `rgCtx`, `permCtx` are derived uniquely from the name of `appCtx`.


A type definition is just a group of data items. A `typeDef` can support multiple `interface`s. An `interface` specifies a list of `method`s available that can be performed on the underlying typed data object. A `userGroup` should have `permission` to an `interface`'s method to be able invoke it. 

`permission`s are defined either as `allow` or `deny` for a `method`. A user may have different permissions to the method based on the the `userGroup` that he belongs to, and the `permCtx` (along with the `rgCtx`, and the `appCtx` in general). A `deny` permission takes precedence over all other `allow` permissions to a method. That is, if a user is a member of many `userGroup`s that each has `allow` permission to a given method, and yet adding him to a single `userGroup` which has `deny` permission to that same method, would effectively make that method inaccessible for that user. In other words, to be able to invoke a method, a user 
  1. should not have an explicit `deny` permission for **any** of the `userGroup`s that he is a member of, and
  2. should have an explicit `allow` permission for at least one of the `userGroup`s that he is a member of.


Constraints
  1. Mutually Exclusive roles: 
    - the same user can be assigned to at most one role in a mutually exclusive set (separation of duties)
    - the same permission cannot be assigned to both roles (only one of them can be assigned the permission in the exclusive set)
  2. Cardinality constraint:
    - Maximum number of members for a role: For example, only one person in the role of a chairman
    - Maximum number of roles to which a user can belong
    - Maximum number of roles to which a permission can be assigned: controls the distribution of power
  3. Prerequisite constraints: 
    - user can be assigned role A, only if the user is already a member of role B
    - a permission p can be assigned to a role only if that role already has permission q

Ref: https://profsandhu.com/articles/advcom/adv_comp_rbac.pdf

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