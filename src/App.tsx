import {Container, Theme} from "@chakra-ui/react";
import ProjectSetup from "./project_setup/project_setup.tsx";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false
        }
    }
});


export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Theme appearance="dark">
                <Container fluid={true}>
                    <ProjectSetup></ProjectSetup>
                </Container>
            </Theme>
        </QueryClientProvider>
    );
}
