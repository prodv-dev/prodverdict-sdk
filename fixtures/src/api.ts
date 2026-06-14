export async function updateUser(req: { body: Record<string, unknown> }) {
  await db.user.update({ data: { ...req.body } });
}
