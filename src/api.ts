import createFetchClient, {Middleware} from "openapi-fetch";
import createClient from "openapi-react-query";
import type {paths} from "./tofisca_api.d.ts";
import {Json} from "./project_setup/common.ts";

export class ApiError extends Error {
    status: number = 0;
    statusText: string = "";
    details: string = "";
    requestBody: Json = null;

    public static async fromResponse(response: Response) {
        const body = await response.json();
        const details = "msg" in body ? body.msg : "";
        return new ApiError(response.status, response.statusText, details, body)
    }

    public constructor(status: number, statusText: string, details: string, body: Json) {
        super();
        this.status = status;
        this.statusText = statusText;
        this.details = details
        this.requestBody = body as Json;
    }

    public toString() {
        return "ApiError(status=${this.status}, statusText=${this.statusText}, message=${this.message})";
    }
}

const myMiddleware: Middleware = {
    async onResponse({response}) {
        if (!response.ok) {
            throw await ApiError.fromResponse(response)
        }
        return response
    },
};


const fetchClient = createFetchClient<paths>({
    // baseUrl: "http://localhost:5173/",
    baseUrl: "http://tofisca:8080/",
});
fetchClient.use(myMiddleware);

export const $api = createClient(fetchClient);
