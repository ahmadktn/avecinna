# Custom Express Clinical Microservice (Mode C Example)

This example microservice demonstrates how third-party hospital engineering teams integrate **Avecinna Mode C (`@avecina/security-middleware`)** into custom Node.js/Express applications.

## Key Demonstrations
1. **Plug-and-play Security**: Attaching `createAvecinnaExpressMiddleware` to Express route definitions.
2. **Context-Aware Access Control (CAAC)**: Automatically blocks out-of-ward access attempts with HTTP 403.
3. **Role DTO Response Masking**: Doctor receives full clinical notes; Nurse receives vitals and active medications; Clerk receives demographics only; Admin receives redacted data.
4. **Isolated Merkle Audit Ledger**: Every view and action logs an append-only SHA-256 block into `avecinna_audit_db` with `execution_mode = 'MODE_C'`.

## Running the Example

```bash
# From repository root
cd examples/custom-express-app
npm install
npm start
```
