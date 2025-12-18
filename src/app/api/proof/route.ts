import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        name: "Proof of Presence",
        symbol: "POP",
        description: "Compressed NFT proof of attendance.",
        image: "https://placehold.co/512x512/png",
        attributes: [{ trait_type: "Type", value: "Attendance" }],
    });
}