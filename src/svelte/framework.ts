import { ClassAttributes, ReactSVG, SVGAttributes } from "react";
import { Component } from "../utils/component";
import { ComponentNode } from "../utils/jsx";
import { RefreshManager } from "../utils/refresh-manager";
import { applyVDOMDiff, convertAttrName, VirtualDOM } from "../utils/virtual-dom";


export function renderSvelteComponent(component: any, anchor: HTMLElement) {
    component.init();
    anchor.appendChild(component.render());
}

function _render(component: SvelteComponent) {
    (component as any).$$refresh();
}

export interface SvelteComponent extends Component {
    init(): void;
    render(): AnyElement;
}

export type AnyElement = HTMLElement | SVGElement;

const refreshManager = new RefreshManager(_render);

export function $$markDirty(component: SvelteComponent) {
    refreshManager.scheduleRefresh(component);
}

export function createElement<P extends SVGAttributes<T>, T extends SVGElement>(
        type: keyof ReactSVG,
        props?: ClassAttributes<T> & P | null,
        ...children: SVGElement[]): SVGElement {

    const element = document.createElementNS('http://www.w3.org/2000/svg', type);

    Object.entries(props ?? {}).forEach(([key, value]) => {
        setProp(element, key, value);
    });

    appendChild(element, children);

    return element;
}

function appendChild(node: SVGElement, child: SVGElement | SVGElement[]) {
    if (Array.isArray(child)) {
        child.forEach(c => appendChild(node, c));
    } else if (typeof child === 'string') {
        node.appendChild(document.createTextNode(child));
    } else if (child != null) {
        node.appendChild(child);
    }
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