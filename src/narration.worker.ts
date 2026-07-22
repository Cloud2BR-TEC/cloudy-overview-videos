import { predict } from '@mintplex-labs/piper-tts-web'

const VOICE_ID = 'en_US-hfc_female-medium'

type NarrationRequest = {
  scenes: Array<{ narration: string }>
}

self.addEventListener('message', async (event: MessageEvent<NarrationRequest>) => {
  const { scenes } = event.data
  try {
    for (let index = 0; index < scenes.length; index += 1) {
      self.postMessage({ type: 'scene', index, total: scenes.length })
      const audio = await predict(
        { text: scenes[index].narration, voiceId: VOICE_ID },
        ({ loaded, total }) => {
          if (total > 0) self.postMessage({ type: 'model', progress: loaded / total })
        },
      )
      self.postMessage({ type: 'audio', index, audio })
    }
    self.postMessage({ type: 'complete' })
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Local narration generation failed.' })
  }
})