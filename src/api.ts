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
    baseUrl: "http://localhost:5173",
});
fetchClient.use(myMiddleware);

export const $api = createClient(fetchClient);

/**
export function useApiStateReadOnly<Paths extends Record<string, Record<HttpMethod, {}>>, Media extends MediaType>

= <
    Method extends HttpMethod,
    Path extends PathsWithMethod<Paths, Method>,
    Init extends MaybeOptionalInit<Paths[Path], Method>,
    Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>, // note: Required is used to avoid repeating NonNullable in UseQuery types
    Options extends Omit<
        UseQueryOptions<
            Response["data"],
            Response["error"],
            InferSelectReturnType<Response["data"], Options["select"]>,
            QueryKey<Paths, Method, Path>
        >,
        "queryKey" | "queryFn"
    >,
>(
    path: Path)
{

    const readquery = $api.useQuery(
        "get",
        path,
    );

    console.log(readquery);

    return
}

export function useGet<
    Path extends PathsWithMethod<paths, 'get'>,
    Init extends FetchOptions<FilterKeys<paths[Path], 'get'>>,
    Response extends FetchResponse<paths[Path]['get']>['data'],
>(
    path: Path,
    init: Init,
    query?: Partial<UseQueryOptions>
) {
    return useQuery({
        ...query,
        queryKey: [path, init?.params, init?.body],
        queryFn: async ({signal}) => {
            const {data, error, response} = await client.GET(path, {...init, signal});
            if (error) {
                if (response.status == 403) {
                    // Unauthorized
                }
                throw new Error(error as string);
            }
            return data;
        },
    }) as UseQueryResult<Response>;
}
 **/