import {
    AirDropData,
    AirdropStatus,
    ApiResp,
    ApiRespCode,
    CreateTokenData,
    CreateTokenMetadata,
} from "./types";

export const DEGENCAST_API_URL = "https://api-dev.degencast.fun";
export const DEGENCAST_WEB_URL = "https://degencast.ai";

const FIRST_ATTEMPT_DELAY = 3000;
const MAX_ATTEMPTS = 6;
const WAIT_TIME_BETWEEN_ATTEMPTS = 1000;

export const createMeme = async ({
    castHash,
    tokenMetadata,
}: {
    castHash: `0x${string}` | undefined;
    tokenMetadata: CreateTokenMetadata;
}): Promise<ApiResp<CreateTokenData>> => {
    if (!castHash) {
        return {
            code: ApiRespCode.ERROR,
            msg: "Cast hash is required",
        };
    }

    try {
        console.log("Creating token...", castHash, tokenMetadata);

        // Create token request
        const createTokenResp = await fetch(DEGENCAST_API_URL + "/memes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ castHash, ...tokenMetadata }),
        });

        const createTokenRespData = await createTokenResp.json();
        console.log("Create Results:", createTokenRespData);

        if (createTokenRespData.code !== 0 || !createTokenRespData.data?.id) {
            console.log("Create failed");
            return {
                success: false,
                error: createTokenRespData.msg || "Unknown error",
                ...createTokenRespData,
            };
        }

        const id = createTokenRespData.data.id;
        console.log("Create successful, checking meme status...", id);

        // Wait initial delay before first status check
        await new Promise((resolve) =>
            setTimeout(resolve, FIRST_ATTEMPT_DELAY)
        );

        // Poll for meme status
        for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
            const memeResp = await fetch(DEGENCAST_API_URL + "/memes/" + id);
            const memeRespData = await memeResp.json();
            console.log("Meme Results:", memeRespData);

            if (memeRespData.code === ApiRespCode.SUCCESS) {
                return memeRespData;
            }

            if (attempts < MAX_ATTEMPTS - 1) {
                await new Promise((resolve) =>
                    setTimeout(resolve, WAIT_TIME_BETWEEN_ATTEMPTS)
                );
            }
        }

        return {
            code: ApiRespCode.ERROR,
            msg: "Max attempts reached",
        };
    } catch (error) {
        console.error("Error creating meme:", error);
        return {
            code: ApiRespCode.ERROR,
            msg: error.message || "Unknown error occurred",
        };
    }
};

export const airdrop = async ({
    castHash,
    tweetUsername,
}: {
    castHash: `0x${string}` | undefined;
    tweetUsername: string | undefined;
}): Promise<ApiResp<AirDropData>> => {
    if (!castHash && !tweetUsername) {
        return {
            code: ApiRespCode.ERROR,
            msg: "Cast hash or twitter username is required",
        };
    }

    try {
        console.log("requesting airdrop", castHash);

        const resp = await fetch(DEGENCAST_API_URL + "/memes/airdrops", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ castHash, tweetUsername }),
        });

        const respData = await resp.json();
        console.log("Airdrop Results:", respData);
        return respData;
    } catch (error) {
        console.error("Error airdrop:", error);
        return {
            code: ApiRespCode.ERROR,
            msg: error.message || "Unknown error occurred",
        };
    }
};

export const getAirdropStatus = async ({
    castHash,
    tweetUsername,
}: {
    castHash: `0x${string}` | undefined;
    tweetUsername: string | undefined;
}): Promise<ApiResp<AirdropStatus>> => {
    if (!castHash && !tweetUsername) {
        return {
            code: ApiRespCode.ERROR,
            msg: "Cast hash or twitter username is required",
        };
    }

    try {
        console.log("get cast author airdrop status", castHash);

        const resp = await fetch(
            DEGENCAST_API_URL +
                "/memes/airdrop/users?castHash=" +
                castHash +
                "&twitterUsername=" +
                tweetUsername,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const respData = await resp.json();
        // console.log("Airdrop Status:", respData);
        return respData;
    } catch (error) {
        console.error("Error airdrop:", error);
        return {
            code: ApiRespCode.ERROR,
            msg: error.message || "Unknown error occurred",
        };
    }
};
