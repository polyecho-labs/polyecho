import { createFFmpeg, FFmpeg } from '@ffmpeg/ffmpeg'
import { createContext, ReactNode, useContext } from 'react'

import { getClientBaseUrl } from './http'

// Context
type AudioUtilsContextProps = {
	ffmpeg: FFmpeg
	getAudio: (href: string) => any
	mergeAudio: (files: MergeAudioInput[], outputFileName: string) => any
}
// @ts-ignore
const AudioUtilsContext = createContext<AudioUtilsContextProps>({})

// Provider
type AudioUtilsProviderProps = {
	children: ReactNode
}
export type MergeAudioInput = {
	blob: Blob
	href?: string
	filename: string
}

export const AudioUtilsProvider = ({ children }: AudioUtilsProviderProps) => {
	const ffmpeg: FFmpeg = createFFmpeg({
		corePath: `${getClientBaseUrl()}/ffmpeg.min.js`,
		log: true,
		logger: ({ message }) => console.info('[ffmpeg log]:', message),
		progress: p => console.info('[ffmpeg progress]:', p),
	})

	const getAudio = async (href: string): Promise<Blob> => {
		if (!ffmpeg.isLoaded()) await ffmpeg.load()
		console.log('getting audio file', href)

		const audio = ffmpeg.FS('readFile', href)
		console.log({ audio })
		return new Blob([audio.buffer], { type: 'audio/wav' })
	}

	/**
	 * Merges in several audio files sources into a singular designation source
	 * Transcodes the audio to .wav
	 * https://stackoverflow.com/questions/14498539/how-to-overlay-downmix-two-audio-files-using-ffmpeg
	 * @param files - The audio blobs to convert into one
	 * @param outputFileName - The name of the destination file
	 * @returns {Blob} - THe single audio file as a blob
	 */
	const mergeAudio = async (files: MergeAudioInput[], outputFileName: string): Promise<Blob> => {
		try {
			if (!ffmpeg.isLoaded()) await ffmpeg.load()
			console.log('loaded, merging', ffmpeg.isLoaded())

			// Compile together command
			// Example "ffmpeg -iinput0.mp3 -i input1.mp3 -filter_complex amix=inputs=2:duration=longest output.mp3"
			const commands: string[] = []
			// Add in input fils
			for (let i = 0; i < files.length; i++) {
				const name = await files[i].filename
				commands.push(`-i ${name}.wav`) // hardcode filetype
			}
			const mixIdx = new Array(files.length)
				.fill('')
				.map((v, i) => `[${i}:0]`)
				.join('')
			// mixIdx and double quotes could also be tried omitted
			commands.push(`-filter_complex "${mixIdx} amix=inputs=${files.length}:duration=longest"`)

			commands.push('-c:a')
			commands.push('libmp3lame')
			commands.push(outputFileName)
			console.log(commands.join(' '), commands)
			// Run the command using the SDK to merge the files
			const commandResp = await ffmpeg.run(commands.join(' '))
			// Or use fetchFile?
			const newFileData = ffmpeg.FS('readFile', outputFileName)
			const newFileBlob = new Blob([newFileData.buffer], { type: 'audio/wav' })
			console.log({ commandResp, newFileData, newFileBlob })

			// Concating approach
			// for (const file of files) {
			// 	// const { name } = file
			// 	ffmpeg.FS('writeFile', 'file 1', await fetchFile(file.blob))
			// 	inputPaths.push(`file 1`)
			// }
			// ffmpeg.FS('writeFile', 'concat_list.txt', inputPaths.join('\n'))
			// await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'concat_list.txt', outputFileName)
			// const data = ffmpeg.FS('readFile', outputFileName)

			// Examples adjusting volume
			// [0:0]volume=0.2[a];[1:0]volume=0.5[b];[a][b]amix=inputs=2:duration=longest" -c:a libmp3lame output1.mp3

			return newFileBlob
		} catch (e: any) {
			console.error('Failed to mergeAudio():', e)
			return new Blob([], { type: 'text/plain' })
		}
	}

	return <AudioUtilsContext.Provider value={{ ffmpeg, getAudio, mergeAudio }}>{children}</AudioUtilsContext.Provider>
}

// Context hook
export const useAudioUtils = () => {
	const context: Partial<AudioUtilsContextProps> = useContext(AudioUtilsContext)

	if (context === undefined) {
		throw new Error('useAudioUtils must be used within an AudioUtilsProvider component.')
	}
	return context as AudioUtilsContextProps
}

export default AudioUtilsContext
