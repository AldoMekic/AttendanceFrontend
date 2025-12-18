import { PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { mplBubblegum, mintV1 } from "@metaplex-foundation/mpl-bubblegum";
import type { WalletContextState } from "@solana/wallet-adapter-react";

const MERKLE_TREE = process.env.NEXT_PUBLIC_MERKLE_TREE!;
const RPC =
    process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

const DEFAULT_METADATA_PATH = "/api/proof.json";

export async function mintProofCnft(params: {
    wallet: WalletContextState;
    leafOwner: PublicKey;
    classOrEventPda: PublicKey;
}): Promise<string> {
    const { wallet, leafOwner } = params;

    if (!wallet.publicKey) throw new Error("Wallet not connected");
    if (!wallet.signTransaction || !wallet.sendTransaction)
        throw new Error("Wallet cannot sign/send transactions");
    if (!MERKLE_TREE) throw new Error("NEXT_PUBLIC_MERKLE_TREE not set");

    const umi = createUmi(RPC).use(mplBubblegum());
    umi.use(walletAdapterIdentity(wallet as any));

    const merkleTree = umiPublicKey(MERKLE_TREE);
    const owner = umiPublicKey(leafOwner.toBase58());

    const uri =
        typeof window !== "undefined"
            ? `${window.location.origin}${DEFAULT_METADATA_PATH}`
            : DEFAULT_METADATA_PATH;

    const builder = mintV1(umi, {
        leafOwner: owner,
        merkleTree,
        metadata: {
            name: "Proof of Presence",
            symbol: "POP",
            uri,
            sellerFeeBasisPoints: 0,
            creators: [
                {
                    address: umi.identity.publicKey,
                    verified: true,
                    share: 100,
                },
            ],
            collection: null,
            uses: null,
        },
    });

    const res = await builder.sendAndConfirm(umi);
    return res.signature.toString();
}