
# CW Cycle Count

Internal inventory cycle count tool for CoreWeave European DC operations.

## Status
Frontend prototype v0.1 , backend integration pending IT approval.

## Features
- CWPN (CoreWeave Part Number) system , 9-digit fixed format
- NetSuite ID mapping for export compatibility
- Daily / Weekly / Full count session types
- Serial-tracked and quantity-only item support
- Barcode scanner compatible (HID keyboard emulation)
- Live variance detection across all storage sections

## Stack
- React 18 + Vite
- Backend: TBC (SharePoint Lists / Supabase)

## Run locally
npm install
npm run dev
