import {useQueryClient} from "@tanstack/react-query";
import {ApiErrorDialog} from "../common_components/api_error_dialog.tsx";
import * as React from "react";
import ProjectImageSetupPage from "./image_setup_page.tsx";
import {useState} from "react";
import {ApiError} from "../api.ts";

export function SetupCameraComponent() {

    useQueryClient();

    /** The last error message from the backend API. Valid until the next API call **/
    const [apiError, setApiError] = useState<ApiError | null>(null);


    return (
        <ProjectImageSetupPage>
            <ApiErrorDialog apiError={apiError} setApiError={(error) => setApiError(error)}/>
        </ProjectImageSetupPage>
    );
}