import express from 'express'
import { paymentExecutedRouter } from './routes/paymentExecuted.js'


const app = express()
app.use(express.json())

app.get('/healthz', (_req, res) => {
  res.json({ ok: true })
})

// Placeholder endpoint for future webhook verification (Bridge/Card)
app.post('/webhooks/bridge', (_req, res) => {
  res.status(200).json({ received: true })
})

// Event -> handler wiring (in future). For now we expose a manual trigger.
app.use('/events', paymentExecutedRouter)

const port = process.env.PORT ? Number(process.env.PORT) : 3000
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[relayer] listening on :${port}`)
})

