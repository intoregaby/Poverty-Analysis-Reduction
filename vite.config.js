import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { answerChartQuestion } from './base44/functions/chart-insight/groq.mjs'
import { investigationApi } from './tools/investigation/vite-api.mjs'

function localChartInsight(apiKey) {
  return {
    name: 'local-chart-insight',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__local/chart-insight', async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(request.headers.host || '')
        const origin = request.headers.origin
        if (!localHost || (origin && origin !== `http://${request.headers.host}`)) {
          response.statusCode = 403
          response.end(JSON.stringify({ error: 'Local chart AI is available only on this laptop.' }))
          return
        }
        if (request.method !== 'POST') {
          response.statusCode = 405
          response.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }
        try {
          const chunks = []
          let size = 0
          for await (const chunk of request) {
            size += chunk.length
            if (size > 15000) throw new Error('Chart request is too large.')
            chunks.push(chunk)
          }
          const input = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          response.end(JSON.stringify(await answerChartQuestion(input, apiKey)))
        } catch (error) {
          response.statusCode = 400
          response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Could not answer the question.' }))
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    investigationApi(process.cwd(), loadEnv(mode, process.cwd(), 'GROQ_').GROQ_API_KEY || process.env.GROQ_API_KEY, loadEnv(mode, process.cwd(), 'NVIDIA_').NVIDIA_API_KEY || process.env.NVIDIA_API_KEY),
    localChartInsight(loadEnv(mode, process.cwd(), 'GROQ_').GROQ_API_KEY || process.env.GROQ_API_KEY),
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ]
}));
