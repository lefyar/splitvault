import dotenv from 'dotenv'
import express from 'express'
import { paymentExecutedRouter } from './routes/paymentExecuted.js'
import { vaultsRouter } from './routes/vaults.js'
import { bridgeRouter } from './handlers/bridge.js'

dotenv.config({ path: '../../.env.local' })

const app = express()
app.use(express.json())
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  next()
})
app.options('*', (_req, res) => res.sendStatus(204))
const bridgeCardEnabled = process.env.ENABLE_BRIDGE_CARD === 'true'

app.get('/healthz', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/vaults', vaultsRouter)

if (bridgeCardEnabled) {
  app.use('/api/bridge', bridgeRouter)
}

// Event -> handler wiring (in future). For now we expose a manual trigger.
app.use('/events', paymentExecutedRouter)

const port = process.env.PORT ? Number(process.env.PORT) : 3000
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[relayer] listening on :${port}`)
})
