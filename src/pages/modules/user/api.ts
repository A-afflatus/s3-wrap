export namespace User {
    export type User = {
        id: string,
        name: string,
        email?: string,
        avatar?: string
    }
}
export const tourist: User.User = {
    id:"tourist",
    name: "游客",
    email: "tourist@email.com",
    avatar: "/avatars/shadcn.jpg"
}