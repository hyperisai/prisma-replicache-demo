// Packages
import { Prisma } from '@prisma/client'
// Utilities
import prisma from 'utils/prisma'
import utilApiLastMutationIdGet from 'utils/api/lastMutationIdGet'
import utilApiLastMutationIdSave from 'utils/api/lastMutationIdSave'
import utilApiVersionGetNext from 'utils/api/versionGetNext'
import utilApiVersionSave from 'utils/api/versionSave'
import utilApiMutations from 'utils/api/mutations'
import utilApiPokeSend from 'utils/api/pokeSend'
import utilAuth from 'utils/auth'

const PagesApiReplicachePush = async (req, res) => {
	console.log('\nPush: ***', req.body, '***\n')

	const { data: user, error: userErr } = await utilAuth(req, res)
	if (!user || userErr) return res.status(401)

	// Provided by Replicache
	const { clientID, mutations } = req.body

	// Provided by client
	const { spaceId } = req.query

	if (!clientID || !spaceId || !mutations) return res.status(403)

	const { data: versionLatest } = await prisma.$transaction(
		async tx => {
			// #1. Get next `version` for space
			const { data: versionNext } = await utilApiVersionGetNext({
				tx,
				spaceId,
				userId: user.id
			})

			// #2. Get last mutation Id for client
			let { data: lastMutationId } = await utilApiLastMutationIdGet({ clientID, tx })

			// #3. Iterate mutations, increase mutation Id on each iteration
			const { data: nextMutationId } = await utilApiMutations({
				lastMutationId,
				mutations,
				spaceId,
				tx,
				versionNext
			})

			// #4. Save mutation Id to Client
			await utilApiLastMutationIdSave({ clientID, nextMutationId, tx })

			// #5. Save new version to Space
			const { data: versionUpdated } = await utilApiVersionSave({
				tx,
				spaceId,
				version: versionNext
			})

			return { data: versionUpdated?.version }
		},
		{
			isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Required for Replicache to work
			maxWait: 5000, // default: 2000
			timeout: 10000 // default: 5000
		}
	)

	// #6. Poke client(s) to send a pull.
	await utilApiPokeSend()

	console.log('push →', Prisma.TransactionIsolationLevel.Serializable)

	return res.json({ done: versionLatest })
}

export default PagesApiReplicachePush
