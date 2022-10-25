// Utilities
import prisma from 'utils/prisma'
import utilAuth from 'utils/auth'

const PagesApiReplicachePull = async (req, res) => {
	console.log('\nPull: ***', req.body, '***\n')

	const { data: authUser, error: authUserErr } = await utilAuth(req, res)
	if (authUserErr) res.json({ error: authUserErr })

	try {
		await prisma.$transaction(async tx => {
			let lastMutationId

			const prismaReplicacheClientFindUnique = await tx.replicacheClient.findUnique({
				where: {
					clientId: req.body.clientID
				},
				select: {
					lastMutationId: true
				}
			})

			lastMutationId = prismaReplicacheClientFindUnique?.lastMutationId || 0

			const prismaTodoFindMany = await tx.todo.findMany({
				where: {
					AND: [{ lastModifiedVersion: { gt: req.body.cookie || 0 } }, { userId: authUser?.userId }]
				},
				select: {
					// --- SYSTEM ---
					lastModifiedVersion: true,
					// --- PUBLIC ID ---
					todoId: true,
					// --- FIELDS ---
					name: true,
					sortOrder: true
				}
			})

			const replicacheVersion = prismaTodoFindMany?.length
				? Math.max(...prismaTodoFindMany?.map(x => x.lastModifiedVersion))
				: 0

			const patch = []

			if (req.body.cookie === null) patch.push({ op: 'clear' })

			patch.push(
				...prismaTodoFindMany.map(todo => ({
					op: 'put',
					key: `todo/${todo.todoId}`,
					value: {
						name: todo.name,
						sortOrder: todo.sortOrder
					}
				}))
			)

			console.log({ lastMutationId, cookie: replicacheVersion, patch })

			res.json({ lastMutationId, cookie: replicacheVersion, patch })

			res.end()
		})
	} catch (err) {
		console.error(err)

		res.status(500).send(err.toString())
	}
}

export default PagesApiReplicachePull
