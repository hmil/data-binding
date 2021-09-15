
export function needleCssTransform(needle: ClockNeedle) {
    return `rotate(${needle.value * 360 / needle.steps + needle.turns * 360 - 90}deg)`;
}

export function createNeedle(steps: number): ClockNeedle {
    return {
        value: 0, turns: 0, steps
    };
}

export function updateNeedle(needle: ClockNeedle, value: number): ClockNeedle {
    let turns = needle.turns;
    if (value < needle.value) {
        turns++;
    }
    return {
        value, steps: needle.steps, turns
    };
}

export interface ClockNeedle {
    readonly value: number;
    readonly turns: number;
    readonly steps: number;
}