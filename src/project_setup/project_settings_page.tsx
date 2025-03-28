import {Box, Button, Card, createListCollection, Field, HStack, Input, Portal, Select, Stack} from "@chakra-ui/react";
import {useEffect, useState} from "react";
import {$api, ApiError} from "../api.ts";
import {ApiErrorDialog} from "./api_error_dialog.tsx";
import {useQueryClient} from "@tanstack/react-query";
import {SetupPageProps} from "./project_setup.tsx";

export interface Props extends SetupPageProps {
    name: string;
    projectId: number
    onProjectNameChange: (name: string) => void;
}

const FilmFormatFrameRates: { [name: string]: number[] } = {
    "Super8": [18, 24],
    "Normal8": [16, 18, 24, 25],
    "16mm": [24],
    "Other": [16, 18, 24, 25, 30, 48, 60]
}

export default function ProjectSettingsPage(props: Props) {

    useQueryClient();

    const [projectName, setProjectName] = useState<string>(props.name);
    const [allProjects, setAllProjects] = useState<{ [key: string]: number; }>();
    const [warnNameDuplicate, setWarnNameDuplicate] = useState<boolean>(false);


    const [filmFormat, setFilmFormat] = useState<string[]>(["Super8"]);
    const [filmFps, setFilmFps] = useState<string[]>(["18"]);

    /** The last error message from the backend API. Valid until the next API call **/
    const [apiError, setApiError] = useState<ApiError|null>(null);


    /////////////////////////////////////////////////////////////////////////
    // API Calls
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

    /**
     * Get the Project Name from the backend.
     */

    useEffect(() => {
        if (!allProjects) return;
        const isdup = (projectName in allProjects) && (allProjects[projectName] != props.projectId)
        if (isdup) {
            setWarnNameDuplicate(isdup)
            // props.onFinished(props.pageIndex, false)
        } else {
            // Tell the parent about the new name - it will send it to the api
        }
    }, [allProjects, projectName, props.projectId]);

    /**
     * This handler checks if the current project Name is valid and if so tells the parent
     * ProjectSetup Component to send the name to the api
     */
    const handleOnBlur = () => {
        if (!allProjects) return;
        const isdup = (projectName in allProjects) && (allProjects[projectName] != props.projectId)
        if (!isdup) {
            props.onProjectNameChange(projectName)
            props.onFinished(props.pageIndex, true)
        }
    }

    return (
        <HStack gap="0.5rem" alignItems="top" width="100%" padding={"1%"}>
            <ApiErrorDialog apiError={apiError} setApiError={(error) => setApiError(error)}/>
            <Card.Root flex={1} variant="elevated" bg={"gray.500"}>
                <Card.Header>
                    <Card.Title>Project Data</Card.Title>
                </Card.Header>
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
                    <Box flex={1}/>
                    <Button flex={"flex-end"}
                            disabled={true}>
                        Revert to last stored Position
                    </Button>
                </Card.Body>
            </Card.Root>
            <Card.Root flex={2} variant="elevated" bg={"gray.500"}>
                <Card.Header>
                    <Card.Title>Project Description</Card.Title>
                </Card.Header>
                <Card.Body>
                    <Stack gap="4" w="full">
                        <Field.Root>
                            <Field.Label>Date of Film</Field.Label>
                            <Input/>
                        </Field.Root>
                        <Field.Root>
                            <Field.Label>Author</Field.Label>
                            <Input variant={"subtle"}/>
                        </Field.Root>
                        <Field.Root>
                            <Field.Label>Description</Field.Label>
                            <Input/>
                        </Field.Root>
                        <Field.Root>
                            <Field.Label>Tags</Field.Label>
                            <Input/>
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
                        <Select.Root variant="subtle"
                                     value={filmFormat}
                                     onValueChange={(e) => setFilmFormat(e.value)}
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
                            <Portal>
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
                            </Portal>
                        </Select.Root>
                        <Select.Root variant="subtle"
                                     value={filmFps}
                                     onValueChange={(e) => setFilmFps(e.value)}
                                     collection={framerateCollection(filmFormat)}>
                            <Select.Label>Frames per Second</Select.Label>
                            <Select.Control>
                                <Select.Trigger>
                                    <Select.ValueText/>
                                </Select.Trigger>
                                <Select.IndicatorGroup>
                                    <Select.Indicator/>
                                </Select.IndicatorGroup>
                            </Select.Control>
                            <Portal>
                                <Select.Positioner>
                                    <Select.Content>
                                        {framerateCollection(filmFormat).items.map((name) => (
                                            <Select.Item item={name} key={name.value}>
                                                {name.label}
                                                <Select.ItemIndicator/>
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Positioner>
                            </Portal>
                        </Select.Root>
                        <Field.Root>
                            <Field.Label>Film Stock Material</Field.Label>
                            <Input/>
                        </Field.Root>
                    </Stack>
                </Card.Body>
            </Card.Root>
        </HStack>
    )
}


const formatCollection = () => {
    const list = [];
    for (const [name] of Object.entries(FilmFormatFrameRates)) {
        list.push({label: name, value: name})
    }
    return createListCollection({items: list})
}

const framerateCollection = (formats: string[]) => {
    const list: { label: string; value: number; }[] = [];
    formats.forEach(format => {
        if (format in FilmFormatFrameRates) {
            const rates = FilmFormatFrameRates[format];
            rates?.forEach(rate => {
                list.push({label: rate.toString(), value: rate})
            })
        }
    })
    return createListCollection({items: list})
}