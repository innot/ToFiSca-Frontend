import {StrictMode} from "react";

import {ChakraProvider, defaultSystem} from "@chakra-ui/react";
import App from "./App";
import {createRoot} from "react-dom/client";

async function enableMocking() {

    console.info(`NODE_ENV=${process.env.NODE_ENV}`);

    if (process.env.NODE_ENV !== 'development') {
        return
    }

    const {server} = await import('./mocks/browser')

    // `worker.start()` returns a Promise that resolves
    // once the Service Worker is up and ready to intercept requests.
    console.info(`starting mock server...`)
    return server.start()
}

enableMocking().then(() => {
    createRoot(document.getElementById('root') as HTMLElement).render(
        <StrictMode>
            <ChakraProvider value={defaultSystem}>
                <App/>
            </ChakraProvider>
        </StrictMode>
    );
})
