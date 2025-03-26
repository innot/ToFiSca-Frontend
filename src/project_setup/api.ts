import {PerforationLocation, Point} from "./types.ts";


export const ApiFetchPreviewImage = async () => {
    const response = await fetch('/api/preview');
    if (!response.ok) {
        // todo: show error message
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}


export const ApiPerforationAutoDetect = async (startPoint: Point | null) => {

    const response = await fetch('/api/perf/detect', {
        method: "get",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(startPoint),
        signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
        // todo: show error message
    }
    const location = await response.json();
    if (location.error) return undefined;
    return location as PerforationLocation;
}

/**
async function get_fetch<Type>(url: URL | string): Promise<Type | Error> {
    let response: Response;
    try {
        response = await fetch(url, {
            signal: AbortSignal.timeout(5000),
        });
    } catch {
        // fetch timed out
        throw new Error(408, "Request Timeout", "Backend failed to answer. Check if backend is running.")
    }

    const content = await response.json()

    if (response.ok) {
        return new Promise(content) as Type;
    }
    return new Error(){
        _error: true,
        status: response.status,
        statusText: response.statusText,
        message: content.detail,
    }
}
**/