---
"wallet-attached-storage-server": patch
---

fix how requests are authorized by acl. Previously, authz-space-acl was incorreclty determining the ACL to use when determining whether a request is authorized. Previously, any acl link target in the linkset would be used, regardless of whether the link's anchor was relevant to the request target. Now we attempt to determine the effective ACL for the request target using the effective ACL discovery algorithm from Web Access Control. ⚠️ authorization checks were wrong before this change. Please adopt this fix ASAP.
