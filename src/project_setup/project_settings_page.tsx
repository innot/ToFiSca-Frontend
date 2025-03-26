import {Container, Field, HStack, Input, VStack} from "@chakra-ui/react";
import {useEffect, useState} from "react";
import {$api} from "../api.ts";


export default function ProjectSettingsPage() {

    const [projectName, setProjectName] = useState<string>("");
    const [allProjects, setAllProjects] = useState<{ [key: string]: number; }>();
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
            if (apiGetProjectName.data == null) {
                console.error(apiGetProjectName.data);
            }
            setProjectName(apiGetProjectName.data.name)
        }
    }, [apiGetProjectName.data, apiGetProjectName.isSuccess]);

    const apiPutProjectName = $api.useMutation(
        "put",
        "/api/project/name"
    )

    const sendProjectName = () => {
        if(warnNameDuplicate) return;
        apiPutProjectName.mutate({body: projectName})
        console.log(`Send project name ${projectName}`)
    }

    useEffect(() => {
        if (!allProjects) return;
        setWarnNameDuplicate(projectName in allProjects)
    }, [projectName, allProjects, warnNameDuplicate]);

    return (
        <HStack gap="0.5rem">
            <VStack gap="0.5rem">
                <Field.Root required invalid={warnNameDuplicate}>
                    <Field.Label>
                        Project Name
                        {!projectName && <Field.RequiredIndicator/>}
                    </Field.Label>
                    <Input placeholder={"New Project"}
                           value={projectName ?? ''}
                           onBlur={() => (sendProjectName())}
                           onChange={(e) => setProjectName(e.target.value)}/>
                        <Field.ErrorText >
                            Project <em>'{projectName}'</em> already exists. Please choose a different name
                        </Field.ErrorText>
                </Field.Root>
            </VStack>
            <Container gap="0.5rem" flex={1}></Container>
        </HStack>
    )
}