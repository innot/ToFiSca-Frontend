import {Box, Button, Card, createListCollection, Field, HStack, Input, Select, Stack, VStack} from "@chakra-ui/react";
import {useEffect, useState} from "react";
import {$api, ApiError} from "../api";
import {ApiErrorDialog} from "./api_error_dialog";
import {useQueryClient} from "@tanstack/react-query";
import {SetupPageProps} from "./project_setup";
import {FilmData, ProjectPaths} from "./types.ts";

export interface Props extends SetupPageProps {
    name: string;
    projectId: number
    onProjectNameChange: (name: string) => void;
}

const FilmFormatFrameRates: { [key: string]: { name: string, framerates: number[] } } = {
    "super8": {name: "Super8", framerates: [18, 24]},
    "normal8": {name: "Normal8", framerates: [16, 18, 24, 25]},
    "normal16": {name: "16mm", framerates: [24]},
    "unspecified": {name: "Other", framerates: [16, 18, 24, 25, 30, 48, 60]}
}

const defaultFilmData: FilmData = {
    date: "",
    author: "",
    description: "",
    format: "unspecified",
    fps: 18,
    stock: "",
    tags: [""]
}

export default function ProjectSettingsPage(props: Props) {

    useQueryClient();

    const [allProjects, setAllProjects] = useState<{ [key: string]: number; }>();
    const [projectName, setProjectName] = useState<string>(props.name);
    const [initialProjectName] = useState<string>(props.name);

    // The project Paths
    const [paths, setPaths] = useState<ProjectPaths>({scanned_images: "", processed_images: ""});
    const [initialPaths, setInitialPaths] = useState<ProjectPaths | null>(null);

    // The film data
    const [filmData, setFilmData] = useState<FilmData>(defaultFilmData);
    const [initialFilmData, setInitialFilmData] = useState<FilmData | null>(null);

    // Flag to indicate that the current projectName is an invalid Duplicate
    const [warnNameDuplicate, setWarnNameDuplicate] = useState<boolean>(false);

    // Flag to indicate that the revert button can be activated
    const [isDirty, setIsDirty] = useState<boolean>(false);

    /** The last error message from the backend API. Valid until the next API call **/
    const [apiError, setApiError] = useState<ApiError | null>(null);


    /////////////////////////////////////////////////////////////////////////
    // API Get AllProjects
    /////////////////////////////////////////////////////////////////////////

    /**
     * Get the names of all existing projects.
     * Used for checking for duplicate names
     */
    const {data: apiGetAllProjects, status: apiGetAllProjectsStatus} = $api.useQuery(
        "get",
        "/api/allprojects"
    )

    useEffect(() => {
        if (apiGetAllProjectsStatus == "success") {
            setAllProjects(apiGetAllProjects)
        }
    }, [apiGetAllProjects, apiGetAllProjectsStatus]);

    /////////////////////////////////////////////////////////////////////////
    // API Get/Put Project Paths
    /////////////////////////////////////////////////////////////////////////
    const {data: apiGetProjectPaths, status: apiGetProjectPathsStatus} = $api.useQuery(
        "get",
        "/api/project/paths",
        {refetchOnWindowFocus: false}
    )

    useEffect(() => {
        if (apiGetProjectPathsStatus == "success") {
            const data = apiGetProjectPaths;
            setPaths(data)
            if (!initialPaths) setInitialPaths(data)
        }
    }, [apiGetProjectPaths, apiGetProjectPathsStatus, initialPaths]);

    const {mutate: apiPutProjectPathsMutate} = $api.useMutation(
        "put",
        "/api/project/paths",
        {
            onError: async (error) => {
                if (error instanceof ApiError) {
                    setApiError(error)
                } else {
                    console.error(error)
                }
            },
        }
    )

    useEffect(() => {
        setIsDirty(true)
        if (paths) apiPutProjectPathsMutate({body: paths})
    }, [apiPutProjectPathsMutate, paths])


    /////////////////////////////////////////////////////////////////////////
    // API Get/Put FilmData
    /////////////////////////////////////////////////////////////////////////

    const {data: apiGetFilmdata, status: apiGetFilmdataStatus} = $api.useQuery(
        "get",
        "/api/project/filmdata",
        {refetchOnWindowFocus: true}
    )

    useEffect(() => {
        if (apiGetFilmdataStatus == "success") {
            setFilmData(apiGetFilmdata)
            if (!initialFilmData) setInitialFilmData(apiGetFilmdata)
        }
    }, [apiGetFilmdata, apiGetFilmdataStatus, initialFilmData]);

    const {mutate: apiPutFilmdataMutate} = $api.useMutation(
        "put",
        "/api/project/filmdata",
        {
            onError: async (error) => {
                if (error instanceof ApiError) {
                    setApiError(error)
                } else {
                    console.error(error)
                }
            },
        }
    )

    useEffect(() => {
        setIsDirty(true)
        apiPutFilmdataMutate({body: filmData})
    }, [apiPutFilmdataMutate, filmData])


    /////////////////////////////////////////////////////////////////////////

    /**
     * Check if the project name already exists.
     */
    useEffect(() => {
        if (!allProjects) return;
        const isdup = (projectName in allProjects) && (allProjects[projectName] != props.projectId)
        setWarnNameDuplicate(isdup)
    }, [allProjects, projectName, props.projectId]);


    /**
     * This handler checks if the current project Name is valid and if so tells the parent
     * ProjectSetup Component to send the name to the api
     */
    const handleOnBlur = () => {
        if (!allProjects) return;
        if (!projectName) { // empty name
            props.onFinished(props.pageIndex, false)
            return
        }
        const isdup = (projectName in allProjects) && (allProjects[projectName] != props.projectId)
        if (!isdup) {
            props.onProjectNameChange(projectName)
            props.onFinished(props.pageIndex, true)
        }
    }

    const handleRevertButton = () => {
        setProjectName(initialProjectName)
        if (initialPaths) setPaths(initialPaths)
        if (initialFilmData) setFilmData(initialFilmData)
        setIsDirty(false)
    }

    return (
        <HStack gap="0.5rem" alignItems="top" width="100%" padding={"1%"}>
            <ApiErrorDialog apiError={apiError} setApiError={(error) => setApiError(error)}/>
            <VStack flex={1}>
                <Card.Root variant="elevated" bg={"gray.500"} width={"100%"}>
                    <Card.Body>
                        <Field.Root required invalid={warnNameDuplicate}>
                            <Field.Label>
                                Project Name
                                {!projectName && <Field.RequiredIndicator/>}
                            </Field.Label>
                            <Input placeholder={"New Project"}
                                   value={projectName ?? ''}
                                   onBlur={() => (handleOnBlur())}
                                   onChange={(e) => setProjectName(e.target.value)}/>
                            <Field.ErrorText>
                                Project <em>'{projectName}'</em> already exists. Please choose a different name
                            </Field.ErrorText>
                        </Field.Root>
                    </Card.Body>
                </Card.Root>
                <Card.Root variant="elevated" bg={"gray.500"} width={"100%"}>
                    <Card.Header>
                        <Card.Title>Server storage paths</Card.Title>
                    </Card.Header>
                    <Card.Body>
                        <Field.Root>
                            <Field.Label>
                                Path for scanned images
                            </Field.Label>
                            <Input defaultValue={paths.scanned_images} key={paths.scanned_images}
                                   onBlur={(e) => {
                                       const newpaths: ProjectPaths = {...paths, scanned_images: e.target.value};
                                       setPaths(newpaths)
                                   }}
                            />
                        </Field.Root>
                        <Field.Root>
                            <Field.Label>
                                Path for processed images
                            </Field.Label>
                            <Input defaultValue={paths.processed_images} key={paths.processed_images}
                                   onBlur={(e) => {
                                       const newpaths: ProjectPaths = {...paths, processed_images: e.target.value};
                                       setPaths(newpaths)
                                   }}/>
                        </Field.Root>
                    </Card.Body>
                </Card.Root>
                <Box flex={1}/>
                <Button width="100%"
                        disabled={!isDirty}
                        onClick={handleRevertButton}>
                    Revert to last stored Data
                </Button>
            </VStack>
            <Card.Root flex={2} variant="elevated" bg={"gray.500"}>
                <Card.Header>
                    <Card.Title>Project Description</Card.Title>
                </Card.Header>
                <Card.Body>
                    <Stack gap="4" w="full">
                        <Field.Root>
                            <Field.Label>Date of Film</Field.Label>
                            <Input defaultValue={filmData.date} key={filmData.date}
                                   placeholder="e.g. June 1980"
                                   onBlur={(e) => {
                                       const newdata: FilmData = {...filmData, date: e.target.value};
                                       setFilmData(newdata)
                                   }}
                            />
                        </Field.Root>
                        <Field.Root>
                            <Field.Label>Author</Field.Label>
                            <Input defaultValue={filmData.author} key={filmData.author}
                                   placeholder="Alan Smithee"
                                   onBlur={(e) => {
                                       const newdata: FilmData = {...filmData, author: e.target.value};
                                       setFilmData(newdata)
                                   }}
                            />
                        </Field.Root>
                        <Field.Root>
                            <Field.Label>Description</Field.Label>
                            <Input defaultValue={filmData.description} key={filmData.description}
                                   placeholder="Summer Vacation"
                                   onBlur={(e) => {
                                       const newdata: FilmData = {...filmData, description: e.target.value};
                                       setFilmData(newdata)
                                   }}
                            />
                        </Field.Root>
                        <Field.Root>
                            <Field.Label>Tags</Field.Label>
                            <Input placeholder="Not implemented"/>
                        </Field.Root>
                    </Stack>
                </Card.Body>
            </Card.Root>
            <Card.Root flex={1} variant="elevated" bg={"gray.500"}>
                <Card.Header>
                    <Card.Title>Film Type</Card.Title>
                </Card.Header>
                <Card.Body>
                    <Stack gap="4" w="full">
                        <Select.Root value={[filmData.format]}
                                     onValueChange={(e) => {
                                         if (e.value.length >= 1 && e.value[0]) {
                                             const newdata = {...filmData, format: e.value[0]}
                                             setFilmData(newdata)
                                         }
                                     }}
                                     collection={formatCollection()}>
                            <Select.Label>Film Format</Select.Label>
                            <Select.Control>
                                <Select.Trigger>
                                    <Select.ValueText/>
                                </Select.Trigger>
                                <Select.IndicatorGroup>
                                    <Select.Indicator/>
                                </Select.IndicatorGroup>
                            </Select.Control>
                            <Select.Positioner>
                                <Select.Content>
                                    {formatCollection().items.map((name) => (
                                        <Select.Item item={name} key={name.value}>
                                            {name.label}
                                            <Select.ItemIndicator/>
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select.Positioner>
                        </Select.Root>
                        <Select.Root value={[filmData.fps.toString()]}
                                     onValueChange={(e) => {
                                         if (e.value.length >= 1 && e.value[0]) {
                                             const newdata = {...filmData, fps: Number(e.value[0])}
                                             setFilmData(newdata)
                                         }
                                     }}
                                     collection={framerateCollection(filmData.format)}>
                            <Select.Label>Frames per Second</Select.Label>
                            <Select.Control>
                                <Select.Trigger>
                                    <Select.ValueText/>
                                </Select.Trigger>
                                <Select.IndicatorGroup>
                                    <Select.Indicator/>
                                </Select.IndicatorGroup>
                            </Select.Control>
                            <Select.Positioner>
                                <Select.Content>
                                    {framerateCollection(filmData.format).items.map((name) => (
                                        <Select.Item item={name} key={name.value}>
                                            {name.label}
                                            <Select.ItemIndicator/>
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select.Positioner>
                        </Select.Root>
                        <Field.Root>
                            <Field.Label>Film Stock Material</Field.Label>
                            <Input placeholder="Not Implemented yet"/>
                        </Field.Root>
                    </Stack>
                </Card.Body>
            </Card.Root>
        </HStack>
    )
}


const formatCollection = () => {
    const list = [];
    for (const [key, data] of Object.entries(FilmFormatFrameRates)) {
        list.push({label: data.name, value: key})
    }
    return createListCollection({items: list})
}

const framerateCollection = (format: string) => {
    const list: { label: string; value: string; }[] = [];
    if (format in FilmFormatFrameRates) {
        const rates = FilmFormatFrameRates[format]?.framerates;
        rates?.forEach(rate => {
            list.push({label: rate.toString(), value: rate.toString()})
        })
    }
    return createListCollection({items: list})
}
