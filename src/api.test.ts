import {expect, test} from 'vitest'
import {useApiStateReadOnly} from "./api.ts";
import type {paths} from "./tofisca_api.d.ts";

test("useApiStateReadOnly", () => {

    const s = "/api/project/paths"

    type T = paths[typeof s]

    const result = useApiStateReadOnly("/api/project/name")
})