// Replicache
import todoCreate from 'resolvers/todo/create'
import todoDelete from 'resolvers/todo/delete'
import todoGet from 'resolvers/todo/get'
import todoUpdate from 'resolvers/todo/update'
// Utilities
import prisma from 'utils/prisma'
import utilApiPushVersionGetNext from 'utils/api/push/versionGetNext'
import utilApiPushVersionSave from 'utils/api/push/versionSave'
import utilApiPushLastMutationIdGet from 'utils/api/push/lastMutationIdGet'
import utilApiPushLastMutationIdSave from 'utils/api/push/lastMutationIdSave'
import utilApiPushMutations from 'utils/api/push/mutations'
import utilAuth from 'utils/auth'
import utilGenerateId from 'utils/generateId'

const PagesApiReplicachePush = async (req, res) => {
	console.log('\nPush: ***')
	console.log(req.body)
	console.log('Push: ***\n')

	const { data: authUser, error: authUserErr } = await utilAuth(req, res)
	if (authUserErr) res.json({ error: authUserErr })

	const { userId } = authUser

	const { clientID, mutations, spaceID } = req.body

	try {
		await prisma.$transaction(async tx => {
			// #1. Get next `version` for Replicache Space
			const { data: versionNext } = await utilApiPushVersionGetNext({ spaceID, tx })

			// #2. Get last mutation Id for client
			const { data: lastMutationId } = await utilApiPushLastMutationIdGet({ clientID, tx })

			// #3. Iterate mutations, increase mutation Id on each iteration
			for (const mutation of mutations) {
				const nextMutationId = lastMutationId + 1

				if (mutation.id < nextMutationId) {
					console.log(`Mutation ${mutation.id} has already been processed - skipping`)
					continue
				}

				if (mutation.id > nextMutationId) {
					console.warn(`Mutation ${mutation.id} is from the future - aborting`)
					break
				}

				console.log('Processing mutation:', JSON.stringify(mutation))

				console.log('Version:', nextMutationId)

				// Mutations
				await utilApiPushMutations({ mutation, nextMutationId, tx, userId })

				lastMutationId = nextMutationId
			}

			// #4. Save mutation Id to Client
			await utilApiPushLastMutationIdSave({ clientID, tx })

			// #5. Save new version to Space
			await utilApiPushVersionSave({ spaceID, tx, version: versionNext })
		})

		// #6. We need to use `await` here, otherwise Next.js will frequently kill the request and the poke won't get sent.
		console.log('Poke')

		res.json({ done: true })
	} catch (err) {
		console.error(err)

		res.status(500).send(err.toString())
	}
}

export default PagesApiReplicachePush
