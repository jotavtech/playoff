import { buildRecap } from '~/server/utils/rooms'

/** GET /api/room/:id/recap — resumo da sessão (PRD §5.7.6). */
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')?.toUpperCase() ?? ''
  const recap = buildRecap(id)
  if (!recap) throw createError({ statusCode: 404, message: 'ROOM NOT FOUND' })
  return recap
})
