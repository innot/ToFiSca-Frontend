import {Box, Center, For, Heading, Tabs, Text, useSteps, VStack} from "@chakra-ui/react";
import ProjectImageSetupPage, {ImageOverlay} from "./image_setup_page.tsx";
import ReferencePointPage from "./reference_point_page.tsx";
import {useEffect, useState} from "react";
import ScanAreaPage from "./scan_area_page.tsx";
import ProjectSettingsPage from "./project_settings_page.tsx";
import {useQueryClient} from "@tanstack/react-query";
import {ApiError} from "../api.ts";
import {ApiErrorDialog} from "../common_components/api_error_dialog.tsx";
import {ErrorBoundary} from "react-error-boundary";

export interface SetupPageProps {
    currentPage: number;
    pageIndex: number;
    onFinished: (stepNumber: number, state: boolean) => void;
}

export default function ProjectSetup() {

    useQueryClient();

    /** The last error message from the backend API. Valid until cleared in the error dialog **/
    const [apiError, setApiError] = useState<ApiError | null>(null);

    /** The name of the active project */
    const [projectName, setProjectName] = useState<string>("")

    const [pageState, setPageState] = useState<boolean[]>([])

    const [currentStep, setCurrentStep] = useState<number>(0)


    const handlePageFinished = (step: number, state: boolean) => {
        const newState = [...pageState];
        newState[step] = state;
        setPageState(newState)
    }

    useEffect(() => {

    }, [])

    const items = [
        {
            title: "General",
            description: "General Setup and Film Data",
            element: <ProjectSettingsPage onProjectNameChange={(name: string) => setProjectName(name)}
                                          currentPage={currentStep}
                                          pageIndex={0}
                                          onFinished={(idx, state) => handlePageFinished(idx, state)}/>,
        },
        {
            title: "White Balance",
            description: "Generate white balance adjustments",
            element: <ProjectImageSetupPage/>,
        },
        {
            title: "Focus",
            description: "Adjust Frame & Focus",
            element: <TestPage/>,
        },
        {
            title: "Camera",
            description: "Adjust Camera Settings",
            element: <Heading>General</Heading>,
        },
        {
            title: "Perforation",
            description: "Locate Perforation Hole",
            element: <ReferencePointPage currentPage={currentStep}
                                         pageIndex={4}
                                         onFinished={(idx, state) => handlePageFinished(idx, state)}/>,
        },
        {
            title: "Scan Area",
            description: "Adjust the Area to Scan",
            element: <ScanAreaPage currentPage={currentStep}
                                   pageIndex={5}
                                   onFinished={(idx, state) => handlePageFinished(idx, state)}/>,
        },
    ]

    const steps = useSteps({
        defaultStep: 0,
        count: items.length,
        linear: false,
    })


    useEffect(() => {
        setPageState(new Array<boolean>(items.length).fill(false))
    }, [items.length]); // called only once on initial render

    return (
        <VStack id="test" h="full">
            <ApiErrorDialog apiError={apiError} setApiError={() => setApiError(null)}/>
            <ErrorBoundary fallback={<div>Problem here</div>}>
                <Heading>
                    {projectName ? <span style={{"color": "aqua"}}>{projectName}</span>
                        : <span style={{"color": "orange"}}>Unnamed</span>}
                    &nbsp; Project Setup
                </Heading>
            </ErrorBoundary>
            <Box width="100%" height="100%">
                <Tabs.Root lazyMount={true} defaultValue={items[0]?.title}>
                    <Tabs.List>
                        <For each={items}>
                            {(item, index) =>
                                <Tabs.Trigger value={item.title} key={index}>
                                    {item.title}
                                </Tabs.Trigger>
                            }
                        </For>
                    </Tabs.List>
                    <For each={items}>
                        {(item, index) =>
                            <Tabs.Content value={item.title} key={index} bg={"gray.800"}>
                                <Center><Heading >{item.description}</Heading></Center>
                                {item.element}
                            </Tabs.Content>
                        }
                    </For>
                </Tabs.Root>
            </Box>
            <Box h="full"/>
        </VStack>
    )
}

const TestPage = () => {

    return (
        <ProjectImageSetupPage>
            <ImageOverlay>
                <Text>Ein Test</Text>
            </ImageOverlay>
        </ProjectImageSetupPage>
    )
}


