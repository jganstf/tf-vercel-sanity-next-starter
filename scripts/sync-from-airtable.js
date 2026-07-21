#!/usr/bin/env node
/**
 * Pulls records from one or more Airtable tables and writes each table to its
 * own CSV file in scripts/data/. Re-running for the same table overwrites
 * that table's CSV in place (filename is derived from the table name), it
 * never creates a duplicate file.
 *
 * Required env vars (set in .env.local, never commit them):
 *   AIRTABLE_API_KEY  - Airtable personal access token
 *   AIRTABLE_BASE_ID  - Airtable base id (starts with "app")
 *
 * Usage:
 *   node scripts/sync-from-airtable.js "Table Name" "Another Table"
 *   AIRTABLE_TABLES="Table Name,Another Table" node scripts/sync-from-airtable.js
 */

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, 'data')
const AIRTABLE_API_URL = 'https://api.airtable.com/v0'

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return

  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eq = trimmed.indexOf('=')
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) process.env[key] = value
  }
}

function getTableNames() {
  const fromArgs = process.argv.slice(2).filter(Boolean)
  if (fromArgs.length > 0) return fromArgs

  const fromEnv = (process.env.AIRTABLE_TABLES || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)

  return fromEnv
}

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'table'
  )
}

async function fetchAllRecords(baseId, apiKey, tableName) {
  const records = []
  let offset

  do {
    const url = new URL(`${AIRTABLE_API_URL}/${baseId}/${encodeURIComponent(tableName)}`)
    if (offset) url.searchParams.set('offset', offset)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `Airtable request failed for table "${tableName}": ${response.status} ${response.statusText} - ${body}`,
      )
    }

    const data = await response.json()
    records.push(...data.records)
    offset = data.offset
  } while (offset)

  return records
}

function csvEscape(value) {
  if (value === null || value === undefined) return ''

  const stringValue =
    typeof value === 'object' ? JSON.stringify(value) : String(value)

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

function recordsToCsv(records) {
  const columns = ['id']
  const columnSet = new Set(columns)

  for (const record of records) {
    for (const field of Object.keys(record.fields)) {
      if (!columnSet.has(field)) {
        columnSet.add(field)
        columns.push(field)
      }
    }
  }

  const rows = records.map((record) =>
    columns.map((column) => csvEscape(column === 'id' ? record.id : record.fields[column])).join(','),
  )

  return [columns.map(csvEscape).join(','), ...rows].join('\n') + '\n'
}

async function syncTable(baseId, apiKey, tableName) {
  const records = await fetchAllRecords(baseId, apiKey, tableName)
  const csv = recordsToCsv(records)
  const filePath = path.join(DATA_DIR, `${slugify(tableName)}.csv`)

  fs.writeFileSync(filePath, csv)
  console.log(`Wrote ${records.length} record(s) from "${tableName}" to ${path.relative(process.cwd(), filePath)}`)
}

async function main() {
  loadEnvLocal()

  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  const tableNames = getTableNames()

  if (!apiKey || !baseId) {
    console.error('Missing AIRTABLE_API_KEY and/or AIRTABLE_BASE_ID. Set them in .env.local.')
    process.exit(1)
  }

  if (tableNames.length === 0) {
    console.error(
      'No tables specified. Pass table names as arguments or set AIRTABLE_TABLES="Table One,Table Two".',
    )
    process.exit(1)
  }

  fs.mkdirSync(DATA_DIR, { recursive: true })

  for (const tableName of tableNames) {
    await syncTable(baseId, apiKey, tableName)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
