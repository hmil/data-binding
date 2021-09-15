import { ComponentNode } from "./jsx";

export function applyVDOMDiff(tree: ComponentNode, previous: VirtualDOM | undefined): VirtualDOM | undefined {
    if (typeof tree === 'string') {
        if (tree === previous?.type) {
            return previous;
        } else {
            const domElement = document.createTextNode(tree);
            return {
                domElement: domElement as any, type: tree, props: {}, children: []
            }
        }
    }
    if (!tree.type) {
        return undefined;
    }
    const domElement = previous?.type === tree.type ? previous.domElement : document.createElementNS("http://www.w3.org/2000/svg", tree.type);
    let children: Array<VirtualDOM | undefined> = [];

    let propsToProcess = Object.keys(previous?.props || {});
    if (tree.props != null) {
        Object.entries(tree.props).forEach(([key, value]) => {
            propsToProcess = propsToProcess.filter(p => p !== key);
            if (domElement != previous?.domElement || value != previous?.props[key]) {
                setProp(domElement, key, value);
            }
        });
    }

    propsToProcess.forEach(p => domElement.removeAttribute(p));

    if (tree.children != null) {
        children = tree.children.map((child, i) =>
            applyVDOMDiff(child, previous?.children[i])
        );
        children.forEach((c, i) => {
            if (c != null && (domElement != previous?.domElement || c.domElement !== previous?.children[i]?.domElement)) {
                domElement.appendChild(c.domElement);
            }
        });
    }
    return {
        domElement,
        type: tree.type,
        props: tree.props,
        children
    };
}

function setProp(domElement: HTMLElement | SVGElement, key: string, value: unknown) {
    if (key === 'style' && typeof value === 'object' && value != null) {
        Object.entries(value).forEach(([k, v]) => {
            domElement.style.setProperty(convertAttrName(k), v);
        });
    } else {
        domElement.setAttribute(convertAttrName(key), value as any);
    }
}

const ATTR_MAPPINGS: { [k: string]: string | undefined } = {
    'fontFamily': 'font-family',
    'fontSize': 'font-size'
}

export function convertAttrName(camelCase: string): string {
    const mapped = ATTR_MAPPINGS[camelCase];
    if (mapped) {
        return mapped;
    }
    return camelCase;
}

export interface VirtualDOM {
    domElement: HTMLElement | SVGElement;
    type: string;
    props: any;
    children: Array<VirtualDOM | undefined>;
}
