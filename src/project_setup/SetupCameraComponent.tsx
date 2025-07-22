import {useQueryClient} from "@tanstack/react-query";
import {ApiErrorDialog} from "../common_components/api_error_dialog.tsx";
import ProjectImageSetupPage from "./image_setup_page.tsx";
import {useCallback, useEffect, useState} from "react";
import {$api, ApiError} from "../api.ts";
import {BacklightController} from "../hardware_setup/types.ts";
import {Box, Button, Card, Field, HStack, NumberInput, Slider, VStack, NativeSelect} from "@chakra-ui/react";
import {SetupPageProps} from "./project_setup.tsx";
import {throttle} from "../common_components/throttle.ts";
import {CameraControls} from "./types.ts";
import * as React from "react";

enum ExposureUnit {
    PwmCycles = 0,
    Millis = 1,
    Fraction,
}

export function SetupCameraComponent({onValidStateChange}: SetupPageProps) {

    useQueryClient();

    /** The last error message from the backend API. Valid until the next API call **/
    const [apiError, setApiError] = useState<ApiError | null>(null);

    const [cameraControls, setCameraControls] = useState<CameraControls | null>(null)
    const [initialCameraControls, setInitialCameraControls] = useState<CameraControls | null>(null)

    const [backlightBrightness, setBacklightBrightness] = useState<number>(0)
    const [pwmFrequency, setPwmFrequency] = useState<number>(300)

    const [aeLoading, setAeLoading] = useState<boolean>(false)

    const [exposureValue, setExposureValue] = useState<number>(2)
    const [exposureUnit, setExposureUnit] = useState<ExposureUnit>(ExposureUnit.PwmCycles)

    /////////////////////////////////////////////////////////////////////////
    // API Get/Put Backlight parameters
    /////////////////////////////////////////////////////////////////////////

    const {data: apiGetBacklight, status: apiGetBacklightStatus} = $api.useQuery(
        "get",
        "/api/hardware/backlight"
    );

    useEffect(() => {
        if (apiGetBacklightStatus == "success") {
            const blc = apiGetBacklight as BacklightController
            setPwmFrequency(blc.frequency)
            setBacklightBrightness(blc.dutycycle)
        }
    }, [apiGetBacklight, apiGetBacklightStatus]);

    const {mutate: apiPutBacklight} = $api.useMutation(
        "put",
        "/api/hardware/backlight",
        {
            onError: (error) => {
                setApiError(error as ApiError)
            },
        }
    );

    useEffect(() => {
        const call_api = throttle(() => {
            apiPutBacklight({
                params: {
                    query: {
                        dutycycle: backlightBrightness,
                    }
                }
            })
        }, 200)
        call_api()
    }, [apiPutBacklight, backlightBrightness]);

    /////////////////////////////////////////////////////////////////////////
    // API Get/Put Camera Controls
    /////////////////////////////////////////////////////////////////////////

    const {data: apiGetControls, status: apiGetControlsStatus} = $api.useQuery(
        "get",
        "/api/camera/controls"
    );

    useEffect(() => {
        if (apiGetControlsStatus == "success") {
            const blc = apiGetControls as CameraControls
            setCameraControls(blc)
            if (initialCameraControls == null)
                setInitialCameraControls(blc)
        }
    }, [apiGetControls, apiGetControlsStatus, initialCameraControls]);

    const {mutate: apiPutCameraControls} = $api.useMutation(
        "put",
        "/api/camera/controls",
        {
            onError: (error) => {
                setApiError(error as ApiError)
            },
        }
    );

    useEffect(() => {
        const call_api = throttle(() => {
            if (cameraControls !== null) {
                apiPutCameraControls({body: cameraControls})
            }
        }, 200)
        call_api()
    }, [apiPutCameraControls, cameraControls]);

    /////////////////////////////////////////////////////////////////////////
    // API Get AutoExposure values
    /////////////////////////////////////////////////////////////////////////

    const {mutate: apiGetAutoexposureMutate} = $api.useMutation(
        "get",
        "/api/camera/autoexposure",
        {
            onError: async (error) => {
                if (error instanceof ApiError) {
                    setApiError(error)
                } else {
                    console.error(error)
                }
            },
            onSuccess: async (controls) => {
                // update the controls
                setAeLoading(false)
                setCameraControls(controls)
            }
        }
    );

    const handleAutoExposure = () => {
        setAeLoading(true)
        apiGetAutoexposureMutate({params: {query: {}}})
    }

    const handleExposureChange = useCallback((value: number) => {
        let result: number

        if (value === undefined || cameraControls === null) return
        switch (exposureUnit) {
            case ExposureUnit.PwmCycles:
                result = value * (1_000_000 / pwmFrequency)
                break
            case ExposureUnit.Millis:
                result = value * 1_000.0
                break
            case ExposureUnit.Fraction:
                result = 1_000_000 / value
                break
        }
        setExposureValue(value)
        setCameraControls({...cameraControls, exposure_time: result})
    }, [cameraControls, exposureUnit, pwmFrequency])

    useEffect(() => {
        if (cameraControls?.exposure_time)
            if (exposureUnit === ExposureUnit.PwmCycles)
                setExposureValue(Math.round(cameraControls.exposure_time / (1_000_000 / pwmFrequency)))
            else if (exposureUnit === ExposureUnit.Millis)
                setExposureValue(cameraControls.exposure_time / 1_000.0)
            else if (exposureUnit === ExposureUnit.Fraction)
                setExposureValue(1_000_000 / cameraControls.exposure_time)
    }, [cameraControls, exposureUnit, pwmFrequency]);


    return (
        <ProjectImageSetupPage>
            {apiError !== null && <ApiErrorDialog apiError={apiError} onDialogClose={() => setApiError(null)}/>}
            <VStack alignItems="left" height={"100%"}>
                <Card.Root>
                    <Card.Title>Exposure</Card.Title>
                    <Card.Body>
                        <Button loading={aeLoading} onClick={handleAutoExposure}>Auto Exposure</Button>
                        <NumberInput.Root value={exposureValue.toString()}
                                          onValueChange={(e) => handleExposureChange(parseFloat(e.value))}
                                          min={1}
                                          max={1000}
                                          step={1}
                                          width="100%"
                                          disabled={aeLoading}
                                          required={true}
                        >
                            <NumberInput.Label>Exposure Time</NumberInput.Label>
                            <NumberInput.Control/>
                            <NumberInput.Input/>
                        </NumberInput.Root>
                        <NativeSelect.Root>
                            <NativeSelect.Field
                                value={exposureUnit}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    if (e.target.value === undefined) return
                                    const value = parseInt(e.target.value)
                                    if (value === ExposureUnit.PwmCycles) setExposureUnit(ExposureUnit.PwmCycles)
                                    else if (value === ExposureUnit.Millis) setExposureUnit(ExposureUnit.Millis)
                                    else if (value === ExposureUnit.Fraction) setExposureUnit(ExposureUnit.Fraction)
                                }}
                            >
                                <option value={ExposureUnit.PwmCycles}>PWM Cycles</option>
                                <option value={ExposureUnit.Millis}>Milliseconds</option>
                                <option value={ExposureUnit.Fraction}>Fraction of second</option>
                            </NativeSelect.Field>
                        </NativeSelect.Root>

                        <Field.Root width="100%">
                            <Field.Label>Brightness</Field.Label>
                            <HStack width="100%">
                                <Slider.Root width="100%"
                                             value={backlightBrightness ? [backlightBrightness] : [0]}
                                             onValueChange={(e) => {
                                                 if (e.value[0] !== undefined) {
                                                     setBacklightBrightness(e.value[0])
                                                 }
                                             }}>
                                    <Slider.Control>
                                        <Slider.Track>
                                            <Slider.Range/>
                                        </Slider.Track>
                                        <Slider.Thumbs/>
                                    </Slider.Control>
                                </Slider.Root>
                                <Box minW="4em">
                                    {backlightBrightness !== null ?
                                        backlightBrightness.toString().padStart(3, "\xa0") + "%" :
                                        "\xa0\xa00%"}
                                </Box>
                            </HStack>
                        </Field.Root>
                    </Card.Body>
                </Card.Root>
            </VStack>
        </ProjectImageSetupPage>
    )
        ;
}

/**

 type CustomSliderProps = {
 title: string,
 value: number,
 valueFormat: string,
 min: number,
 max: number,
 onValueChange: (value: number) => void,
 }

 const CustomSlider = ({title, value, valueFormat = "{value}", min, max, onValueChange}: CustomSliderProps) => {

 const [realValue, setRealValue] = useState<number>(value)

 const handleValueChange = (e) => {
 const percentage = e.value[0]
 const value = percentageToRealValue(percentage)
 setRealValue(value)
 onValueChange(value)
 }

 const realValueToPercentage = (realValue: number) => {
 return ((realValue - min) / (max - min)) * 100.0
 }

 const percentageToRealValue = (percentage: number) => {
 return (percentage / 100.0) * (max - min) + min
 }

 return (
 <VStack width="100%">
 <HStack>
 <Text>{title}</Text>
 <Text>{valueFormat.replace("{value}", realValue.toString())}</Text>
 </HStack>
 <Slider.Root width="100%"
 value={[realValueToPercentage(realValue)]}
 onValueChange={handleValueChange}>
 <Slider.Control>
 <Slider.Track>
 <Slider.Range/>
 </Slider.Track>
 <Slider.Thumbs/>
 </Slider.Control>
 </Slider.Root>
 </VStack>
 )
 }

 **/