import { Container } from '@mui/material'
import type { GetServerSideProps, NextPage } from 'next'
import Head from 'next/head'

import ProjectDetailsContainer from '../../components/ProjectDetails.container'
import { get } from '../../lib/http'
import type { IProjectDoc } from '../../models/project.model'

type ProjectDetailsPageProps = {
	data: IProjectDoc | null
	blob: string
}

const ProjectPage: NextPage<ProjectDetailsPageProps> = props => {
	const { data } = props

	return (
		<>
			<Head>
				<title>Arbor | Project Details</title>
			</Head>
			<Container maxWidth="xl" className="content-container">
				{data && <ProjectDetailsContainer data={data} />}
			</Container>
		</>
	)
}

export const getServerSideProps: GetServerSideProps = async context => {
	// Get  project details from ID
	const projectId = context.query.id

	if (projectId !== '[object Blob]') {
		const res = await get(`/projects/${projectId}`)
		const data: IProjectDoc | null = res.success ? res.data : null
		return {
			props: {
				data,
			},
		}
	}

	return { props: { data: null } }
}

export default ProjectPage
