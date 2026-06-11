import { createRoom, getRoomInfo } from '~/server/utils/rooms'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = (body?.name as string || '').trim().toUpperCase() || 'UNNAMED ROOM'

  const id = createRoom(name)
  return getRoomInfo(id)
})
