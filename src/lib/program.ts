import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

// Import IDL - use require for JSON in Next.js
const idl = require("./attendance.json");

// IMPORTANT: Replace with YOUR program ID from `anchor keys list`
export const PROGRAM_ID = new PublicKey("81UDr8A4MRvaxWmdPG72fFLMMxfDu634QmyykZj9JCp8");

export function useProgram() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    return useMemo(() => {
        if (!wallet) return null;
        const provider = new AnchorProvider(connection, wallet, {
            commitment: "confirmed",
        });
        return new Program(idl as Idl, provider);
    }, [connection, wallet]);
}

export function getEventPDA(authority: PublicKey, eventId: string): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("event"), authority.toBuffer(), Buffer.from(eventId)],
        PROGRAM_ID
    );
    return pda;
}

export function getAttendancePDA(
    event: PublicKey,
    attendee: PublicKey
): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("attendance"), event.toBuffer(), attendee.toBuffer()],
        PROGRAM_ID
    );
    return pda;
}