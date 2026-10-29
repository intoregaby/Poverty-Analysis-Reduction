import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, readdir, writeFile, mkdir, rename, lstat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { writeAiReport } from './ai-report.mjs'
import { answerInvestigationQuestion } from './ai-chat.mjs'
import { buildProviders, describeImage } from './llm.mjs'
import { organizeNotebook } from './ai-notebook.mjs'
import { sanitizeFindings } from './ai-chat.mjs'
import { fetchWebSource, readFileWithPython, summarizeSource } from './web-source.mjs'
import { loadPlatformCatalog, searchPlatform, PLATFORM } from './data-platform.mjs'
import { listSites, publicSite, removeSite, searchSites, startCrawl } from './site-index.mjs'
import { makeRenderer } from './browser-render.mjs'

const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function jsonFile(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

// On Windows a rename onto a file another program has open for a moment fails with EPERM/EBUSY/EACCES; try again briefly.
async function renameWithRetry(from, to, attempts = 40, pause = 150) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { await rename(from, to); return } catch (error) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt === attempts - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, pause))
    }
  }
}

async function atomicJson(file, value) {
  const temporary = `${file}.${randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(value, null, 2), 'utf8')
  await renameWithRetry(temporary, file)
}

function watchWorker(child, folder, onDone = () => {}) {
  const fail = async (message) => {
    try {
      const file = path.join(folder, 'manifest.json')
      const manifest = await jsonFile(file)
      if (!['Running', 'Pending'].includes(manifest.status)) return
      manifest.status = 'Failed'
      manifest.updated_at = new Date().toISOString()
      manifest.errors.push(message)
      await atomicJson(file, manifest)
    } catch { /* A worker lease still exposes interruption when storage is unavailable. */ }
  }
  child.on('error', () => { onDone(); void fail('The local Python worker could not start. Check the configured environment and packages.') })
  child.on('exit', (code) => { onDone(); if (code !== 0) void fail('The local Python worker exited before completing its stages. Saved checkpoints are available for retry.') })
}

async function interrupted(store, id, manifest) {
  if (!['Running', 'Pending'].includes(manifest.status)) return false
  const lease = path.join(store, 'runs', id, 'lease.json')
  const heartbeat = existsSync(lease) ? (await jsonFile(lease)).heartbeat_at : manifest.updated_at
  return Date.now() - Math.max(Date.parse(heartbeat), Date.parse(manifest.updated_at)) > 120000
}

async function listHistory(store) {
  const runs = path.join(store, 'runs')
  if (!existsSync(runs)) return []
  const records = []
  for (const id of await readdir(runs)) {
    if (!validId.test(id)) continue
    try {
      const value = await jsonFile(path.join(runs, id, 'manifest.json'))
      records.push({ id, district: value.district, started_at: value.started_at, updated_at: value.updated_at, status: value.status, previous_id: value.previous_id, change_since_previous: value.change_since_previous })
    } catch { /* An incomplete run remains visible through its direct ID. */ }
  }
  return records.sort((a, b) => b.started_at.localeCompare(a.started_at))
}

async function readBody(request) {
  const chunks = []
  let length = 0
  for await (const chunk of request) {
    length += chunk.length
    if (length > 40000) throw new Error('Request is too large.')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const MAX_UPLOAD = 12_000_000
const MAX_IMAGE = 4_000_000
// Only these kinds are accepted; SVG is left out because it can carry scripts.
const UPLOAD_TYPES = {
  png: { kind: 'image', mime: 'image/png', image: true }, jpg: { kind: 'image', mime: 'image/jpeg', image: true }, jpeg: { kind: 'image', mime: 'image/jpeg', image: true },
  webp: { kind: 'image', mime: 'image/webp', image: true }, gif: { kind: 'image', mime: 'image/gif', image: true },
  pdf: { kind: 'pdf', mime: 'application/pdf' }, csv: { kind: 'csv', mime: 'text/csv' }, json: { kind: 'json', mime: 'application/json' },
  xlsx: { kind: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, docx: { kind: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  txt: { kind: 'txt', mime: 'text/plain' }, md: { kind: 'txt', mime: 'text/plain' },
}

async function readRaw(request, limit) {
  const chunks = []
  let length = 0
  for await (const chunk of request) {
    length += chunk.length
    if (length > limit) throw new Error('This file is larger than 12 MB. Add a smaller file.')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function send(response, status, value) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(value))
}

export function investigationApi(root, apiKey = '', nvidiaKey = '') {
  const providers = buildProviders({ groqKey: apiKey, nvidiaKey })
  const store = path.join(root, 'investigations')
  const workers = new Map()
  const resuming = new Set()
  const changing = new Set()
  const writingReports = new Set()
  const python = process.platform === 'win32' ? path.join(root, '.venv', 'Scripts', 'python.exe') : path.join(root, '.venv', 'bin', 'python')
  return {
    name: 'local-investigation-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__local/investigations', async (request, response) => {
        const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(request.headers.host || '')
        if (!localHost || (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`)) {
          send(response, 403, { error: 'Local investigations are available only on this laptop.' })
          return
        }
        const url = new URL(request.url || '/', 'http://localhost')
        const parts = url.pathname.split('/').filter(Boolean)
        const id = parts[1]?.toLowerCase()
        if (id && !validId.test(id)) {
          send(response, 400, { error: 'Invalid investigation ID.' })
          return
        }
        try {
          if (request.method === 'GET' && parts[0] === 'board') {
            send(response, 200, await jsonFile(path.join(store, 'priority_board.json')).catch(() => ({ districts: [], districts_included: 0, districts_expected: 0, missing: [], signals: [] })))
            return
          }
          if (request.method === 'GET' && parts[0] === 'history') {
            send(response, 200, { investigations: await listHistory(store) })
            return
          }
          if (request.method === 'DELETE' && parts.length === 1 && parts[0] === 'history') {
            const { ids } = await readBody(request)
            if (!Array.isArray(ids) || !ids.length || ids.length > 200 || ids.some((value) => typeof value !== 'string' || !validId.test(value))) {
              send(response, 400, { error: 'Select between 1 and 200 valid investigations.' })
              return
            }
            const deleted = []
            const skipped = []
            for (const runId of new Set(ids.map((value) => value.toLowerCase()))) {
              if (changing.has(runId) || resuming.has(runId) || [...workers.values()].includes(runId)) {
                skipped.push({ id: runId, reason: 'This investigation is busy. Try again after it finishes.' })
                continue
              }
              changing.add(runId)
              try {
                const folder = path.resolve(store, 'runs', runId)
                if (path.dirname(folder) !== path.resolve(store, 'runs') || (await lstat(store)).isSymbolicLink() || (await lstat(path.join(store, 'runs'))).isSymbolicLink() || (await lstat(folder)).isSymbolicLink()) throw new Error('Invalid investigation folder.')
                const manifest = await jsonFile(path.join(folder, 'manifest.json'))
                if (!['Completed', 'Warning', 'Failed', 'Skipped'].includes(manifest.status)) {
                  skipped.push({ id: runId, reason: 'An investigation that is still running cannot be deleted.' })
                  continue
                }
                // Keep recoverable local copies, outside the worker's history/checkpoint search.
                const trash = path.resolve(store, 'trash')
                await mkdir(trash, { recursive: true })
                if ((await lstat(trash)).isSymbolicLink()) throw new Error('Invalid trash folder.')
                await rename(folder, path.join(trash, `${runId}-${randomUUID()}`))
                deleted.push(runId)
              } catch (error) {
                skipped.push({ id: runId, reason: error.code === 'ENOENT' ? 'This investigation no longer exists.' : 'This investigation could not be deleted. Try again.' })
              } finally { changing.delete(runId) }
            }
            send(response, 200, { deleted, skipped })
            return
          }
          if (request.method === 'POST' && parts[0] === 'run') {
            const { district } = await readBody(request)
            const source = await jsonFile(path.join(root, 'src', 'data', 'dashboard-eicv7-aggregates.json'))
            if (!source.districts.some((row) => row.name === district)) {
              send(response, 400, { error: 'Choose a district in the EICV7 dataset.' })
              return
            }
            if (!existsSync(python)) {
              send(response, 503, { error: 'Investigation Python packages are not installed. See tools/investigation/requirements.txt.' })
              return
            }
            const allHistory = await listHistory(store)
            const candidates = allHistory.filter((item) => item.district === district && ['Running', 'Pending'].includes(item.status))
            let running
            for (const candidate of candidates) {
              if (!await interrupted(store, candidate.id, candidate)) { running = candidate; break }
            }
            if (workers.has(district)) running = { id: workers.get(district) }
            if (running) {
              send(response, 200, { id: running.id, status: 'Running', reused: true })
              return
            }
            const runId = randomUUID()
            workers.set(district, runId)
            const folder = path.join(store, 'runs', runId)
            await mkdir(folder, { recursive: true })
            await atomicJson(path.join(folder, 'manifest.json'), {
              id: runId, district, status: 'Pending', started_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              previous_id: allHistory.find((item) => item.district === district)?.id || null, data_signature: null,
              counts: { files_discovered: 0, tables_inventoried: 0, variables_inventoried: 0, sources_verified: 0, cached_sources_available: 0 },
              stages: ['Discovering Data', 'Checking Sources', 'Connecting Datasets', 'Analyzing Evidence', 'Finding Drivers', 'Comparing Districts', 'Reviewing Solutions', 'Preparing Findings'].map((name) => ({ name, status: 'Pending', work: '', warnings: [], errors: [] })), warnings: [], errors: [],
            })
            const child = spawn(python, ['-m', 'tools.investigation.engine', 'run', '--district', district, '--id', runId], {
              cwd: root, windowsHide: true, detached: true, stdio: 'ignore', env: { ...process.env, GROQ_API_KEY: apiKey, PYTHONIOENCODING: 'utf-8' },
            })
            watchWorker(child, folder, () => { if (workers.get(district) === runId) workers.delete(district) })
            child.unref()
            send(response, 202, { id: runId, status: 'Pending' })
            return
          }
          if (request.method === 'GET' && parts[0] === 'run' && id) {
            const manifest = path.join(store, 'runs', id, 'manifest.json')
            if (!existsSync(manifest)) {
              send(response, 404, { error: 'Investigation not found.' })
              return
            }
            const state = await jsonFile(manifest)
            const events = path.join(store, 'runs', id, 'events.jsonl')
            const recent_events = existsSync(events) ? (await readFile(events, 'utf8')).trim().split('\n').slice(-200).map((line) => JSON.parse(line)) : []
            const wasInterrupted = await interrupted(store, id, state)
            send(response, 200, { ...state, status: wasInterrupted ? 'Failed' : state.status, interrupted: wasInterrupted, recent_events })
            return
          }
          if (request.method === 'POST' && parts[0] === 'resume' && id) {
            if (changing.has(id)) { send(response, 409, { error: 'This investigation is being changed. Try again.' }); return }
            changing.add(id)
            try {
            if (resuming.has(id)) { send(response, 202, { id, status: 'Running', reused: true }); return }
            const manifest = await jsonFile(path.join(store, 'runs', id, 'manifest.json'))
            if (manifest.status !== 'Failed' && !await interrupted(store, id, manifest)) {
              send(response, 409, { error: 'Only failed investigations can resume.' })
              return
            }
            if (resuming.has(id)) { send(response, 202, { id, status: 'Running', reused: true }); return }
            resuming.add(id)
            manifest.status = 'Pending'
            manifest.updated_at = new Date().toISOString()
            await atomicJson(path.join(store, 'runs', id, 'manifest.json'), manifest)
            const child = spawn(python, ['-m', 'tools.investigation.engine', 'resume', '--id', id], {
              cwd: root, windowsHide: true, detached: true, stdio: 'ignore', env: { ...process.env, GROQ_API_KEY: apiKey, PYTHONIOENCODING: 'utf-8' },
            })
            watchWorker(child, path.join(store, 'runs', id), () => resuming.delete(id))
            child.unref()
            send(response, 202, { id, status: 'Running' })
            return
            } finally { changing.delete(id) }
          }
          if (request.method === 'GET' && parts[0] === 'result' && id) {
            const current = path.join(store, 'runs', id, '08-preparing-findings.json')
            const result = existsSync(current) ? current : path.join(store, 'runs', id, '07-preparing-findings.json')
            if (!existsSync(result)) {
              send(response, 404, { error: 'Findings are not ready.' })
              return
            }
            send(response, 200, await jsonFile(result))
            return
          }
          if (request.method === 'GET' && parts[0] === 'catalog' && id) {
            const catalog = await jsonFile(path.join(store, 'runs', id, '01-discovering-data.json'))
            const query = (url.searchParams.get('q') || '').toLowerCase().trim().slice(0, 100)
            const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
            const rows = []
            for (const table of catalog.tables) {
              if (!table.variables?.length) {
                if (!query || `${table.filename} ${table.error}`.toLowerCase().includes(query)) rows.push({ table: table.table, filename: table.filename, status: table.status, error: table.error, variable: null })
              } else {
                for (const variable of table.variables) {
                  if (!query || `${table.filename} ${table.table} ${variable.name} ${variable.label} ${variable.classification}`.toLowerCase().includes(query)) {
                    rows.push({ table: table.table, filename: table.filename, status: table.status, variable })
                  }
                }
              }
            }
            send(response, 200, { counts: { files: catalog.files_discovered, tables: catalog.tables_inventoried, variables: catalog.variables_inventoried, failures: catalog.failed_tables, skipped: catalog.skipped_tables }, total: rows.length, page, rows: rows.slice((page - 1) * 100, page * 100) })
            return
          }
          if (request.method === 'GET' && parts[0] === 'report' && id && ['pdf', 'xlsx'].includes(parts[2])) {
            const extension = parts[2]
            const file = path.join(store, 'runs', id, `investigation.${extension}`)
            if (!existsSync(file)) {
              send(response, 404, { error: 'Report is not ready.' })
              return
            }
            response.setHeader('Content-Type', extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response.setHeader('Content-Disposition', `attachment; filename="investigation-${id}.${extension}"`)
            response.end(await readFile(file))
            return
          }
          if (parts[0] === 'ai-report' && id && ['GET', 'POST'].includes(request.method)) {
            const folder = path.join(store, 'runs', id)
            const cached = path.join(folder, 'ai-report.json')
            if (request.method === 'GET') {
              if (!existsSync(cached)) { send(response, 404, { error: 'No AI report yet.' }); return }
              send(response, 200, await jsonFile(cached))
              return
            }
            const current = path.join(folder, '08-preparing-findings.json')
            const findings = existsSync(current) ? current : path.join(folder, '07-preparing-findings.json')
            if (!existsSync(findings)) { send(response, 409, { error: 'Findings are not ready, so the report cannot be written yet.' }); return }
            if (writingReports.has(id)) { send(response, 409, { error: 'The report is already being written.' }); return }
            writingReports.add(id)
            try {
              const written = await writeAiReport(await jsonFile(findings), providers)
              await atomicJson(cached, written)
              send(response, 200, written)
            } finally { writingReports.delete(id) }
            return
          }
          if (parts[0] === 'chat' && id && ['GET', 'POST'].includes(request.method)) {
            const folder = path.join(store, 'runs', id)
            const chatFile = path.join(folder, 'chat.json')
            const saved = existsSync(chatFile) ? await jsonFile(chatFile) : { entries: [] }
            if (request.method === 'GET') { send(response, 200, saved); return }
            const current = path.join(folder, '08-preparing-findings.json')
            const findings = existsSync(current) ? current : path.join(folder, '07-preparing-findings.json')
            if (!existsSync(findings)) { send(response, 409, { error: 'Findings are not ready, so there is nothing to discuss yet.' }); return }
            const districts = (await jsonFile(path.join(root, 'src', 'data', 'dashboard-eicv7-aggregates.json'))).districts
            const body = await readBody(request)
            const sourcesFile = path.join(folder, 'sources.json')
            const addedSources = existsSync(sourcesFile) ? (await jsonFile(sourcesFile)).sources : []
            const platformFile = path.join(store, 'cache', 'data-platform-catalog.json')
            const lastQuestion = String(body.messages?.[body.messages.length - 1]?.content || '')
            // The catalogue is searched on every question; if the platform is unreachable the answer simply goes without it.
            const platformHits = await loadPlatformCatalog(platformFile).then((catalog) => searchPlatform(catalog, lastQuestion)).catch(() => [])
            const siteHits = await searchSites(path.join(store), lastQuestion, 4).catch(() => [])
            const reply = await answerInvestigationQuestion(await jsonFile(findings), body, providers, districts, addedSources, platformHits.slice(0, 3), siteHits)
            // Every answered question is kept with the run, so the notebook can organise it later.
            const question = String(body.messages?.[body.messages.length - 1]?.content || '').trim().slice(0, 1500)
            saved.entries.push({ id: randomUUID(), at: new Date().toISOString(), question, answer: reply.answer, actions: reply.actions.map((item) => item.label), cited: reply.cited_sources, platform: reply.platform_datasets, sites: reply.site_pages, provider: reply.provider })
            await atomicJson(chatFile, { entries: saved.entries.slice(-200) })
            send(response, 200, reply)
            return
          }
          if (parts[0] === 'sites' && ['GET', 'POST', 'DELETE'].includes(request.method)) {
            const view = async () => ({ sites: (await listSites(store)).map(publicSite) })
            if (request.method === 'GET') { send(response, 200, await view()); return }
            if (request.method === 'DELETE') {
              if (!id) { send(response, 400, { error: 'Choose a website to remove.' }); return }
              await removeSite(store, id)
              send(response, 200, await view())
              return
            }
            if (id && parts[2] === 'refresh') {
              const site = (await listSites(store)).find((item) => item.id === id)
              if (!site) { send(response, 404, { error: 'Website not found.' }); return }
              await startCrawl(store, site.start, { python, makeRenderer }, id)
              send(response, 202, await view())
              return
            }
            const { url: address } = await readBody(request)
            let host = ''
            try { host = new URL(String(address)).hostname.replace(/^www\./, '') } catch { /* validated below */ }
            if (host === 'data.gov.rw') { send(response, 409, { error: 'The Rwanda Data Sharing Platform is already connected to the AI and is searched on every question.' }); return }
            await startCrawl(store, String(address), { python, makeRenderer })
            send(response, 202, await view())
            return
          }
          if (request.method === 'GET' && parts[0] === 'connected') {
            try {
              const catalog = await loadPlatformCatalog(path.join(store, 'cache', 'data-platform-catalog.json'))
              send(response, 200, { connections: [{ name: PLATFORM.name, url: PLATFORM.url, status: catalog.stale ? 'Offline: using saved copy' : 'Connected', datasets: catalog.total, fetched_at: catalog.fetched_at }], sites: (await listSites(store)).map(publicSite) })
            } catch (error) {
              send(response, 200, { connections: [{ name: PLATFORM.name, url: PLATFORM.url, status: 'Unavailable', datasets: 0, error: error instanceof Error ? error.message : 'Could not connect.' }], sites: (await listSites(store)).map(publicSite) })
            }
            return
          }
          if (parts[0] === 'upload' && id && request.method === 'POST') {
            const folder = path.join(store, 'runs', id)
            if (!existsSync(path.join(folder, 'manifest.json'))) { send(response, 404, { error: 'Investigation not found.' }); return }
            const name = String(url.searchParams.get('name') || 'file').replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 120)
            const type = UPLOAD_TYPES[path.extname(name).slice(1).toLowerCase()]
            if (!type) { send(response, 400, { error: 'This kind of file cannot be read. Add images (PNG, JPG, WebP, GIF), PDF, Word, Excel, CSV, JSON or text files.' }); return }
            const bytes = await readRaw(request, MAX_UPLOAD)
            if (bytes.length < 20) { send(response, 400, { error: 'The file is empty.' }); return }
            if (type.image && bytes.length > MAX_IMAGE) { send(response, 400, { error: 'Images can be up to 4 MB. Make it smaller and try again.' }); return }
            const file = path.join(folder, 'sources.json')
            const saved = existsSync(file) ? await jsonFile(file) : { sources: [] }
            if (saved.sources.length >= 20) { send(response, 400, { error: 'This investigation already has 20 sources. Remove one first.' }); return }
            const sourceId = randomUUID()
            const item = { id: sourceId, url: `/__local/investigations/file/${id}/${sourceId}`, title: name, text: '', added_at: new Date().toISOString(), status: 'Ready', summary: '', kind: 'upload', fileKind: type.kind, mime: type.mime, size: bytes.length, rows: null, columns: null, pages: null, truncated: false, files: [] }
            if (type.image) {
              try { item.text = await describeImage(providers, { mime: type.mime, base64: bytes.toString('base64'), name }); item.summary = item.text } catch (error) { item.analysis_error = error instanceof Error ? error.message : 'The image could not be read.' }
            } else {
              try {
                const read = await readFileWithPython(python, type.kind, bytes)
                Object.assign(item, { text: read.text.slice(0, 400000), rows: read.rows ?? null, columns: read.columns ?? null, pages: read.pages ?? null, truncated: Boolean(read.truncated) })
                try { item.summary = await summarizeSource(providers, { title: name, url: name, text: item.text }) } catch (error) { item.summary_error = error instanceof Error ? error.message : 'The summary could not be written.' }
              } catch (error) { item.analysis_error = error instanceof Error ? error.message : 'The file could not be read.' }
            }
            await mkdir(path.join(folder, 'uploads'), { recursive: true })
            item.stored = `${sourceId}.${path.extname(name).slice(1).toLowerCase()}`
            await writeFile(path.join(folder, 'uploads', item.stored), bytes)
            saved.sources.push(item)
            await atomicJson(file, saved)
            send(response, 200, { sources: saved.sources.map(({ text, stored, ...rest }, index) => ({ ...rest, tag: `S${index + 1}`, characters: text?.length || 0 })), added: sourceId })
            return
          }
          if (parts[0] === 'file' && id && parts[2] && validId.test(parts[2]) && request.method === 'GET') {
            const file = path.join(store, 'runs', id, 'sources.json')
            const found = existsSync(file) ? (await jsonFile(file)).sources.find((item) => item.id === parts[2] && item.stored) : null
            const target = found && path.join(store, 'runs', id, 'uploads', path.basename(found.stored))
            if (!found || !existsSync(target)) { send(response, 404, { error: 'File not found.' }); return }
            response.statusCode = 200
            response.setHeader('Content-Type', found.mime || 'application/octet-stream')
            response.setHeader('X-Content-Type-Options', 'nosniff')
            response.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox")
            response.setHeader('Content-Disposition', `${found.fileKind === 'image' ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(found.title)}`)
            response.end(await readFile(target))
            return
          }
          if (parts[0] === 'sources' && id && ['GET', 'POST', 'DELETE'].includes(request.method)) {
            const folder = path.join(store, 'runs', id)
            if (!existsSync(path.join(folder, 'manifest.json'))) { send(response, 404, { error: 'Investigation not found.' }); return }
            const file = path.join(folder, 'sources.json')
            const saved = existsSync(file) ? await jsonFile(file) : { sources: [] }
            const view = () => ({ sources: saved.sources.map(({ text, stored, ...item }, index) => ({ ...item, tag: `S${index + 1}`, characters: text?.length || 0 })) })
            if (request.method === 'GET') { send(response, 200, view()); return }
            if (request.method === 'DELETE') {
              const sourceId = parts[2]
              if (!sourceId || !validId.test(sourceId)) { send(response, 400, { error: 'Invalid source ID.' }); return }
              const gone = saved.sources.find((item) => item.id === sourceId)
              if (gone?.stored) await unlink(path.join(folder, 'uploads', path.basename(gone.stored))).catch(() => {})
              saved.sources = saved.sources.filter((item) => item.id !== sourceId)
              await atomicJson(file, saved)
              send(response, 200, view())
              return
            }
            const { url: address } = await readBody(request)
            if (saved.sources.length >= 20) { send(response, 400, { error: 'This investigation already has 20 sources. Remove one first.' }); return }
            const renderer = makeRenderer()
            let page
            try { page = await fetchWebSource(address, fetch, undefined, { python, renderer }) } finally { await renderer.close() }
            if (saved.sources.some((item) => item.url === page.url)) { send(response, 409, { error: 'That page is already added.' }); return }
            const item = { id: randomUUID(), url: page.url, title: page.title, text: page.text, added_at: new Date().toISOString(), status: 'Ready', summary: '', kind: page.kind, rows: page.rows ?? null, columns: page.columns ?? null, pages: page.pages ?? null, truncated: Boolean(page.truncated), files: page.files || [], chunkSize: page.chunkSize }
            try { item.summary = await summarizeSource(providers, page) } catch (error) { item.summary_error = error instanceof Error ? error.message : 'The summary could not be written.' }
            saved.sources.push(item)
            await atomicJson(file, saved)
            send(response, 200, view())
            return
          }
          if (parts[0] === 'notebook' && id && ['GET', 'POST'].includes(request.method)) {
            const folder = path.join(store, 'runs', id)
            const chatFile = path.join(folder, 'chat.json')
            const reviewFile = path.join(folder, 'review.json')
            const notebookFile = path.join(folder, 'notebook.json')
            const entries = existsSync(chatFile) ? (await jsonFile(chatFile)).entries : []
            const decisions = existsSync(reviewFile) ? (await jsonFile(reviewFile)).decisions : []
            if (request.method === 'GET') {
              send(response, 200, { organized: existsSync(notebookFile) ? await jsonFile(notebookFile) : null, entries, decisions })
              return
            }
            if (parts[2] !== 'organize') { send(response, 404, { error: 'Investigation endpoint not found.' }); return }
            const current = path.join(folder, '08-preparing-findings.json')
            const findings = existsSync(current) ? current : path.join(folder, '07-preparing-findings.json')
            if (!existsSync(findings)) { send(response, 409, { error: 'Findings are not ready, so there is nothing to organise yet.' }); return }
            if (writingReports.has(`nb-${id}`)) { send(response, 409, { error: 'The notebook is already being organised.' }); return }
            writingReports.add(`nb-${id}`)
            try {
              const before = existsSync(notebookFile) ? (await jsonFile(notebookFile)).notebook : null
              const sourcesFile = path.join(folder, 'sources.json')
              const addedSources = existsSync(sourcesFile) ? (await jsonFile(sourcesFile)).sources.filter((item) => item.status === 'Ready') : []
              const body = await readBody(request).catch(() => ({}))
              const organized = await organizeNotebook(await jsonFile(findings), entries, decisions, providers, before, addedSources, sanitizeFindings(body.programme_findings))
              await atomicJson(notebookFile, organized)
              send(response, 200, { organized, entries, decisions })
            } finally { writingReports.delete(`nb-${id}`) }
            return
          }
          if (request.method === 'POST' && parts[0] === 'review' && id) {
            if (changing.has(id)) { send(response, 409, { error: 'This investigation is being changed. Try again.' }); return }
            changing.add(id)
            try {
            const value = await readBody(request)
            const allowed = ['accept_finding', 'request_deeper', 'reject_interpretation', 'flag_source_conflict', 'request_data', 'request_research']
            if (!allowed.includes(value.decision) || typeof value.note !== 'string' || !value.note.trim() || value.note.length > 2000) {
              send(response, 400, { error: 'Choose a review note and enter an explanation.' })
              return
            }
            const folder = path.join(store, 'runs', id)
            if (!existsSync(path.join(folder, 'manifest.json'))) {
              send(response, 404, { error: 'Investigation not found.' })
              return
            }
            const file = path.join(folder, 'review.json')
            const previous = existsSync(file) ? await jsonFile(file) : { decisions: [] }
            previous.decisions.push({ id: randomUUID(), decision: value.decision, note: value.note.trim(), at: new Date().toISOString(), status: 'Unverified local review note; no operational authority' })
            await mkdir(folder, { recursive: true })
            await writeFile(file, JSON.stringify(previous, null, 2), 'utf8')
            send(response, 200, previous)
            return
            } finally { changing.delete(id) }
          }
          if (request.method === 'GET' && parts[0] === 'review' && id) {
            const file = path.join(store, 'runs', id, 'review.json')
            send(response, 200, existsSync(file) ? await jsonFile(file) : { decisions: [] })
            return
          }
          if (request.method === 'POST' && ['approve', 'act', 'follow-up'].includes(parts[0])) {
            send(response, 403, { error: 'Operational approvals and follow-up writes require trusted server-side roles and an authorized Action Center integration. No work item was created.' })
            return
          }
          send(response, 404, { error: 'Investigation endpoint not found.' })
        } catch (error) {
          send(response, 500, { error: error instanceof Error ? error.message : 'Investigation request failed.' })
        }
      })
    }
  }
}
