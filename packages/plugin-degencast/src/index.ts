import { Plugin } from "@elizaos/core";
import { createTokenAction } from "./actions/createToken.ts";
import { airdropAction } from "./actions/airdrop.ts";
export * as actions from "./actions";

export const degencastPlugin: Plugin = {
    name: "degencast",
    description: "Degencast Plugin for Eliza",
    actions: [airdropAction, createTokenAction],
    evaluators: [],
    providers: [],
};
