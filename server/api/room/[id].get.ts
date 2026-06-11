import { getRoomInfo } from '~/server/utils/rooms'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')?.toUpperCase() ?? ''
  const info = getRoomInfo(id)
  if (!info) throw createError({ statusCode: 404, message: 'ROOM NOT FOUND' })
  return info
})
