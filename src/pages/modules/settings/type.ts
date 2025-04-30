export type NumberOptions = {
    min?: number,
    max?: number,
    step?: number
}
export type StringOptions = {
    maxLength?: number,
    minLength?: number,
    placeholder? : string
    pattern?: string
}
export type SelectOptions = string[]
export interface Setting {
    id: string
    title: string
    description: string
    type: "text" | "number" | "toggle" | "select"
    defaultValue: string | number | boolean
    options?: SelectOptions | NumberOptions | StringOptions
}

export type ItemLabel = {
    id: string,
    icon?: any,
    label: string
}