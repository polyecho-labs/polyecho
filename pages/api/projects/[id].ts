import type { NextApiRequest, NextApiResponse } from 'next'
import { IProject, Project } from '../../../models/project.model'
import { ISample } from '../../../models/sample.model'
import dbConnect from '../../../utils/db'

async function handler(req: NextApiRequest, res: NextApiResponse) {
	const {
		query: { id },
		body,
		method,
	} = req

	await dbConnect()

	switch (method) {
		case 'GET' /* Get a model by its ID */:
			try {
				const project: IProject | null = await Project.findById(id)
				if (!project) {
					return res.status(400).json({ success: false })
				}
				res.status(200).json({ success: true, data: project })
			} catch (error) {
				res.status(400).json({ success: false })
			}
			break

		case 'PUT' /* Edit a model by its ID */:
			try {
				// Update samples
				let project
				if (body.samples) {
					// Strip out Mongo metadata prior to update (should just add a new sample?)
					const samples = body.samples.map((s: ISample) => ({
						cid: s.cid,
						audioUrl: s.audioUrl,
						filename: s.filename,
						filetype: s.filetype,
						filesize: s.filesize,
						createdBy: s.createdBy,
					}))
					project = await Project.findByIdAndUpdate(
						id,
						{
							$set: {
								samples,
								collaborators: body.collaborators,
							},
						},
						{
							new: true,
							runValidators: true,
						},
					)
					// Returns
					if (!project) {
						return res.status(400).json({ success: false, error: 'failed to add project' })
					}
					res.status(200).json({ success: true, data: project })
				} else {
					// Update anything else,
					project = await Project.findByIdAndUpdate(id, body, {
						new: true,
						runValidators: true,
					})
					// Returns
					if (!project) {
						return res.status(400).json({ success: false, error: 'failed to add project' })
					}
					res.status(200).json({ success: true, data: project })
				}
			} catch (e) {
				res.status(400).json({ success: false, error: e })
			}
			break

		case 'DELETE' /* Delete a model by its ID */:
			try {
				const deletedProject = await Project.deleteOne({ _id: id })
				if (!deletedProject) {
					return res.status(400).json({ success: false, error: 'failed to delete project' })
				}
				res.status(200).json({ success: true, data: {} })
			} catch (e) {
				res.status(400).json({ success: false, error: e })
			}
			break

		default:
			res.status(400).json({ success: false, error: `HTTP method '${method}' is not supported` })
			break
	}
}

export default handler