import { AnimeNotifier } from "../AnimeNotifier"

var audioContext: AudioContext
var audioNode: AudioBufferSourceNode
var gainNode: GainNode
var volume = 0.5
var volumeTimeConstant = 0.01
var volumeSmoothingDelay = 0.05
var targetSpeed = 1.0
var playId = 0
var audioPlayer = document.getElementById("audio-player")
var audioPlayerPlay = document.getElementById("audio-player-play") as HTMLButtonElement
var audioPlayerPause = document.getElementById("audio-player-pause") as HTMLButtonElement
var trackLink = document.getElementById("audio-player-track-title") as HTMLLinkElement
var animeInfo = document.getElementById("audio-player-anime-info") as HTMLElement
var animeLink = document.getElementById("audio-player-anime-link") as HTMLLinkElement
var animeImage = document.getElementById("audio-player-anime-image") as HTMLImageElement
var lastRequest: XMLHttpRequest

// Play audio
export function playAudio(arn: AnimeNotifier, element: HTMLElement) {
	playAudioFile(arn, element.dataset.soundtrackId, element.dataset.audioSrc)
}

// Play audio file
function playAudioFile(arn: AnimeNotifier, trackId: string, trackUrl: string) {
	if(!audioContext) {
		audioContext = new AudioContext()
		gainNode = audioContext.createGain()
		gainNode.gain.setTargetAtTime(volume, audioContext.currentTime + volumeSmoothingDelay, volumeTimeConstant)
	}

	playId++
	let currentPlayId = playId

	if(lastRequest) {
		lastRequest.abort()
		lastRequest = null
	}

	// Stop current track
	stopAudio(arn)

	arn.currentSoundTrackId = trackId
	arn.markPlayingSoundTrack()
	arn.loading(true)

	// Mark as loading
	audioPlayer.classList.add("loading-network")
	audioPlayer.classList.remove("decoding-audio")
	audioPlayer.classList.remove("decoded")

	// Request
	let request = new XMLHttpRequest()
	request.open("GET", trackUrl, true)
	request.responseType = "arraybuffer"

	request.onload = () => {
		if(currentPlayId !== playId) {
			return
		}

		// Mark as loading finished, now decoding starts
		audioPlayer.classList.add("decoding-audio")
		arn.loading(false)

		audioContext.decodeAudioData(request.response, async buffer => {
			if(currentPlayId !== playId) {
				return
			}

			// Mark as ready
			audioPlayer.classList.add("decoded")

			audioNode = audioContext.createBufferSource()
			audioNode.buffer = buffer
			audioNode.connect(gainNode)
			gainNode.connect(audioContext.destination)
			audioNode.playbackRate.setValueAtTime(targetSpeed, 0)
			audioNode.start(0)

			audioNode.onended = (event: MediaStreamErrorEvent) => {
				if(currentPlayId !== playId) {
					return
				}

				playNextTrack(arn)
				// stopAudio(arn)
			}
		}, console.error)
	}

	request.onerror = () => {
		arn.loading(false)
	}

	lastRequest = request
	request.send()

	// Update track info
	updateTrackInfo(trackId)

	// Show audio player
	audioPlayer.classList.remove("fade-out")
	audioPlayerPlay.classList.add("fade-out")
	audioPlayerPause.classList.remove("fade-out")
}

// Update track info
async function updateTrackInfo(trackId: string) {
	// Set track title
	let trackInfoResponse = await fetch("/api/soundtrack/" + trackId)
	let track = await trackInfoResponse.json()
	trackLink.href = "/soundtrack/" + track.id
	trackLink.innerText = track.title

	let animeId = ""

	for(let tag of (track.tags as string[])) {
		if(tag.startsWith("anime:")) {
			animeId = tag.split(":")[1]
			break
		}
	}

	// Set anime info
	if(animeId !== "") {
		animeInfo.classList.remove("hidden")
		let animeResponse = await fetch("/api/anime/" + animeId)
		let anime = await animeResponse.json()
		animeLink.title = anime.title.canonical
		animeLink.href = "/anime/" + anime.id
		animeImage.dataset.src = "//media.notify.moe/images/anime/medium/" + anime.id + anime.imageExtension
		animeImage.classList.remove("hidden")
		animeImage["became visible"]()
	}
}

// Stop audio
export function stopAudio(arn: AnimeNotifier) {
	arn.currentSoundTrackId = undefined

	// Remove CSS class "playing"
	let playingElements = document.getElementsByClassName("playing")

	for(let playing of playingElements) {
		playing.classList.remove("playing")
	}

	// Fade out sidebar player
	// audioPlayer.classList.add("fade-out")

	// Remove title
	trackLink.href = ""
	trackLink.innerText = ""

	// Hide anime info
	animeLink.href = ""
	animeInfo.classList.add("hidden")
	animeImage.classList.add("hidden")

	// Show play button
	audioPlayerPlay.classList.remove("fade-out")
	audioPlayerPause.classList.add("fade-out")

	if(gainNode) {
		gainNode.disconnect()
	}

	if(audioNode) {
		audioNode.stop()
		audioNode.disconnect()
		audioNode = null
	}
}

// Toggle audio
export function toggleAudio(arn: AnimeNotifier, element: HTMLElement) {
	// If we're clicking on the same track again, stop playing.
	// Otherwise, start the track we clicked on.
	if(arn.currentSoundTrackId && element.dataset.soundtrackId === arn.currentSoundTrackId) {
		stopAudio(arn)
	} else {
		playAudio(arn, element)
	}
}

// Play or pause audio
export function playPauseAudio(arn: AnimeNotifier) {
	if(!audioNode) {
		playNextTrack(arn)
		return
	}

	if(audioNode.playbackRate.value === 0) {
		resumeAudio(arn, audioPlayerPlay)
	} else {
		pauseAudio(arn, audioPlayerPlay)
	}
}

// Play previous track
export async function playPreviousTrack(arn: AnimeNotifier) {
	alert("Previous track is currently work in progress! Check back later :)")
}

// Play next track
export async function playNextTrack(arn: AnimeNotifier) {
	// Get random track
	let response = await fetch("/api/next/soundtrack")
	let track = await response.json()

	playAudioFile(arn, track.id, "https://notify.moe/audio/" + track.file)
	// arn.statusMessage.showInfo("Now playing: " + track.title)

	return track
}

// Set volume
export function setVolume(arn: AnimeNotifier, element: HTMLInputElement) {
	volume = parseFloat(element.value) / 100.0

	if(gainNode) {
		gainNode.gain.setTargetAtTime(volume, audioContext.currentTime + volumeSmoothingDelay, volumeTimeConstant)
	}
}

// Pause audio
export function pauseAudio(arn: AnimeNotifier, button: HTMLButtonElement) {
	if(!audioNode) {
		return
	}

	audioNode.playbackRate.setValueAtTime(0.0, 0)

	audioPlayerPlay.classList.remove("fade-out")
	audioPlayerPause.classList.add("fade-out")
}

// Resume audio
export function resumeAudio(arn: AnimeNotifier, button: HTMLButtonElement) {
	if(!audioNode) {
		playNextTrack(arn)
		return
	}

	audioNode.playbackRate.setValueAtTime(targetSpeed, 0)

	audioPlayerPlay.classList.add("fade-out")
	audioPlayerPause.classList.remove("fade-out")
}

// Add speed
export function addSpeed(arn: AnimeNotifier, speed: number) {
	if(!audioNode || audioNode.playbackRate.value === 0) {
		return
	}

	targetSpeed += speed

	if(targetSpeed < 0.5) {
		targetSpeed = 0.5
	} else if(targetSpeed > 2) {
		targetSpeed = 2
	}

	audioNode.playbackRate.setValueAtTime(targetSpeed, 0)
	arn.statusMessage.showInfo("Playback speed: " + Math.round(targetSpeed * 100) + "%")
}