import {Container, Field, HStack, Input, VStack} from "@chakra-ui/react";
import {ReactNode, useEffect, useState} from "react";
import {$api} from "../api.ts";


function Hightlight(props: { query: string, children: ReactNode }) {
    return null;
}

export default function ProjectSettingsPage() {

    const [projectName, setProjectName] = useState<string>("");
    const [allProjects, setAllProjects] = useState<{ [key: string]: string; }>();
    const [warnNameDuplicate, setWarnNameDuplicate] = useState<boolean>(false);

    /////////////////////////////////////////////////////////////////////////
    // API Calls
    /////////////////////////////////////////////////////////////////////////

    /**
     * Get the names of all existing projects.
     * Used for checking for duplicate names
     */
    const apiGetAllProjects = $api.useQuery(
        "get",
        "/api/allprojects"
    )

    useEffect(() => {
        if (apiGetAllProjects.isSuccess) {
            setAllProjects(apiGetAllProjects.data)
        }
    }, [apiGetAllProjects, apiGetAllProjects.isSuccess]);

    /**
     * Get the Project Name from the backend.
     */
    const apiGetProjectName = $api.useQuery(
        "get",
        "/api/project/name",
    );

    useEffect(() => {
        if (apiGetProjectName.isSuccess) {
            setProjectName(apiGetProjectName.data.name)
        }
    }, [apiGetProjectName.data, apiGetProjectName.isSuccess]);

    const apiPutProjectName = $api.useMutation(
        "put",
        "/api/project/name"
    )

    const sendProjectName = () => {
        apiPutProjectName.mutate({body: projectName})
    }

    useEffect(() => {
        if (!allProjects) return;
        setWarnNameDuplicate(projectName in allProjects)
    }, [projectName, allProjects]);

    return (
        <HStack gap="0.5rem">
            <VStack gap="0.5rem">
                <Field.Root required>
                    <Field.Label>
                        Project Name
                        {!projectName && <Field.RequiredIndicator/>}
                    </Field.Label>
                    <Input placeholder={"New Project"}
                           value={projectName}
                           onBlur={() => (sendProjectName())}
                           onChange={(e) => setProjectName(e.target.value)}/>
                    {warnNameDuplicate ?
                        <Field.ErrorText>
                            <Hightlight query={projectName}>
                                Project '{projectName}' already exists. Please choose a different name
                            </Hightlight>
                        </Field.ErrorText> : <div/>}
                </Field.Root>
                <Field.Root required>
                    <Field.Label>
                        Project Name
                        <Field.RequiredIndicator/>
                    </Field.Label>
                    <Input placeholder={"New Project"}/>
                </Field.Root>
            </VStack>
            <Container gap="0.5rem" flex={1}></Container>
        </HStack>
    )
}