import {http, HttpResponse} from 'msw'

import mockImage from "./mock_frame_image.png"
import {FilmData, FilmFormat, PerforationLocation, Point, ProjectPathEntry, ScanArea} from "../project_setup/types.ts";
import {components} from "../tofisca_api";


const mockPerforationLocation: PerforationLocation = {
    top_edge: 0.4,
    bottom_edge: 0.6,
    inner_edge: 0.22,
    outer_edge: 0.1,
}

const mockScanArea: ScanArea = {
    perf_ref: mockPerforationLocation,
    ref_delta: {dx: 0.1, dy: -0.35},
    size: {width: 0.6, height: 0.7}
}

const mockFilmFormats: FilmFormat[] = [
    {key: 'super8', name: 'Super8', framerates: [18.0, 24.0]} as FilmFormat,
    {key: 'normal8', name: '8mm Regular', framerates: [18.0, 24.0]} as FilmFormat,
    {key: 'std16mm', name: '16mm Standard', framerates: [24.0]} as FilmFormat,
    {key: 'super16', name: 'Super 16', framerates: [24.0]} as FilmFormat,
    {key: 'unknown', name: 'Unknown', framerates: [16, 18, 20, 24]} as FilmFormat,
]

const mockFilmData: FilmData = {
    date: "",
    author: "",
    description: "",
    format: mockFilmFormats[0]!,
    fps: 18,
    stock: "",
    tags: [""]
}

interface ProjectState {
    allProjects: { [key: string]: string }
    name: string
    id: number
    paths: { [key: string]: components["schemas"]["ProjectPathEntry"] }
    filmData: FilmData,
    perfLocation?: PerforationLocation,
    scanArea?: ScanArea,
}

const mockProjectPaths = {
    'project': {
        'name': 'project',
        'description': 'General project data storage',
        'path': '${name}',
        'resolved': '/var/data/tofisca/TestProject'
    } as ProjectPathEntry,
    'scanned': {
        'name': 'scanned',
        'description': 'Folder for raw scanned images',
        'path': '${project}/scanned_images',
        'resolved': '/var/data/tofisca/TestProject/scanned_images'
    } as ProjectPathEntry,
    'final': {
        'name': 'final',
        'description': 'Images after processing',
        'path': '${project}/final_images',
        'resolved': '/var/data/tofisca/TestProject/final_images'
    } as ProjectPathEntry,
}


const projectState: ProjectState = {
    allProjects: {"1": "foo", "2": "bar", "3": "baz"},
    name: "Project 123",
    id: 4,
    paths: mockProjectPaths,
    filmData: mockFilmData,
    perfLocation: undefined,
    scanArea: undefined,
}


export const handlers = [

    /**
     * Project Manager API calls
     */

    http.get("/api/projects/all", async () => {
        return HttpResponse.json(projectState.allProjects);
    }),

    /**
     * Global Lists
     */
    http.get("/api/filmformats", async () => {
        return HttpResponse.json(mockFilmFormats);
    }),

    /**
     * Project API calls
     */

    http.get("/api/project/name", async () => {
        return HttpResponse.json(projectState.name);
    }),

    http.put("/api/project/name", async ({request}) => {
        const url = new URL(request.url)
        const name = url.searchParams.get('name')
        if (!name) {
            return HttpResponse.json({msg: `Name parameter is empty`}, {
                status: 400,
                statusText: "Invalid Name"
            })
        }
        if (name in projectState.allProjects) {
            return HttpResponse.json({msg: `Project with name "${name}" already exists`}, {
                status: 409,
                statusText: "Duplicate Name Error"
            })
        }
        projectState.name = name;
        return HttpResponse.json(name);
    }),

    http.get("/api/project/id", async () => {
        return HttpResponse.json(projectState.id);
    }),

    http.get("/api/project/allpaths", async () => {
        return HttpResponse.json(projectState.paths)
    }),

    http.put("/api/project/path", async ({request}) => {
        const path = await request.json() as ProjectPathEntry;
        projectState.paths[path.name] = path
        return HttpResponse.json(path);
    }),

    http.get("/api/project/filmdata", async () => {
        return HttpResponse.json(projectState.filmData)
    }),

    http.put("/api/project/filmdata", async ({request}) => {
        projectState.filmData = await request.json() as FilmData;
        return HttpResponse.json(projectState.filmData);
    }),

    http.get("/api/project/perf/location", async () => {
        const loc = projectState.perfLocation;
        if (loc === undefined) {
            return HttpResponse.json({msg: "Perforation location not set"}, {
                status: 404,
                statusText: "Data not found"
            })
        }
        return HttpResponse.json(loc)
    }),

    http.put("/api/project/perf/location", async ({request}) => {
        const postData = await request.json();
        console.info(`/api/perf/location ${JSON.stringify(postData)}`);

        if (!(typeof postData === 'object') || !postData || !('reference' in postData)) {
            return HttpResponse.json({msg: "Invalid Perforation Location"}, {
                status: 422,
                statusText: "Validation Error"
            })
        }
        const perfLoc = postData as PerforationLocation
        projectState.perfLocation = perfLoc
        projectState.scanArea = {perf_ref: perfLoc, ref_delta: {dx: 0.0, dy: -0.3}, size: {width: 0.6, height: 0.5}};
        return new HttpResponse(null, {
            status: 204,
            statusText: "Successfully saved"
        })
    }),

    http.post('/api/project/perf/detect', async ({request}) => {
        const startPoint = await request.json() as Point;
        console.info(`/api/perfdetect: ${JSON.stringify(startPoint)}`);

        if (startPoint.x == 0 && startPoint.y == 0) {
            // mock full autodetect
            projectState.perfLocation = mockPerforationLocation
            projectState.scanArea = mockScanArea
            return HttpResponse.json(mockPerforationLocation)
        }

        if (startPoint.x > 0.1 && startPoint.x < mockPerforationLocation.inner_edge &&
            startPoint.y > mockPerforationLocation.top_edge && startPoint.y < mockPerforationLocation.bottom_edge) {
            projectState.perfLocation = mockPerforationLocation
            projectState.scanArea = mockScanArea
            return HttpResponse.json(mockPerforationLocation)
        }
        const msg = `Could not detect perforation hole ${startPoint ? " at the given point" : ""}.`
        return HttpResponse.json(startPoint, {
                status: 420,
                statusText: msg
            }
        )
    }),

    http.get('/api/project/scanarea', () => {
        if (!projectState.perfLocation) {
            return HttpResponse.json({msg: "No Perf"}, {
                status: 404,
                statusText: "No Perforation Location set"
            })
        }
        return HttpResponse.json(projectState.scanArea)
    }),

    http.put('/api/project/scanarea', async ({request}) => {

        const postData = await request.json();

        if (!(typeof postData === 'object') || !postData || !('ref_delta' in postData)) {
            return HttpResponse.json({msg: "foobar"}, {
                status: 422,
                statusText: "Validation Error"
            })
        }
        projectState.scanArea = postData as ScanArea;
        return new HttpResponse(null, {
            status: 204,
            statusText: "Successfully saved"
        })
    }),


    http.get('/api/camera/preview', async (/*{request}*/) => {

        // const url = new URL(request.url)

        await sleep(100); // simulate server lag

        const buffer = await fetch(mockImage).then(
            (response) => {
                return response.arrayBuffer();
            }
        )

        // Use the "HttpResponse.arrayBuffer()" shorthand method
        // to automatically infer the response body buffer's length.
        return HttpResponse.arrayBuffer(buffer, {
            headers: {
                'Content-Type': 'image/png',
            },
        })
    })
]

async function sleep(ms: number): Promise<void> {
    return new Promise(
        (resolve) => setTimeout(resolve, ms));
}