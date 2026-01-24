# Solana Attendance

Blockchain-powered attendance tracking with optional compressed NFT proof-of-attendance.

## Overview
A decentralized attendance system built on Solana that enables teachers to create events/classes and students to check in via QR code. Each check-in is recorded on-chain and optionally mints a compressed NFT as proof of attendance.

## Features
- QR Check-in (event + class session mode)
- On-chain records (immutable attendance)
- Optional proof NFTs (compressed NFT)
- Real-time attendee updates
- CSV export for teachers
- Student attendance history + streak counter
- Mobile-friendly UI

## Tech Stack
**Frontend:** Next.js, React, Tailwind, TypeScript  
**Blockchain:** Solana, Anchor  
**NFT:** Metaplex Bubblegum (compressed NFTs)

## Quick Start

### Prerequisites
- Node.js 18+
- Rust + Cargo
- Solana CLI
- Anchor CLI
- Wallet: Phantom / Solflare

### Frontend
```bash
cd AttendanceFrontend
npm install
npm run dev