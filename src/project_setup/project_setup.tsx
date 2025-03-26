import {Box, Button, ButtonGroup, Heading, Steps, Text, useSteps, VStack} from "@chakra-ui/react";
import ProjectImageSetupPage, {ImageOverlay} from "./image_setup_page.tsx";
import ReferencePointPage from "./reference_point_page.tsx";
import {useEffect, useState} from "react";
import ScanAreaPage from "./scan_area_page.tsx";
import ProjectSettingsPage from "./project_settings_page.tsx";

export interface SetupPageProps {
    pageIndex: number;
    onFinished?: (stepNumber: number, state: boolean) => void;
}

export default function ProjectSetup() {

    const [pageState, setPageState] = useState<boolean[]>([])

    const handlePageFinished = (step: number, state: boolean) => {
        const newState = [...pageState];
        newState[step] = state;
        setPageState(newState)
    }

    const items = [
        {
            title: "General",
            description: "General Setup and Image storage paths",
            element: <ProjectSettingsPage/>,
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
            element: <ReferencePointPage pageIndex={4} onFinished={handlePageFinished}/>,
        },
        {
            title: "Scan Area",
            description: "Adjust the Area to Scan",
            element: <ScanAreaPage pageIndex={5} onFinished={handlePageFinished}/>,
        },
    ]

    const steps = useSteps({
        defaultStep: 0,
        count: items.length,
        linear: false,
    })

    /**
     const [setupState, setSetupState] = useState(null)

     useEffect(() => {
     const getState = async () => {
     const state = await getProjectSetupState();

     }

     });
     **/

    useEffect(() => {
        setPageState(new Array<boolean>(items.length).fill(false))
    }, [items.length]); // called only once on initial render




    return (
        <VStack id="test">
            <Steps.RootProvider value={steps} gap="0.5rem">
                <Steps.List>
                    {items.map((step, index) => (
                        <Steps.Item key={index} index={index} title={step.title}>
                            <Steps.Trigger>
                                <Steps.Indicator/>
                                <Steps.Title>{step.title}</Steps.Title>
                                <Steps.Separator/>
                            </Steps.Trigger>
                        </Steps.Item>
                    ))}
                </Steps.List>
                <ButtonGroup size="sm" variant="solid">
                    <Steps.PrevTrigger asChild>
                        <Button>Prev</Button>
                    </Steps.PrevTrigger>
                    {items.map((step, index) => (
                        <Steps.Content key={index} index={index} width="100%">
                            <VStack bg={"gray.800"} paddingTop="0.3em" paddingBottom="0.3em">
                                <Heading>{step.description}</Heading>
                            </VStack>
                        </Steps.Content>
                    ))}
                    <Steps.NextTrigger asChild>
                        <Button disabled={!pageState[steps.value]}>Next</Button>
                    </Steps.NextTrigger>
                </ButtonGroup>

                {items.map((step, index) => (
                    <Steps.Content key={index} index={index}>
                        <Box width="100%" height="100%" bg={"gray.600"}>
                            {step.element}
                        </Box>
                    </Steps.Content>
                ))}
                <Steps.CompletedContent>
                    <VStack bg={"gray.800"}>
                        <Heading>Project Set up complete</Heading>
                    </VStack>
                </Steps.CompletedContent>

            </Steps.RootProvider>
            { /* filler */}
            <Box flex={1}></Box>
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


