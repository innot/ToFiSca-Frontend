import {useEffect, useState} from "react";
import {ApiError} from "../api.ts";
import {Button, CloseButton, Dialog, Heading, Table} from "@chakra-ui/react";
import {Portal} from "@chakra-ui/react";

interface Props {
    apiError: ApiError | undefined;
}

export const ApiErrorDialog = (props: Props) => {

    const [open, setOpen] = useState(false)

    useEffect(() => {
        if(props.apiError) setOpen(true);
    }, [props.apiError])

    return (
        <Dialog.Root lazyMount open={open} onOpenChange={(e) => setOpen(e.open)}>
            <Portal>
                <Dialog.Backdrop/>
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>ToFiSca Server Error</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            <Heading>Error in communication with the server</Heading>
                            <Table.Root>
                                <Table.Body>
                                    <Table.Row>
                                        <Table.Cell>Statuscode:</Table.Cell>
                                        <Table.Cell>{props.apiError?.status}</Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell>Message:</Table.Cell>
                                        <Table.Cell>{props.apiError?.statusText}</Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell>Details:</Table.Cell>
                                        <Table.Cell>{props.apiError?.details}</Table.Cell>
                                    </Table.Row>
                                </Table.Body>
                            </Table.Root>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="outline">Cancel</Button>
                            </Dialog.ActionTrigger>
                        </Dialog.Footer>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm"/>
                        </Dialog.CloseTrigger>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    )
}