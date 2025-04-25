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
import {BacklightController} from "./types.ts"
import {Fieldset} from "@chakra-ui/icons";


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
                const label = "GPIO" + pin.gpio.toString() + (pin.hardware_pwm ? "(Hardware PWM)" : "");
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


    return (
        <VStack id="test" h="full">
            <ApiErrorDialog apiError={apiError} setApiError={() => setApiError(null)}/>
            <Heading>Hardware Setup</Heading>
            <Card.Root width="100%" bg="gray.500">
                <Card.Body>
                    <Fieldset.Root width="100%" size="lg" maxW="md">
                        <Fieldset.Legend>Backlight</Fieldset.Legend>
                    </Fieldset.Root>
                    <Fieldset.Content>

                        <Field.Root width="100%" orientation="horizontal">
                            <Field.Label flex="1">GPIO Pin</Field.Label>
                            <Select.Root flex="3"
                                         value={(backlightController ? [backlightController.gpio.toString()] : [])}
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
                            <Field.Label flex="1">Invert Polarity</Field.Label>
                            <Switch.Root flex="3"
                                         checked={backlightController !== null ? backlightController.invert : false}
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
                                <Switch.Control>
                                    <Switch.Thumb/>
                                </Switch.Control>
                            </Switch.Root>
                        </Field.Root>

                        <Field.Root width="100%" orientation="horizontal">
                            <Field.Label flex="1">PWM Frequency</Field.Label>
                            <NumberInput.Root flex="3"
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
                            Hz
                        </Field.Root>

                        <Field.Root width="100%" orientation="horizontal">
                            <Field.Label flex="1">Brightness</Field.Label>
                            <Slider.Root flex="3"
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
                            <Box>
                                {backlightController !== null ?
                                    backlightController.dutycycle.toString().padStart(3, "\xa0") + "%" :
                                    "\xa0\xa00%"}
                            </Box>
                        </Field.Root>

                        <Field.Root width="100%" orientation="horizontal">
                            <Field.Label flex="1">Backlight</Field.Label>
                            <SegmentGroup.Root flex="3"
                                               value={backlightController?.enable ? "On" : "Off"}
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

                    </Fieldset.Content>
                </Card.Body>
            </Card.Root>
            <Box h="full"/>
        </VStack>
    )
}
