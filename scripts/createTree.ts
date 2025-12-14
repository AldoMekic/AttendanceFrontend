import "dotenv/config";
import fs from "fs";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, createSignerFromKeypair } from "@metaplex-foundation/umi";
import { mplBubblegum, createTree } from "@metaplex-foundation/mpl-bubblegum";

const RPC = process.env.SOLANA_RPC ?? "https://api.devnet.solana.com";
const KEYPAIR_PATH =
    process.env.SOLANA_KEYPAIR ?? "/home/aldinmekic/.config/solana/id.json";

function loadSolanaKeypairFile(path: string): Uint8Array {
    const secret = JSON.parse(fs.readFileSync(path, "utf8"));
    return new Uint8Array(secret);
}

async function main() {
    const umi = createUmi(RPC).use(mplBubblegum());

    const secretKey = loadSolanaKeypairFile(KEYPAIR_PATH);
    const kp = umi.eddsa.createKeypairFromSecretKey(secretKey);

    const signer = createSignerFromKeypair(umi, kp);
    umi.use(keypairIdentity(signer));

    const maxDepth = 14;
    const maxBufferSize = 64;

    const merkleTreeKeypair = umi.eddsa.generateKeypair();
    const merkleTree = createSignerFromKeypair(umi, merkleTreeKeypair);

    console.log("Creating Bubblegum Tree...");

    const builder = await createTree(umi, {
        merkleTree,
        maxDepth,
        maxBufferSize,
        public: true,
    });

    const result = await builder.sendAndConfirm(umi);

    console.log("✅ Tree created!");
    console.log("Tx Signature:", result.signature.toString());
    console.log("Merkle Tree Address:", merkleTree.publicKey.toString());

    console.log("\nNext steps:");
    console.log(
        `Set NEXT_PUBLIC_MERKLE_TREE=${merkleTree.publicKey.toString()} in your .env.local`
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});