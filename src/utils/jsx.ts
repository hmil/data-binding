import { ClassAttributes, ComponentProps, ReactNode, ReactSVG, ReactSVGElement, SVGAttributes } from "react";

export function seq(from: number, to: number) {
    return new Array(to - from).fill(0).map((_, i) => from + i);
}

export function createElement<P extends SVGAttributes<T>, T extends SVGElement>(
        type: keyof ReactSVG,
        props?: ClassAttributes<T> & P | null,
        ...children: ComponentNode[]): ComponentNode {

    children = (children as any[]).reduce((acc, el) => Array.isArray(el) ? acc.concat(el) : [...acc, el], [] as ComponentNode[]);

    return {
        children, type, props
    };
}

export interface ComponentNode {
    readonly children: ReadonlyArray<ComponentNode>;
    readonly type: string;
    readonly props: any;
}