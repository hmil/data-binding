import { Props, ReactNode } from 'react';

import { Component } from '../utils/component';
import { applyVDOMDiff, VirtualDOM } from '../utils/virtual-dom';

const shadowDOM = new WeakMap<DeclarativeComponent, VirtualDOM>();

export function renderDeclarativeComponent(component: DeclarativeComponent, anchor: HTMLElement) {
    component.anchor = anchor;
    component.init();
    refreshDeclarativeComponent(component);
}

export function refreshDeclarativeComponent(component: DeclarativeComponent) {
    const tree = component.render();
    const previous = shadowDOM.get(component);
    const dom = applyVDOMDiff(tree as any, previous);
    if (dom?.domElement != null && dom?.domElement != previous?.domElement) {
        // re-attach dom element
        component.anchor.appendChild(dom?.domElement);
        shadowDOM.set(component, dom);
    }
}

export interface DeclarativeComponent extends Component {
    anchor: HTMLElement;
    init(): void;
    render(): JSX.Element;
}