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