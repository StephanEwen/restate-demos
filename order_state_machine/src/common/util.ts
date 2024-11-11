
export function sleep(millis: number) : Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, millis));
}

export function randomElement<T>(elements: T[]): T {
    if (elements.length === 0) {
        throw new Error("no elements available");
    }
    return elements[Math.floor(Math.random() * elements.length)];
}

export function withTimeout<T>(promise: Promise<T>, millis: number): Promise<T> {
    let timeoutPid: any;
    const timeout = new Promise((_resolve, reject) =>
        timeoutPid = setTimeout(() => reject(`Timed out after ${millis} ms.`), millis));
    
    return Promise.race([promise,timeout])
        .finally(() => {
            if (timeoutPid) {
                clearTimeout(timeoutPid);
            }
            }) as Promise<T>;
}
