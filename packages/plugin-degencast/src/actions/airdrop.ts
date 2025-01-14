import {
    ActionExample,
    elizaLogger,
    // booleanFooter,
    // composeContext,
    // generateTrueOrFalse,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    // ModelClass,
    State,
    type Action,
} from "@elizaos/core";

import { airdrop, getAirdropStatus, DEGENCAST_WEB_URL } from "../utils.ts";
import { ApiRespCode, ClaimStatus } from "../types/index.ts";
import { Cast } from "@neynar/nodejs-sdk/build/api";
import { Tweet } from "agent-twitter-client";
// export const shouldAirdropTemplate =
//     `Based on the conversation so far:

// {{recentMessages}}

// Should {{agentName}} proceed with the airdrop?
// Respond with YES if:
// - The user has both Base and Solana addresses bound
// - OR the user has one address bound and explicitly indicated to skip the airdrop for the other chain

// Otherwise, respond with NO.
// ` + booleanFooter;

export const airdropAction: Action = {
    name: "AIRDROP",
    similes: ["AIRDROP"],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description:
        "start an $CAST token airdrop to user. Once triggered by a user, subsequent messages from the same user in the conversation will also trigger this action.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        console.log("Starting AIRDROP handler...", message);
        // Compose state if not provided
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        const castHash: `0x${string}` | undefined = (
            message.content.cast as Cast
        )?.hash as `0x${string}`;
        const castFid: number | undefined = (message.content.cast as Cast)
            ?.author?.fid;
        const tweetId: string | undefined = (message.content.tweet as Tweet)
            ?.id;
        const tweetUsername: string | undefined = (
            message.content.tweet as Tweet
        )?.username;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async function _shouldAirdrop(state: State): Promise<boolean> {
            // console.log("Checking airdrop status...", state);
            // get airdrop status
            console.log("Checking airdrop status...");
            const airdropStatusResp = await getAirdropStatus({
                castFid,
                tweetUsername,
            });
            elizaLogger.log("Airdrop Status:", airdropStatusResp);
            // Check if the user has verified their addresses
            if (
                airdropStatusResp.code !== ApiRespCode.SUCCESS ||
                !airdropStatusResp.data ||
                airdropStatusResp.data.claimStatus !== ClaimStatus.UNCLAIMED
            ) {
                callback({
                    text: airdropStatusResp.msg,
                });
                return false;
            }
            // const shouldAirdropContext = composeContext({
            //     state,
            //     template: shouldAirdropTemplate, // Define this template separately
            // });
            // const forceAirdrop = await generateTrueOrFalse({
            //     runtime,
            //     context: shouldAirdropContext,
            //     modelClass: ModelClass.LARGE,
            // });
            const forceAirdrop = false;
            const verifiedAddresses =
                airdropStatusResp.data?.user?.verified_addresses;
            // console.log("Verified Addresses:", verifiedAddresses);
            if (
                verifiedAddresses?.eth_addresses?.length === 0 &&
                verifiedAddresses?.sol_addresses?.length === 0
            ) {
                callback({
                    text: "You haven't connected any wallets yet. Please bind your Base and Solana wallets to claim your $CAST airdrop.",
                });
                return false;
            } else if (
                verifiedAddresses?.eth_addresses?.length === 0 &&
                verifiedAddresses?.sol_addresses?.length > 0
            ) {
                if (!forceAirdrop) {
                    // callback({
                    //     text: `This airdrop is distributed on both Base and Solana. You have already verified your Solana wallet address(${verifiedAddresses?.sol_addresses?.[0]}). You have to verify your Base address on Warpcast first before claiming.`,
                    // });
                    callback({
                        text: `You haven't connected both required wallets yet. Currently, only your Base or Solana wallet is connected. Please bind both wallets and try claiming again in 2 hours.`,
                    });
                    return false;
                }
            } else if (
                verifiedAddresses?.eth_addresses?.length > 0 &&
                verifiedAddresses?.sol_addresses?.length === 0
            ) {
                if (!forceAirdrop) {
                    callback({
                        text: `You haven't connected both required wallets yet. Currently, only your Base or Solana wallet is connected. Please bind both wallets and try claiming again in 2 hours.`,
                    });
                    return false;
                }
            }
            return true;
        }

        // proceed with the airdrop
        if (await _shouldAirdrop(state)) {
            console.log("Executing airdrop api call...");
            try {
                const result = await airdrop({
                    castFid,
                    tweetUsername,
                });
                elizaLogger.log("Airdrop api call result: ", result);

                if (callback) {
                    if (result.code === ApiRespCode.SUCCESS) {
                        const id = result.data?.baseCastTokenAddress
                            ? result.data.baseCastTokenAddress
                            : result.data?.solanaCastTokenAddress
                              ? result.data.solanaCastTokenAddress
                              : undefined;
                        const tokenDetailUrl = id
                            ? `${DEGENCAST_WEB_URL}/memes/${id}`
                            : `${DEGENCAST_WEB_URL}`;
                        const txUrls = `${result.data?.baseClaimTxHash || ""}\n${result.data?.solanaClaimTxHash || ""}`;

                        callback({
                            text: `${result.msg}\n View at: \n${tokenDetailUrl}\n\nTx Links: \n${txUrls}`,
                        });
                    } else {
                        callback({
                            text: `${result.msg}`,
                        });
                    }
                }
                return result.code === ApiRespCode.SUCCESS;
            } catch (error: Error | unknown) {
                elizaLogger.error("Error during airdrop request: ", error);
                if (callback) {
                    callback({
                        text: `Error during airdrop request: ${error instanceof Error ? error.message : String(error)}`,
                        content: {
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    });
                }
                return false;
            }
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "airdrop",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "",
                    action: "AIRDROP",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "airdrop me some $CAST",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "",
                    action: "AIRDROP",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "requesting airdrop",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "",
                    action: "AIRDROP",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "claim airdrop",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "",
                    action: "AIRDROP",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "claim $CAST airdrop",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "",
                    action: "AIRDROP",
                },
            },
        ],
    ] as ActionExample[][],
};
