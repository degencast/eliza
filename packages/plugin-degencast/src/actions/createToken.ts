import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    composeContext,
    // generateImage,
    // generateObject,
    generateObjectDeprecated,
    type Action,
} from "@elizaos/core";
import { z } from "zod";
import { Cast } from "@neynar/nodejs-sdk/build/api";
import { Tweet } from "agent-twitter-client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TokenMetadataSchema = z.object({
    name: z.string().min(3),
    symbol: z.string().min(3),
    description: z.string().min(10).optional(),
});

// Save the base64 data to a file
// import * as fs from "fs";
// import * as path from "path";
import { createTokenTemplate } from "../templetes/index.ts";
import { ApiRespCode, CreateTokenMetadata } from "../types/index.ts";
import { createMeme, DEGENCAST_WEB_URL } from "../utils.ts";

export const createTokenAction: Action = {
    name: "CREATE_TOKEN",
    similes: [
        "CREATED_TOKEN",
        "TOKEN_CREATION",
        "DEPLOY_TOKEN",
        "LAUNCH_TOKEN",
        "LAUNCHED_TOKEN",
        "TOKEN_CREATED",
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        // console.log("Validating CREATE_TOKEN action...", _message);
        return true; //return isCreateTokenContent(runtime, message.content);
    },
    description:
        "Create a new token when explicitly requested. I'll automatically extract the token metadata from your message. If any required information is missing, I'll ask you for:\n- Token name (minimum 3 characters)\n- Token symbol/ticker (minimum 3 characters)\n- Token description (optional, but minimum 10 characters if provided).\nOnly trigger this when user explicitly asks to create/deploy/launch a token.\nOnce triggered by a user, subsequent messages from the same user in the conversation will also trigger this action.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        console.log("Starting CREATE_TOKEN handler...", message);
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
        // console.log("CREATE_TOKEN State: ", state);
        // Generate structured content from natural language
        const context = composeContext({
            state,
            template: createTokenTemplate,
        });

        const tokenMetadata = (await generateObjectDeprecated({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            // schema: TokenMetadataSchema,
        })) as z.infer<typeof TokenMetadataSchema>;

        console.log("CREATE_TOKEN content:", tokenMetadata);

        if (!tokenMetadata.name || !tokenMetadata.symbol) {
            return {
                text: "I need more information to create a token. Please provide:\n- Token name\n- Token symbol/ticker\n- (Optional) Token description",
                action: "CREATE_TOKEN",
                content: {
                    tokenMetadata: tokenMetadata,
                },
            };
        }

        try {
            console.log("Executing create api call...");
            const result = await createMeme({
                castHash,
                castFid,
                tweetId,
                tweetUsername,
                tokenMetadata: tokenMetadata as CreateTokenMetadata,
            });

            console.log("Create api call result: ", result);

            if (callback) {
                if (result.code === ApiRespCode.SUCCESS) {
                    const deployerName = result.data?.deployerFcName;
                    const id = result.data?.base?.tokenAddress
                        ? result.data.base.tokenAddress
                        : result.data?.solana?.tokenAddress
                          ? result.data.solana.tokenAddress
                          : result.data?.id;
                    const url = id
                        ? `${DEGENCAST_WEB_URL}/memes/${id}`
                        : `${DEGENCAST_WEB_URL}`;
                    callback({
                        text: `Token ${tokenMetadata.name} (${tokenMetadata.symbol}) created successfully!\n Creator: ${deployerName}\n View at: \n${url}`,
                    });
                } else {
                    callback({
                        text: `Failed to create token: ${result.msg}\n`,
                    });
                }
            }
            return result.code === ApiRespCode.SUCCESS;
        } catch (error) {
            console.error("Error during token creation: ", error);
            if (callback) {
                callback({
                    text: `Error during token creation: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new token called GLITCHIZA with symbol GLITCHIZA.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "",
                    action: "CREATE_TOKEN",
                    content: {
                        tokenMetadata: {
                            symbol: "GLITCHIZA",
                            name: "GLITCHIZA",
                            description: "A GLITCHIZA token",
                        },
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Launch this token, \nName: test-token\nTicker: TEST",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "",
                    action: "CREATE_TOKEN",
                    content: {
                        tokenMetadata: {
                            symbol: "TEST",
                            name: "test-token",
                            description: "A test token",
                        },
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a meme token called PEPE with symbol $PEPE",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "",
                    action: "CREATE_TOKEN",
                    content: {
                        tokenMetadata: {
                            symbol: "PEPE",
                            name: "PEPE",
                            description:
                                "A meme token inspired by the famous Pepe the Frog",
                        },
                    },
                },
            },
        ],
        // [
        //     {
        //         user: "{{user1}}",
        //         content: {
        //             text: "create token", // Invalid example - insufficient info
        //         },
        //     },
        //     {
        //         user: "{{user2}}",
        //         content: {
        //             text: "I need more information to create a token. Please provide:\n- Token name\n- Token symbol/ticker\n- (Optional) Token description",
        //         },
        //     },
        // ],
        // [
        //     {
        //         user: "{{user1}}",
        //         content: {
        //             text: "Create token with symbol !@#$%", // Invalid example - invalid symbol
        //         },
        //     },
        //     {
        //         user: "{{user2}}",
        //         content: {
        //             text: "Invalid token symbol. Token symbols should only contain letters and numbers.",
        //         },
        //     },
        // ],
    ] as ActionExample[][],
};
