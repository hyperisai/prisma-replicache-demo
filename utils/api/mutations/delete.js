const UtilsApiMutationsDelete = async ({ args, versionNext, spaceId, tx }) =>
	await tx.todo.updateMany({
		where: { AND: [{ todoId: args, spaceId }] },
		data: {
			isDeleted: true,
			lastModifiedVersion: versionNext
		}
	})

export default UtilsApiMutationsDelete
