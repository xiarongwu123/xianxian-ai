import type { IncomingMessage, ServerResponse } from "node:http";
export declare function buildResearch(code: string): Promise<{
    code: string;
    quote: unknown;
    fundamentals: unknown;
    announcements: unknown;
    status: {
        quote: string;
        fundamentals: string;
        announcements: string;
    };
    retrievedAt: string;
    disclaimer: string;
}>;
export declare function handleResearchApi(request: IncomingMessage, response: ServerResponse, next: () => void): Promise<void>;
