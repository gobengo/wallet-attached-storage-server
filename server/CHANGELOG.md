# wallet-attached-storage-server

## 0.4.1

### Patch Changes

- c4e90a7: fix how requests are authorized by acl. Previously, authz-space-acl was incorreclty determining the ACL to use when determining whether a request is authorized. Previously, any acl link target in the linkset would be used, regardless of whether the link's anchor was relevant to the request target. Now we attempt to determine the effective ACL for the request target using the effective ACL discovery algorithm from Web Access Control. ⚠️ authorization checks were wrong before this change. Please adopt this fix ASAP.

## 0.4.0

### Minor Changes

- ab150e3: GET /space/:uuid with header accept: application/x-tar responds with tar archive

## 0.3.0

### Minor Changes

- 88cd73e: Add support for postgresql

  This was a bit more involved than expected, because afaict sqlite3 and postgresql do not have any common data type for storing blobs. UUID data types and querything them is also slightly different. Where necessary, Kysely supports introspection such that the wallet-attached-storage-database modules can detect whether the database is backed by sqlite3 or postgresql and adjust behavior accordingly.

- 78d7e08: Support ACLs represented as application/json w/ type PublicCanRead
- 5d21396: handle DELETE /space/:spaceUuid/:resourceName
- eddda21: authz-middleware: now can authorize by following Space#link to a linkset, and from there a link rel=acl to an ACL
- b2fa0c6: ServerHono now adds an onError handler that formats ZodError
- b2fa0c6: PUT /space/:uuid: add request body parser, require space.controller
- b2fa0c6: add server tests for requesting POST /spaces/ with no controller
- 47e70f7: add handler for DELETE /space/:uuid
- b2fa0c6: POST /spaces/ requires space.controller

## 0.2.0

### Minor Changes

- f730ec6: Space HTTP API resources require authorization from the space controller. Authorization can be provided as an HTTP Signature signed by the Space Controller, or an HTTP Signature invoking a ZCAP <https://w3c-ccg.github.io/zcap-spec/> delegated by the Space Controller.

## 0.1.0

### Minor Changes

- 444361e: server: can construct with options.cors to configure CORS behavior
- f3cf12a: add route for PUT /space/:uuid that handles requests to updat e a space
- 6ed3d81: GET /spaces/:uuid checks request authorization. If there is not sufficient authorizaiton to access the space (and even if that's because there is no known space with that uuid), the response status code is now 401
