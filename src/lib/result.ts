export class Result<T> {
    code!: number;
    msg!: string;
    data?: T;
    constructor(obj:any) {
        Object.assign(this, obj)
    }
    isSuccess(): boolean {
        return this.code === 0;
    }
}

