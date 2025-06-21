/**
 * @file tests of how server behaves handling requests with `Authorization: Signature ...`
 * with a keyId=did:key:...
 */
import { describe, test } from 'node:test'
import { Server } from '../server.ts'
import { createDatabaseFromSqlite3Url } from 'wallet-attached-storage-database/sqlite3'
import * as wasdb from 'wallet-attached-storage-database'
import assert from 'assert'
import { Ed25519Signer } from '@did.coop/did-key-ed25519'
import { createHttpSignatureAuthorization } from 'authorization-signature'

const EXAMPLE_BASE_URL = 'https://example.example'

// create a database suitable for constructing a testable Server(database)
async function createTestDatabase() {
  const database = createDatabaseFromSqlite3Url('sqlite::memory:')
  await wasdb.initializeDatabaseSchema(database)
  return database
}

const createRequestToPutSpace = (spaceUuid: string, spaceRepresentation: unknown) => new Request(new URL(`/space/${spaceUuid}`, 'http://example.example'), {
  method: 'PUT',
  body: JSON.stringify(spaceRepresentation),
  headers: {
    'Content-Type': 'application/json',
  },
})

await describe('wallet-attached-storage-server with acl type PublicCanRead', async t => {
  const database = await createTestDatabase()
  const server = new Server(database)

  await test('web publishing with acl type PublicCanRead on space /', async t => {
    let spaceUuid: string | undefined
    const keyForAlice = await Ed25519Signer.generate()
    spaceUuid = crypto.randomUUID()
    const spaceToCreate = {
      controller: keyForAlice.controller,
      // configure pointer to links of space
      link: `/space/${spaceUuid}/links/`,
    }
    const request = createRequestToPutSpace(spaceUuid, spaceToCreate)
    const response = await server.fetch(request)
    assert.equal(response.status, 204, 'response status to PUT /spaces/ MUST be 204')

    await t.test('PUT homepage with http sig from space controller', async t => {
      const homepage = new Blob(['<!doctype html><h1>Home Page</h1><p>hello world<p>'], { type: 'text/html' })
      const requestUrl = new URL(`/space/${spaceUuid}/`, 'http://example.example')
      const requestMethod = 'PUT'
      const responseToPutHomepage = await server.fetch(new Request(requestUrl, {
        method: requestMethod,
        body: homepage,
        headers: {
          authorization: await createHttpSignatureAuthorization({
            signer: keyForAlice,
            url: requestUrl,
            method: requestMethod,
            headers: {},
            includeHeaders: [
              '(created)',
              '(expires)',
              '(key-id)',
              '(request-target)',
            ],
            created: new Date,
            expires: new Date(Date.now() + 30 * 1000),
          })
        }
      }))
      assert.ok(
        responseToPutHomepage.ok,
        'response to PUT /space/:uuid/ MUST be ok')
    })

    await t.test('PUT /space/:space/links/ with acl link', async t => {
      const linkset = {
        linkset: [
          {
            anchor: `/space/${spaceUuid}/`,
            acl: [
              { href: `/space/${spaceUuid}/acl` },
            ]
          }
        ]
      }
      const blobForLinkset = new Blob(
        [JSON.stringify(linkset)],
        { type: 'application/linkset+json' }
      )
      const requestUrl = new URL(`/space/${spaceUuid}/links/`, 'http://example.example')
      const requestMethod = 'PUT'
      const responseToPutHomepage = await server.fetch(new Request(requestUrl, {
        method: requestMethod,
        body: blobForLinkset,
        headers: {
          authorization: await createHttpSignatureAuthorization({
            signer: keyForAlice,
            url: requestUrl,
            method: requestMethod,
            headers: {},
            includeHeaders: [
              '(created)',
              '(expires)',
              '(key-id)',
              '(request-target)',
            ],
            created: new Date,
            expires: new Date(Date.now() + 30 * 1000),
          })
        }
      }))
      assert.ok(
        responseToPutHomepage.ok,
        `response to PUT ${requestUrl.pathname} MUST be ok`)
    })

    await t.test(`PUT PublicCanRead /space/:space/acl`, async t => {
      // set acl to PublicCanRead
      {
        const acl = { type: 'PublicCanRead' }
        const blobForAcl = new Blob([JSON.stringify(acl)], { type: 'application/json' })
        const requestUrl = new URL(`/space/${spaceUuid}/acl`, 'http://example.example')
        const requestMethod = 'PUT'
        const responseToPutHomepage = await server.fetch(new Request(requestUrl, {
          method: requestMethod,
          body: blobForAcl,
          headers: {
            authorization: await createHttpSignatureAuthorization({
              signer: keyForAlice,
              url: requestUrl,
              method: requestMethod,
              headers: {},
              includeHeaders: [
                '(created)',
                '(expires)',
                '(key-id)',
                '(request-target)',
              ],
              created: new Date,
              expires: new Date(Date.now() + 30 * 1000),
            })
          }
        }))
        assert.ok(
          responseToPutHomepage.ok,
          `response to PUT ${requestUrl.pathname} MUST be ok`)
      }
    })

    await t.test('GET homepage sans auth (expecting acl)', async t => {
      const requestUrl = new URL(`/space/${spaceUuid}/`, 'http://example.example')
      const requestMethod = 'GET'
      const response = await server.fetch(new Request(requestUrl, {
        method: requestMethod,
        headers: {
          accept: 'text/html',
        }
      }))
      if (!response.ok) {
        console.warn('unexpected not ok response', response)
      }
      assert.ok(response.ok, `response to ${requestMethod} /space/:uuid/ sans auth MUST be ok`)
    })

    await t.test('PUT item in container with PublicCanRead and expect to be able to GET as public', async t => {
      // url of new item in space container
      const item0Url = new URL(`/space/${spaceUuid}/item/${crypto.randomUUID()}`, 'http://example.example')

      // put item in space container
      {
        const item0Representation = new Blob(['<!doctype html><h1>Item 0</h1>'], { type: 'text/html' })
        const requestUrl = item0Url
        const requestMethod = 'PUT'
        const responseToPutHomepage = await server.fetch(new Request(item0Url, {
          method: requestMethod,
          body: item0Representation,
          headers: {
            authorization: await createHttpSignatureAuthorization({
              signer: keyForAlice,
              url: requestUrl,
              method: requestMethod,
              headers: {},
              includeHeaders: [
                '(created)',
                '(expires)',
                '(key-id)',
                '(request-target)',
              ],
              created: new Date,
              expires: new Date(Date.now() + 30 * 1000),
            })
          }
        }))
        assert.ok(
          responseToPutHomepage.ok,
          `response to ${requestMethod} ${item0Url.pathname} MUST be ok`)
      }

      // get the item without auth, expecting it to be ok
      {
        const response = await server.fetch(new Request(item0Url))
        if (!response.ok) {
          console.warn('unexpected not ok response', response)
        }
        assert.ok(response.ok, `response to GET ${item0Url.pathname} sans auth MUST be ok`)
      }
    })
  })

  await test('web publishing with acl type PublicCanRead only for space /public/', async t => {
    const spaceUuid = crypto.randomUUID()
    const spaceHref = `/space/${spaceUuid}`
    const publicHref = `/space/${spaceUuid}/public`
    const publicContainerHref = `${publicHref}/`
    const publicAclHref = `/space/${spaceUuid}/PublicCanRead`
    const linksHref = `/space/${spaceUuid}/links/`
    const keyForAlice = await Ed25519Signer.generate()
    const item0Href = `${publicContainerHref}item0`
    const itemNestedHref = `${publicContainerHref}items/stuff/myItem`

    // create the space
    {
      const spaceToCreate = {
        controller: keyForAlice.controller,
        // configure pointer to links of space
        link: linksHref,
      }
      const request = createRequestToPutSpace(spaceUuid, spaceToCreate);
      const response = await server.fetch(request)
      assert.ok(response.ok, 'response status to PUT space MUST be ok')
    }
    // put PublicCanRead resource so we can use it as an acl
    {
      const href = publicAclHref
      const body = new Blob(
        [JSON.stringify({ type: 'PublicCanRead' })],
        { type: 'application/json' })
      const signer = keyForAlice
      const response = await serverPut({ server, href, body, signer })
      assert.ok(response.ok, `response to PUT ${href} MUST be ok`)
    }
    // put the space linkset
    {
      const linkset = {
        linkset: [
          {
            anchor: publicContainerHref,
            acl: [
              { href: publicAclHref },
            ]
          }
        ]
      }
      const href = linksHref
      const body = new Blob(
        [JSON.stringify(linkset)],
        { type: 'application/linkset+json' })
      const signer = keyForAlice
      const response = await serverPut({ server, href, body, signer })
      assert.ok(response.ok, `response to PUT linkset MUST be ok`)
    }

    // test with an item that is nested several containers deep
    await t.test(`PUT ${itemNestedHref.replace(spaceHref, '')} and expect to be able to GET it without authorization`, async t => {
      // put an itemNestedHref in /public/
      {
        const href = itemNestedHref
        const bodyObject = { name: `itemNestedHref` }
        const body = new Blob([JSON.stringify(bodyObject)], { type: 'application/json' })
        const signer = keyForAlice
        const response = await serverPut({ server, href, body, signer })
        assert.ok(response.ok, `response to PUT ${href} MUST be ok`)
      }
      // get itemNestedHref without auth and expect it to work
      {
        const requestUrl = new URL(itemNestedHref, EXAMPLE_BASE_URL)
        const response = await server.fetch(new Request(requestUrl))
        try {
          assert.ok(response.ok, `response to GET itemNestedHref MUST be ok`)
        } catch (error) {
          console.warn(`response not ok`, response)
          throw error
        }
      }
    })

    // test that resources outside of /public/ still require auth
    await t.test(`resources not in /public/ should still require auth`, async t => {
      const nonpublicHref = `${spaceHref}/nonpublic`
      // put a resource at /nonpublic
      {
        const href = nonpublicHref
        const body = new Blob(['nonpublic'])
        const signer = keyForAlice
        const response = await serverPut({ server, href, body, signer })
        assert.ok(response.ok, `response to PUT ${href} MUST be ok`)
      }
      // try to get it sans auth, expect not ok
      {
        const response = await server.fetch(new Request(new URL(nonpublicHref, EXAMPLE_BASE_URL)))
        assert.ok(!response.ok, `response to GET ${nonpublicHref.replace(spaceHref, '')} sans auth MUST NOT be ok, because it has no acl`)
        assert.equal(response.status, 401, `response to GET sans auth is 401`)
      }
    })
  })
})

async function serverPut({ body, href, server, signer, ...options }: {
  server: Server,
  href: string,
  body?: Blob,
  signer: Ed25519Signer
}) {
  const requestUrl = new URL(href, 'https://example.example')
  const requestMethod = 'PUT'
  const responseToPutLinkset = await server.fetch(new Request(requestUrl, {
    method: requestMethod,
    body,
    headers: {
      authorization: await createHttpSignatureAuthorization({
        signer,
        url: requestUrl,
        method: requestMethod,
        headers: {},
        includeHeaders: [
          '(created)',
          '(expires)',
          '(key-id)',
          '(request-target)',
        ],
        created: new Date,
        expires: new Date(Date.now() + 30 * 1000),
      })
    }
  }))
  return responseToPutLinkset
}

export function urlWithProtocol(url: URL | string, protocol: `${string}:`) {
  const url2 = new URL(url)
  url2.protocol = protocol
  return url2
}