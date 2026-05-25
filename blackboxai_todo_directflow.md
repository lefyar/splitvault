# BlackboxAI TODO — Direct payment flow (SC + BE + FE)

- [ ] Wire relayer `/events/paymentExecuted` to dispatch by `PaymentRoute` (DIRECT/BRIDGE/CARD) instead of hardcoding DIRECT handler.
- [ ] Update DIRECT handler if needed to store/log correctly (no on-chain calls for DIRECT, per current vault behavior).
- [ ] Add minimal route payload validation (timestamp/amount parsing).
- [ ] Run `pnpm -C packages/relayer build`.
- [ ] (After backend is correct) integrate with frontend once miniapp source is available.

