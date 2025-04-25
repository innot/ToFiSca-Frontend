import {
    Box,
    Button,
    Card,
    createListCollection,
    Field,
    HStack,
    Input,
    ListCollection,
    Select,
    Stack,
    VStack
} from "@chakra-ui/react";
import * as React from "react";
import {useEffect, useState} from "react";
import {$api, ApiError} from "../api";
import {ApiErrorDialog} from "../common_components/api_error_dialog.tsx";
import {useQueryClient} from "@tanstack/react-query";

import {SetupPageProps} from "./project_setup";
import {FilmData, FilmFormat, ProjectPathEntry} from "./types.ts";


export interface Props extends SetupPageProps {
    // callback for project name changes.
    onProjectNameChange: (name: string) => void;
}


export default function ProjectSettingsPage(props: Props) {

    useQueryClient();

    const [allProjects, setAllProjects] = useState<{ [key: string]: string; }>();
    const [currentProjectName, setCurrentProjectName] = useState<string>();
    const [initialProjectName, setInitialProjectName] = useState<string>();

    // The project id of the current project. Used for the duplicate name checking.
    const [projectId, setProjectId] = useState<number>(0)

    // The project Paths
    const [currentPaths, setcurrentPaths] = useState<Map<string, ProjectPathEntry>>();
    const [initialPaths, setInitialPaths] = useState<Map<string, ProjectPathEntry>>();

    // The film data
    const [currentFilmData, setCurrentFilmData] = useState<FilmData>();
    const [initialFilmData, setInitialFilmData] = useState<FilmData>();

    // The list of all film formats and the two derived collections for the <Select> component
    const [allFilmFormats, setAllFilmFormats] = useState<FilmFormat[]>([] as FilmFormat[]);
    const [filmFormatCollection, setFilmFormatCollection] = useState<ListCollection>(createListCollection({items: [] as undefined[]}))
    const [frameRateCollection, setFrameRateCollection] = useState<ListCollection>(createListCollection({items: [] as undefined[]}));

    // Flag to indicate that the current projectName is an invalid Duplicate
    const [warnNameDuplicate, setWarnNameDuplicate] = useState<boolean>(false);

    // Flag to indicate that the revert button can be activated
    const [isDirty, setIsDirty] = useState<boolean>(false);

    /** The last error message from the backend API. Valid until the next API call **/
    const [apiError, setApiError] = useState<ApiError | null>(null);

    /////////////////////////////////////////////////////////////////////////
    // API Get Project Id
    /////////////////////////////////////////////////////////////////////////

    /**
     * Get the Project id from the backend.
     */
    const {data: apiGetProjectId, status: apiGetProjectIdStatus} = $api.useQuery(
        "get",
        "/api/project/id",
    );

    useEffect(() => {
        if (apiGetProjectIdStatus == "success") {
            setProjectId(apiGetProjectId)
        }
    }, [apiGetProjectId, apiGetProjectIdStatus]);

    /////////////////////////////////////////////////////////////////////////
    // API Get/Put Project Name
    /////////////////////////////////////////////////////////////////////////

    const {
        data: apiGetProjectName,
        status: apiGetProjectNameStatus
    } = $api.useQuery("get", "/api/project/name", {staleTime: Infinity});

    useEffect(() => {
        if (apiGetProjectNameStatus == "success") {
            // Set the currentProjectName, initialProjectName (if not set) and tell the parent about the new name.
            const name = apiGetProjectName
            setCurrentProjectName(name)
            if (!initialProjectName) setInitialProjectName(name)
            props.onProjectNameChange(name)
        }
    }, [apiGetProjectName, apiGetProjectNameStatus, initialProjectName]);

    const {mutate: apiPutProjectNameMutate} = $api.useMutation(
        "put",
        "/api/project/name",
        {
            onError: async (error) => {
                if (error instanceof ApiError) {
                    setApiError(error)
                } else {
                    console.error(error)
                }
            },
            onSuccess: async (name) => {
                // Tell the ProjectSetup parent component about the new name
                props.onProjectNameChange(name);
            }
        }
    )

    /////////////////////////////////////////////////////////////////////////
    // API Get AllProjects
    /////////////////////////////////////////////////////////////////////////

    /**
     * Get the names of all existing projects.
     * Used for checking for duplicate names
     */
    const {data: apiGetAllProjectsData, status: apiGetAllProjectsStatus} = $api.useQuery(
        "get",
        "/api/projects/all",
        {}
    )

    useEffect(() => {
        if (apiGetAllProjectsStatus == "success") {
            setAllProjects(apiGetAllProjectsData)
        }
    }, [apiGetAllProjectsData, apiGetAllProjectsStatus]);

    /////////////////////////////////////////////////////////////////////////
    // API Get all FilmFormats
    /////////////////////////////////////////////////////////////////////////

    const {data: apiFilmFormats, status: apiFilmFormatsStatus} = $api.useQuery(
        "get",
        "/api/filmformats",
        {}
    );

    useEffect(() => {
        if (apiFilmFormatsStatus == "success") {
            const collectionList: { label: string, value: string } [] = [];
            const formatList: FilmFormat[] = []
            apiFilmFormats.forEach(format => {
                collectionList.push({label: format.name, value: format.key})
                formatList.push(format)
            })
            const collection = createListCollection({items: collectionList})
            setFilmFormatCollection(collection);
            setAllFilmFormats(formatList)
        }
    }, [apiFilmFormats, apiFilmFormatsStatus]);

    /////////////////////////////////////////////////////////////////////////
    // API Get/Put Project Paths
    /////////////////////////////////////////////////////////////////////////

    const {
        data: apiAllPaths,
        status: apiAllPathsStatus
    } = $api.useQuery("get", "/api/project/allpaths", {staleTime: Infinity})

    useEffect(() => {
        if (apiAllPathsStatus == "success") {
            const new_paths: Map<string, ProjectPathEntry> = new Map()
            for (const name in apiAllPaths) {
                const path = apiAllPaths[name];
                new_paths.set(name, path!)
            }
            setcurrentPaths(new_paths)
            if (!initialPaths) setInitialPaths(new_paths)    // store initial value for possible revert
        }
    }, [apiAllPaths, apiAllPathsStatus, initialPaths]);


    const {mutate: apiPutProjectPathsMutate} = $api.useMutation(
        "put",
        "/api/project/path",
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
        // transmit all paths that are different from the one in the database
        currentPaths?.forEach((path) => {
            const initial = initialPaths?.get(path.name)
            if (initial && path.path !== initial?.path) {
                apiPutProjectPathsMutate({body: path})
                setIsDirty(true)
            }
        })
    }, [apiPutProjectPathsMutate, initialPaths, currentPaths])


    /////////////////////////////////////////////////////////////////////////
    // API Get/Put FilmData
    /////////////////////////////////////////////////////////////////////////

    const {
        data: apiGetFilmdata,
        status: apiGetFilmdataStatus
    } = $api.useQuery("get", "/api/project/filmdata", {staleTime: Infinity})

    useEffect(() => {
        if (apiGetFilmdataStatus == "success") {
            const filmdata = apiGetFilmdata as FilmData
            setCurrentFilmData(filmdata)
            if (!initialFilmData) setInitialFilmData(filmdata)
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
        if (currentFilmData) {
            apiPutFilmdataMutate({body: currentFilmData})
        }
        if (initialFilmData) {
            if (JSON.stringify(currentFilmData) !== JSON.stringify(initialFilmData))
                setIsDirty(true)
        }
    }, [apiPutFilmdataMutate, currentFilmData, initialFilmData])


    /////////////////////////////////////////////////////////////////////////
    // UI event Handlers
    /////////////////////////////////////////////////////////////////////////

    /**
     * This handler:
     *  - filters out any invalid project name characters from the input.
     *  - checks if the project name already exists in the database.
     *
     * @param event The event containing the current value of the input field.
     */
    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const name = event.target.value
        // eslint-disable-next-line no-control-regex
        const sanitizedName = name.replace(/[\u0000-\u001F\u007F-\u009F\\/:*?"<>|]/g, "")
        setCurrentProjectName(sanitizedName)

        // check if the name already exist and - if yes - output a warning
        let isdup = false;
        if (allProjects) {
            for (const pid in allProjects) {
                if (parseInt(pid) == projectId) continue // do not check name against the current project
                if (allProjects[pid] == sanitizedName) isdup = true;
            }
        }
        setWarnNameDuplicate(isdup)
    }

    /**
     * This handler checks if the current project Name is valid and if so tells the parent
     * ProjectSetup Component to send the name to the api
     */
    const handleNameOnBlur = () => {
        if (!allProjects) return;
        if (!currentProjectName) { // empty name
            return
        }
        if (!warnNameDuplicate) {
            // Send the new name to the database.
            // If successful the returned value will set the project name of the parent ProjectSetup component.
            apiPutProjectNameMutate({params: {query: {name: currentProjectName}}})
        }

    }

    /**
     * Handle changes to a path.
     *
     * @param path_string   The name of the path to change
     * @param path_entry    The new ProjectPathEntry with the changed path
     */
    const handlePathOnBlur = (path_string: string, path_entry: ProjectPathEntry) => {
        if (!currentPaths) return
        currentPaths.set(path_entry.name, {...path_entry, path: path_string})
        setcurrentPaths(new Map(currentPaths))
    }

    const handleRevertButton = () => {
        if (initialProjectName) setCurrentProjectName(initialProjectName)
        if (initialPaths) setcurrentPaths(initialPaths)
        if (initialFilmData) setCurrentFilmData(initialFilmData)
        setIsDirty(false)
    }

    const handleFilmFormatChange = (name: string | undefined) => {
        if (!name) return
        if (!currentFilmData) return

        allFilmFormats.forEach(format => {
            if (format.key === name) {
                // Update the filmData
                const newdata: FilmData = {...currentFilmData, format: format};
                setCurrentFilmData(newdata)

                // check if current fps is still in the list.
                // If no set it to the first value of the new framerates
                if (!format.framerates.includes(newdata.fps)) {
                    const newdata: FilmData = {...currentFilmData, fps: format.framerates[0]!};
                    setCurrentFilmData(newdata)
                }
            }
        })
    }


    /////////////////////////////////////////////////////////////////////////
    // Misc Effects
    /////////////////////////////////////////////////////////////////////////

    useEffect(() => {
        if (currentProjectName && !warnNameDuplicate) {
            props.onFinished(props.pageIndex, true)
        } else {
            props.onFinished(props.pageIndex, false)
        }
    }, [currentProjectName, warnNameDuplicate]);

    /**
     * Update the supported framerates state from the newly selected FilmFormat
     */
    useEffect(() => {
        if (!currentFilmData) return

        // update the framerates
        const list = currentFilmData.format.framerates.map((fps) => {
            return {label: fps.toString(), value: fps.toString()}
        })
        setFrameRateCollection(createListCollection({items: list}))
    }, [currentFilmData])

    /**
     * Set the dirty flag if the name, the paths or the data is different from the initial values.
     */
    useEffect(() => {
        let dirty = false
        if (currentProjectName !== initialProjectName) dirty = true
        if (JSON.stringify(currentFilmData) !== JSON.stringify(initialFilmData)) dirty = true
        if (currentPaths && initialPaths) {
            currentPaths.forEach((value) => {
                const initial = initialPaths?.get(value.name)
                if (initial) {
                    if (JSON.stringify(value) !== JSON.stringify(initial)) dirty = true
                }
            })
        }
        setIsDirty(dirty)
    }, [currentFilmData, currentPaths, currentProjectName, initialFilmData, initialPaths, initialProjectName])


    /////////////////////////////////////////////////////////////////////////
    // TSX Component
    /////////////////////////////////////////////////////////////////////////

    return (
        <HStack gap="0.5rem" alignItems="top" width="100%" padding={"1%"}>
            <ApiErrorDialog apiError={apiError} setApiError={(error) => setApiError(error)}/>
            <VStack flex={1}>
                <Card.Root variant="elevated" bg={"gray.500"} width={"100%"}>
                    <Card.Body>
                        <Field.Root required invalid={warnNameDuplicate}>
                            <Field.Label>
                                Project Name
                                {!currentProjectName && <Field.RequiredIndicator/>}
                            </Field.Label>
                            <Input placeholder={"New Project"}
                                   value={currentProjectName ?? ''}
                                   onBlur={() => (handleNameOnBlur())}
                                   onChange={(e) => handleNameChange(e)}/>
                            <Field.ErrorText>
                                Project '{currentProjectName}' already exists. Please choose a different name
                            </Field.ErrorText>
                        </Field.Root>
                        <Box flex={1}/>
                    </Card.Body>
                </Card.Root>
                <Card.Root variant="elevated" bg={"gray.500"} width={"100%"} height={"100%"}>
                    <Card.Header>
                        <Card.Title>Film Type</Card.Title>
                    </Card.Header>
                    <Card.Body>
                        <Stack gap="4" w="full">
                            <Select.Root value={(currentFilmData ? [currentFilmData.format.key,] : [])}
                                         onValueChange={(e) => handleFilmFormatChange(e.value[0])}
                                         collection={filmFormatCollection}>
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
                                        {filmFormatCollection.items.map((format) => (
                                            <Select.Item item={format} key={format.value}>
                                                {format.label}
                                                <Select.ItemIndicator/>
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Positioner>
                            </Select.Root>
                            <Select.Root value={(currentFilmData ? [currentFilmData.fps.toString()] : [])}
                                         onValueChange={(e) => {
                                             if (currentFilmData) {
                                                 const newdata = {...currentFilmData, fps: Number(e.value[0])}
                                                 setCurrentFilmData(newdata)
                                             }
                                         }}
                                         collection={frameRateCollection}>
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
                                        {frameRateCollection.items.map((rate) => (
                                            <Select.Item item={rate} key={rate.value}>
                                                {rate.label}
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
            </VStack>
            <VStack flex={"2"}>
                <Card.Root variant="elevated" bg={"gray.500"} width={"100%"} height={"100%"}>
                    <Card.Header>
                        <Card.Title>Project Description</Card.Title>
                    </Card.Header>
                    <Card.Body>
                        <Stack gap="4" w={"100%"} h={"100%"}>
                            <Field.Root>
                                <Field.Label>Date of Film</Field.Label>
                                <Input defaultValue={currentFilmData?.date} key={currentFilmData?.date}
                                       placeholder="e.g. June 1980"
                                       onBlur={(e) => {
                                           if (currentFilmData) {
                                               const newdata: FilmData = {...currentFilmData, date: e.target.value};
                                               setCurrentFilmData(newdata)
                                           }
                                       }}
                                />
                            </Field.Root>
                            <Field.Root>
                                <Field.Label>Author</Field.Label>
                                <Input defaultValue={currentFilmData?.author} key={currentFilmData?.author}
                                       placeholder="Alan Smithee"
                                       onBlur={(e) => {
                                           if (currentFilmData) {
                                               const newdata: FilmData = {...currentFilmData, author: e.target.value};
                                               setCurrentFilmData(newdata)
                                           }
                                       }}
                                />
                            </Field.Root>
                            <Field.Root>
                                <Field.Label>Description</Field.Label>
                                <Input defaultValue={currentFilmData?.description} key={currentFilmData?.description}
                                       placeholder="Summer Vacation"
                                       onBlur={(e) => {
                                           if (currentFilmData) {
                                               const newdata: FilmData = {
                                                   ...currentFilmData,
                                                   description: e.target.value
                                               };
                                               setCurrentFilmData(newdata)
                                           }
                                       }}
                                />
                            </Field.Root>
                            <Field.Root>
                                <Field.Label>Tags</Field.Label>
                                <Input placeholder="Not implemented"/>
                            </Field.Root>
                            <Box flex={"1"}/>
                        </Stack>
                    </Card.Body>
                </Card.Root>
            </VStack>
            <VStack flex={"1"}>
                <Card.Root variant="elevated" bg={"gray.500"} width={"100%"}>
                    <Card.Header>
                        <Card.Title>Server storage paths</Card.Title>
                    </Card.Header>
                    <Card.Body>
                        <Stack gap="4" w="full">
                            {currentPaths ? [...currentPaths.values()].map((path) =>
                                <Field.Root key={path.name}>
                                    <Field.Label>
                                        {path.description}
                                    </Field.Label>
                                    <Input defaultValue={path.path} key={path.name}
                                           onBlur={(e) => (handlePathOnBlur(e.target.value, path))}
                                    />
                                    <Field.HelperText>{path.resolved}</Field.HelperText>
                                </Field.Root>
                            ) : <Box/>}
                            <Box flex={1}/>
                        </Stack>
                    </Card.Body>
                </Card.Root>
                <Button width="100%"
                        disabled={!isDirty}
                        onClick={handleRevertButton}>
                    Revert to last stored Data
                </Button>
            </VStack>
        </HStack>
    )
}
