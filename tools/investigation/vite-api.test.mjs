import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtemp, mkdir, writeFile, rm, readFile, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { investigationApi } from './vite-api.mjs'

test('local API preserves catalog, review and operational authorization boundaries', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nisr-api-'))
  const id = '11111111-1111-4111-8111-111111111111'
  const directory = path.join(root, 'investigations', 'runs', id)
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ id, district: 'Gisagara', status: 'Completed', started_at: '2026-10-25', updated_at: new Date().toISOString() }))
  await writeFile(path.join(directory, '01-discovering-data.json'), JSON.stringify({ files_discovered: 1, tables_inventoried: 1, variables_inventoried: 1, failed_tables: 0, skipped_tables: 0,
    tables: [{ table: 'survey', filename: 'survey.csv', status: 'Completed', variables: [{ name: 'poverty', classification: 'Requires processing' }] }] }))
  let middleware
  investigationApi(root).configureServer({ middlewares: { use(_prefix, handler) { middleware = handler } } })
  const server = http.createServer((request, response) => middleware(request, response))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    assert.equal((await fetch(`${base}/history`, { headers: { Origin: 'https://untrusted.example' } })).status, 403)
    assert.equal((await fetch(`${base}/catalog/not-a-uuid`)).status, 400)
    const catalog = await (await fetch(`${base}/catalog/${id}?q=poverty`)).json()
    assert.equal(catalog.total, 1)
    assert.equal(catalog.rows[0].variable.name, 'poverty')
    for (const operation of ['approve', 'act', 'follow-up']) {
      assert.equal((await fetch(`${base}/${operation}/${id}`, { method: 'POST' })).status, 403)
    }
    const post = (value) => fetch(`${base}/review/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
    assert.equal((await post({ decision: 'approve', note: 'Cannot elevate via review' })).status, 400)
    assert.equal((await post({ decision: 'request_data', note: 'Obtain confidence intervals before action.' })).status, 200)
    const review = await (await fetch(`${base}/review/${id}`)).json()
    assert.equal(review.decisions.length, 1)
    assert.match(review.decisions[0].status, /no operational authority/)
    assert.equal((await (await fetch(`${base}/history`)).json()).investigations[0].id, id)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    assert.ok(path.resolve(root).startsWith(path.join(os.tmpdir(), 'nisr-api-')))
    await rm(root, { recursive: true, force: true })
  }
})

test('history deletion validates IDs, protects active work and preserves sources with recoverable copies', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nisr-api-delete-'))
  const runs = path.join(root, 'investigations', 'runs')
  const ids = Array.from({ length: 7 }, (_, i) => `${String(i + 1).repeat(8)}-1111-4111-8111-111111111111`)
  ids[5] = 'abcdefab-1111-4111-8111-111111111111'
  const statuses = ['Completed', 'Warning', 'Running', 'Pending', 'Failed', 'Completed', 'Warning']
  for (let i = 0; i < ids.length; i++) {
    const folder = path.join(runs, ids[i])
    await mkdir(folder, { recursive: true })
    await writeFile(path.join(folder, 'manifest.json'), JSON.stringify({ id: ids[i], district: 'Gisagara', status: statuses[i], started_at: '2026-10-26', updated_at: new Date().toISOString() }))
    await writeFile(path.join(folder, 'investigation.pdf'), 'saved report')
  }
  await mkdir(path.join(root, 'Data'))
  await writeFile(path.join(root, 'Data', 'source.csv'), 'original data')
  await mkdir(path.join(root, 'investigations', 'source-cache'))
  await writeFile(path.join(root, 'investigations', 'source-cache', 'publication.pdf'), 'verified source')
  let middleware
  investigationApi(root).configureServer({ middlewares: { use(_prefix, handler) { middleware = handler } } })
  const server = http.createServer((request, response) => middleware(request, response))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const remove = (selected, headers = {}) => fetch(`${base}/history`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ ids: selected }) })
  try {
    assert.equal((await remove([ids[0]], { Origin: 'https://untrusted.example' })).status, 403)
    for (const selection of [[], [ids[0], '../Data'], [null], 'all', Array(201).fill(ids[0])]) assert.equal((await remove(selection)).status, 400)
    assert.equal((await (await fetch(`${base}/history`)).json()).investigations.length, 7)
    const missing = 'aaaaaaaa-1111-4111-8111-111111111111'
    const batch = await (await remove([ids[0], ids[1], ids[2], ids[3], missing, ids[0]])).json()
    assert.deepEqual(batch.deleted, [ids[0], ids[1]])
    assert.equal(batch.skipped.length, 3)
    assert.equal((await fetch(`${base}/run/${ids[0]}`)).status, 404)
    const remaining = (await (await fetch(`${base}/history`)).json()).investigations.map((run) => run.id)
    assert.ok(remaining.includes(ids[2]) && remaining.includes(ids[3]))
    assert.ok(!remaining.includes(ids[0]) && !remaining.includes(ids[1]))
    const trash = path.join(root, 'investigations', 'trash')
    assert.equal((await readdir(trash)).length, 2)
    for (const folder of await readdir(trash)) assert.equal(await readFile(path.join(trash, folder, 'investigation.pdf'), 'utf8'), 'saved report')
    assert.equal((await (await remove([ids[0]])).json()).deleted.length, 0)
    assert.deepEqual((await (await remove([ids[4]])).json()).deleted, [ids[4]])
    const simultaneous = await Promise.all([remove([ids[5]]), remove([ids[5].toUpperCase()])])
    const outcomes = await Promise.all(simultaneous.map((response) => response.json()))
    assert.equal(outcomes.reduce((sum, response) => sum + response.deleted.length, 0), 1)
    const [review, deletion] = await Promise.all([
      fetch(`${base}/review/${ids[6]}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'request_data', note: 'Check uncertainty.' }) }),
      remove([ids[6]]),
    ])
    const deleted = (await deletion.json()).deleted.includes(ids[6])
    if (deleted) assert.equal((await fetch(`${base}/run/${ids[6]}`)).status, 404)
    else assert.equal(review.status, 200)
    assert.equal(await readFile(path.join(root, 'Data', 'source.csv'), 'utf8'), 'original data')
    assert.equal(await readFile(path.join(root, 'investigations', 'source-cache', 'publication.pdf'), 'utf8'), 'verified source')
  } finally {
    await new Promise((resolve) => server.close(resolve))
    assert.ok(path.resolve(root).startsWith(path.join(os.tmpdir(), 'nisr-api-delete-')))
    await rm(root, { recursive: true, force: true })
  }
})

test('priority board route serves the saved board and an empty one before any batch has run', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nisr-api-'))
  await mkdir(path.join(root, 'investigations'), { recursive: true })
  let middleware
  investigationApi(root).configureServer({ middlewares: { use(_prefix, handler) { middleware = handler } } })
  const server = http.createServer((request, response) => middleware(request, response))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const empty = await (await fetch(`${base}/board`)).json()
    assert.deepEqual([empty.districts.length, empty.districts_included], [0, 0])
    assert.equal((await fetch(`${base}/board`, { headers: { Origin: 'https://untrusted.example' } })).status, 403)
    await writeFile(path.join(root, 'investigations', 'priority_board.json'), JSON.stringify({ districts: [{ rank: 1, district: 'Kamonyi' }], districts_included: 1, districts_expected: 30, missing: [], signals: [] }))
    const board = await (await fetch(`${base}/board`)).json()
    assert.equal(board.districts[0].district, 'Kamonyi')
  } finally {
    await new Promise((resolve) => server.close(resolve))
    assert.ok(path.resolve(root).startsWith(path.join(os.tmpdir(), 'nisr-api-')))
    await rm(root, { recursive: true, force: true })
  }
})
