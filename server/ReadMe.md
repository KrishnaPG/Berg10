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

One resource belongs to only one `resourceGroup`, and multiple resources may be grouped into a single `resourceGroup`.

A `user` may belong to multiple `userGroup`s. 