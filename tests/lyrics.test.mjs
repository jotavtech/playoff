import assert from 'node:assert/strict'
import test from 'node:test'
import { activeLyric, parseLrc } from '../utils/lyrics.ts'
import { lookupLyrics } from '../server/utils/lyrics.ts'

const song = { title: 'Test Song', artist: 'Test Artist', album: 'Test Album', duration: 180 }

test('parses repeat timestamps, instrumental gaps and offset; supports seeking backwards', () => {
  const lines = parseLrc('[offset:-100]\n[00:05.20][00:21.2] Chorus\n[00:12.00]\n[00:01] Opening')
  assert.deepEqual(lines, [
    { at: 900, text: 'Opening' }, { at: 5100, text: 'Chorus' },
    { at: 11900, text: '' }, { at: 21100, text: 'Chorus' }
  ])
  assert.equal(activeLyric(lines, 899), -1)
  assert.equal(activeLyric(lines, 21100), 3)
  assert.equal(activeLyric(lines, 11900), 2)
  assert.equal(activeLyric(lines, 905), 0)
  assert.deepEqual(parseLrc('[00:01]'), [])
})

test('fallback ignores wrong artists and recording lengths; returns plain text without invented timestamps', async () => {
  const request = async url => {
    if (url.includes('get-cached')) return new Response(null, { status: 404 })
    assert.equal(new URL(url).searchParams.get('track_name'), song.title)
    const row = { trackName: song.title, artistName: song.artist, duration: 181, plainLyrics: 'Correct version' }
    return Response.json([
      { ...row, artistName: 'Other Artist', syncedLyrics: '[00:01]Cover' },
      { ...row, duration: 240, syncedLyrics: '[00:01]Live take' },
      row
    ])
  }
  assert.deepEqual(await lookupLyrics(song, request), { kind: 'plain', text: 'Correct version' })
})

test('distinguishes instrumental, missing and provider failure', async () => {
  assert.deepEqual(await lookupLyrics(song, async () => Response.json({ instrumental: true })), { kind: 'instrumental' })
  assert.deepEqual(await lookupLyrics(song, async url => url.includes('get-cached')
    ? new Response(null, { status: 404 }) : Response.json([])), { kind: 'missing' })
  await assert.rejects(lookupLyrics(song, async () => new Response(null, { status: 503 })), /503/)
})
