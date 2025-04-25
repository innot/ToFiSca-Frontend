import {
    Box,
    Card,
    createListCollection,
    Field,
    Heading,
    HStack,
    ListCollection,
    NumberInput,
    SegmentGroup,
    Select,
    Slider,
    Span,
    Stack,
    Switch,
    VStack
} from "@chakra-ui/react";
import {useEffect, useState} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {$api, ApiError} from "../api.ts";
import {ApiErrorDialog} from "../common_components/api_error_dialog.tsx";
import {throttle} from "../common_components/throttle.ts";
import {BacklightController} from "./types.ts"


export default function HardwareSetup() {

    useQueryClient();

    const [allGPIOCollection, setAllGPIOCollection] = useState<ListCollection>(createListCollection({items: [] as undefined[]}));

    const [backlightController, setBacklightController] = useState<BacklightController | null>(null)
    const [initialBacklightController, setInitialBacklightController] = useState<BacklightController | null>(null)


    /** The last error message from the backend API. Valid until cleared in the error dialog **/
    const [apiError, setApiError] = useState<ApiError | null>(null);

    /////////////////////////////////////////////////////////////////////////
    // API Get list of available GPIOs
    /////////////////////////////////////////////////////////////////////////

    const {data: apiAllGPIOs, status: apiAllGPIOsStatus} = $api.useQuery(
        "get",
        "/api/hardware/allgpios"
    );

    useEffect(() => {
        if (apiAllGPIOsStatus == "success") {
            const collectionList: { label: string, value: string, description: string } [] = [];
            apiAllGPIOs.forEach(pin => {
                const label = "GPIO" + pin.gpio.toString() + (pin.hardware_pwm ? " (Hardware PWM)" : "");
                const value = pin.gpio.toString();
                const description = pin.assigned_to ? "Assigned to: " + pin.assigned_to : "Free";
                collectionList.push({label: label, value: value, description: description})
            })
            const collection = createListCollection({items: collectionList})
            setAllGPIOCollection(collection);
        }
    }, [apiAllGPIOs, apiAllGPIOsStatus]);

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
            setBacklightController(blc)
            if (initialBacklightController == null)
                setInitialBacklightController(blc)
        }
    }, [apiGetBacklight, apiGetBacklightStatus, initialBacklightController]);

    const {mutate: apiPutBacklightMutate} = $api.useMutation(
        "put",
        "/api/hardware/backlight",
        {
            onError: async (error) => {
                if (error instanceof ApiError) {
                    setApiError(error)
                } else {
                    console.error(error)
                }
            },
        }
    )

    useEffect(() => {
        // Throttle api calls to 5 per second
        const call_api = throttle(() => {
            if (backlightController !== null) {
                apiPutBacklightMutate({
                    params: {
                        query: {
                            gpio: backlightController.gpio,
                            invert: backlightController.invert,
                            frequency: backlightController.frequency,
                            dutycycle: backlightController.dutycycle,
                            enable: backlightController.enable,
                        }
                    }
                })
            }
        }, 200)
        call_api()
    }, [apiPutBacklightMutate, backlightController]);

    return (
        <VStack id="test" h="full">
            <ApiErrorDialog apiError={apiError} setApiError={() => setApiError(null)}/>
            <Heading>Hardware Setup</Heading>
            <Card.Root width="100%" bg="gray.500">
                <Card.Title>Backlight</Card.Title>
                <Card.Body gap="2">
                    <Field.Root width="100%">
                        <Field.Label>GPIO Pin</Field.Label>
                        <Select.Root value={(backlightController ? [backlightController.gpio.toString()] : [])}
                                     onValueChange={(e) => {
                                         if (backlightController) {
                                             const newdata = {
                                                 ...backlightController,
                                                 gpio: Number(e.value[0])
                                             }
                                             setBacklightController(newdata)
                                         }
                                     }}
                                     collection={allGPIOCollection}>
                            <Select.Control>
                                <Select.Trigger>
                                    <Select.ValueText/>
                                </Select.Trigger>
                                <Select.IndicatorGroup>
                                    <Select.Indicator/>
                                </Select.IndicatorGroup>
                            </Select.Control>
                            <Select.Positioner>
                                <Select.Content>
                                    {allGPIOCollection.items.map((pin) => (
                                        <Select.Item item={pin} key={pin.value}>
                                            <Stack gap="0">
                                                <Select.ItemText>{pin.label}</Select.ItemText>
                                                <Span color="fg.muted" textStyle="xs">
                                                    {pin.description}
                                                </Span>
                                            </Stack>
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select.Positioner>
                        </Select.Root>
                    </Field.Root>

                    <Field.Root width="100%" orientation="horizontal">
                        <Field.Label>Polarity</Field.Label>
                        <Switch.Root checked={backlightController !== null ? backlightController.invert : false}
                                     onCheckedChange={(e) => {
                                         if (backlightController !== null) {
                                             const new_invert = e.checked
                                             const new_controller = {
                                                 ...backlightController,
                                                 invert: new_invert
                                             }
                                             setBacklightController(new_controller)
                                         }
                                     }}>
                            <Switch.HiddenInput/>
                            <Switch.Label>{backlightController?.invert ? "Inverted" : "Normal"}</Switch.Label>
                            <Switch.Control/>
                        </Switch.Root>
                    </Field.Root>

                    <Field.Root width="100%">
                        <Field.Label>PWM Frequency</Field.Label>
                        <HStack width="100%">
                            <NumberInput.Root
                                min={10} max={10000}
                                value={backlightController ? backlightController.frequency.toString() : "0"}
                                onValueChange={(e) => {
                                    if (backlightController !== null) {
                                        const new_freq = parseInt(e.value)
                                        const new_controller = {
                                            ...backlightController,
                                            frequency: new_freq
                                        }
                                        setBacklightController(new_controller)
                                    }
                                }}
                                step={10}>
                                <NumberInput.Control/>
                                <NumberInput.Input/>
                            </NumberInput.Root>
                            <Box minW="2em">Hz</Box>
                        </HStack>
                    </Field.Root>

                    <Field.Root width="100%">
                        <Field.Label>Brightness</Field.Label>
                        <HStack width="100%">
                            <Slider.Root width="100%"
                                         value={backlightController ? [backlightController.dutycycle] : [0]}
                                         onValueChange={(e) => {
                                             if (backlightController !== null) {
                                                 const new_dutycycle = e.value[0]
                                                 if (new_dutycycle !== undefined) {
                                                     const new_controller = {
                                                         ...backlightController,
                                                         dutycycle: new_dutycycle
                                                     }
                                                     setBacklightController(new_controller)
                                                 }
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
                                {backlightController !== null ?
                                    backlightController.dutycycle.toString().padStart(3, "\xa0") + "%" :
                                    "\xa0\xa00%"}
                            </Box>
                        </HStack>
                    </Field.Root>

                    <Field.Root width="100%">
                        <Field.Label>Backlight</Field.Label>
                        <SegmentGroup.Root value={backlightController?.enable ? "On" : "Off"}
                                           onValueChange={(e) => {
                                               if (backlightController !== null) {
                                                   const new_enable = e.value === "On"
                                                   const new_controller = {
                                                       ...backlightController,
                                                       enable: new_enable
                                                   }
                                                   setBacklightController(new_controller)
                                               }
                                           }}>
                            <SegmentGroup.Indicator/>
                            <SegmentGroup.Items items={["Off", "On"]}/>
                        </SegmentGroup.Root>
                    </Field.Root>

                </Card.Body>
            </Card.Root>
            <Box h="full"/>
        </VStack>
    )
}
