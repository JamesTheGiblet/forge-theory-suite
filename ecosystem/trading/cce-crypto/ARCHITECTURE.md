# ARCHITECTURE.md
### CCE Platform Core — Technical Architecture
**Giblets Creations · v2.4.0 · March 2026**

---

## Overview

The CCE Platform runs as a Node.js process hosting 13 independent engines in parallel across three ecosystems: Strategic (S.E), Tactical (T.E), and Observer (O.E). Three additional intelligence layers run as scheduled cron processes. A second platform (CCE Unreal) runs on port 3001 as the commercial-facing layer.

Each engine is a self-contained module with its own state machine, data feed, storage layer, and decision logic. They share only two things: the notification service and the process runtime.

---

## Process Architecture

