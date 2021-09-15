import { Props, ReactNode } from 'react';
import { Component } from '../utils/component';
import { RefreshManager } from '../utils/refresh-manager';

import { applyVDOMDiff, VirtualDOM } from '../utils/virtual-dom';

const shadowDOM = new WeakMap<ReactComponent, VirtualDOM>();
const anchors = new WeakMap<ReactComponent, HTMLElement>();

export function renderReactComponent(component: ReactComponent, anchor: HTMLElement) {
    anchors.set(component, anchor);
    component.init();
    refreshReactComponent(component);

    return component;
}

export function refreshReactComponent(component: ReactComponent) {
    const tree = component.render();
    const previous = shadowDOM.get(component);
    const dom = applyVDOMDiff(tree as any, previous);
    if (dom?.domElement != null && dom?.domElement != previous?.domElement) {
        // re-attach dom element
        anchors.get(component)!.appendChild(dom?.domElement);
        shadowDOM.set(component, dom);
    }
}

const refreshManager = new RefreshManager(refreshReactComponent);


export abstract class ReactComponent<S = {}> implements Component {
    destroy(): void { }
    init(): void {}
    abstract render(): JSX.Element;

    abstract state: S;

    setState(s: S) {
        this.state = s;
        refreshManager.scheduleRefresh(this);
    }
}