// Utilities
import utilApiPushMutationsCreate from 'utils/api/push/mutations/create'

const UtilsApiPushMutations = async ({ mutation, nextMutationId, tx, userId }) => {
	switch (mutation.name) {
		case 'create':
			await utilApiPushMutationsCreate({ args: mutation.args, nextMutationId, tx, userId })
			break

		// ...other mutations, tbd

		default:
			throw new Error(`Unknown mutation: ${mutation.name}`)
	}
}

export default UtilsApiPushMutations
