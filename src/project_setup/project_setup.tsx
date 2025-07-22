import {Box, Center, For, Heading, Tabs, Text, VStack} from "@chakra-ui/react";
import {JSX, useCallback, useMemo, useState} from "react";
// import {ErrorBoundary} from "react-error-boundary";
import {useQueryClient} from "@tanstack/react-query";
import ProjectImageSetupPage, {ImageOverlay} from "./image_setup_page.tsx";
import ReferencePointPage from "./reference_point_page.tsx";
import ScanAreaPage from "./scan_area_page.tsx";
import ProjectSettingsPage from "./project_settings_page.tsx";
import {LuCircleCheck, LuCircleX} from "react-icons/lu";
import {SetupCameraComponent} from "./SetupCameraComponent.tsx";

export interface SetupPageProps {
    onValidStateChange: (valid: boolean) => void;
}

export default function ProjectSetup() {

    useQueryClient();

    /** The name of the active project */
    const [projectName, setProjectName] = useState<string>("")

    const [tabValid, setTabValid] = useState<boolean[]>(Array(5).fill(false))

    const handleValidStateChange = useCallback((tabIndex: number, valid: boolean) => {
        if (tabValid[tabIndex] === valid) return
        tabValid[tabIndex] = valid
        setTabValid(tabValid.slice())
    }, [tabValid])

    const items: { title: string, description: string, element: JSX.Element }[] = useMemo(() => [
        {
            title: "General",
            description: "General Setup and Film Data",
            element:
                <ProjectSettingsPage
                    onProjectNameChange={(name: string) => setProjectName(name)}
                    onValidStateChange={(valid: boolean) => handleValidStateChange(0, valid)}
                />
        },
        {
            title: "Camera",
            description: "Adjust Camera Settings and White Balance",
            element: <SetupCameraComponent
                onValidStateChange={(valid: boolean) => handleValidStateChange(1, valid)}/>,
        },
        {
            title: "Focus",
            description: "Adjust Frame & Focus",
            element: <TestPage/>,
        },
        {
            title: "Perforation",
            description: "Locate Perforation Hole",
            element: <ReferencePointPage
                onValidStateChange={(valid: boolean) => handleValidStateChange(3, valid)}/>
        },
        {
            title: "Scan Area",
            description: "Adjust the Area to Scan",
            element: <ScanAreaPage
                onValidStateChange={(valid: boolean) => handleValidStateChange(4, valid)}/>
        },
    ], [handleValidStateChange])


    return (
        <VStack id="test" h="full">
            <Heading>
                {projectName ? <span style={{"color": "aqua"}}>{projectName}</span>
                    : <span style={{"color": "orange"}}>Unnamed</span>}
                &nbsp; Project Setup
            </Heading>
            <Box width="100%" height="100%">
                <Tabs.Root lazyMount={true} defaultValue={items[0]?.title}>
                    <Tabs.List>
                        <For each={items}>
                            {(item, index) =>
                                <Tabs.Trigger value={item.title} key={index}>
                                    {tabValid[index] ? <LuCircleCheck color="lightgreen"/> :
                                        <LuCircleX color="red"/>}
                                    {item.title}
                                </Tabs.Trigger>
                            }
                        </For>
                    </Tabs.List>
                    <For each={items}>
                        {(item, index) =>
                            <Tabs.Content value={item.title} key={index} bg={"gray.800"}>
                                <Center><Heading>{item.description}</Heading></Center>
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


