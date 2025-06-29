# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Development**: `bun run dev` - Run with file watching
- **Runtime check**: `bun run runtime` - Check Bun version
- **Format code**: `bun run format` - Format with Prettier

## Architecture Overview

This is a Shopify webhook automation service that purchases shipping labels through EasyPost and generates packing slips. The service runs on Bun.

### Core Flow
1. Receives Shopify webhook at `/hooks/purchase-shipping-labels` with HMAC validation
2. Fetches order data via Shopify GraphQL API
3. Creates EasyPost shipments for each fulfillment order with retry logic (if a suitable rate isn't found the first time, it can be found on subsequent tries)
4. Applies shipping rate selection rules
5. Emails shop owner if all retries fail with rate details and order link
6. Purchases shipping labels and creates Shopify fulfillments
7. Generates PDF packing slips using Puppeteer
8. Emails shipping labels and packing slips to fulfillment center

### Key Components
- **src/index.js**: Main webhook handler and server
- **src/rules.js**: Shipping rate selection logic using JSONata
- **packing-slip/**: PDF generation using HTML templates and Puppeteer
- **src/gql.js**: Shopify GraphQL queries and mutations
- **utils/**: Logging, validation, and utility functions

### Environment Modes
- **Production**: Creates actual Shopify fulfillments and sends live emails
- **Development**: Logs intended actions without side effects
- Uses `NODE_ENV` and `SEND_LIVE_EMAILS` environment variables

### External Dependencies
- Shopify GraphQL API for order management
- EasyPost API for shipping label generation
- Email service for notifications
- Sentry for error tracking (production only)

### Data Flow
- Webhook payload → Order fetch → Fulfillment orders → EasyPost shipments → Rate selection → Label purchase → Shopify fulfillment creation → Packing slip generation → Email notification

