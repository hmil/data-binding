import { Props, ReactNode } from 'react';

import { Component } from '../utils/component';
import { RefreshManager } from '../utils/refresh-manager';
import { applyVDOMDiff, VirtualDOM } from '../utils/virtual-dom';

const shadowDOM = new WeakMap<AngularComponent, VirtualDOM>();
const anchors = new WeakMap<AngularComponent, HTMLElement>();

export function renderAngularComponent(component: AngularComponent, anchor: HTMLElement) {
    anchors.set(component, anchor);
    enterZone(component);
    component.init();
    leaveZone();
    _render(component);
}

function _render(component: AngularComponent) {
    enterZone(component);
    const tree = component.render();
    leaveZone();

    const previous = shadowDOM.get(component);
    const dom = applyVDOMDiff(tree as any, previous);
    if (dom?.domElement != null && dom?.domElement != previous?.domElement) {
        // re-attach dom element
        anchors.get(component)!.appendChild(dom?.domElement);
        shadowDOM.set(component, dom);
    }

}



const refreshManager = new RefreshManager(_render);


const originalInterval: any = window.setInterval;

function wrapRuntimeCallback<T extends (...args: any[]) => void>(callback: T, component: AngularComponent): T {
    return ((...args: any[]) => {
        console.log('[Angular] Detected re-entry from I/O');
        enterZone(component);
        callback(...args);
        leaveZone();
        refreshManager.scheduleRefresh(component);
    }) as any;
}


function enterZone(component: AngularComponent) {
    console.log('[Angular] Entering zone');
    window.setInterval = ((callback: (...args: any[]) => void, ...args: any[]) => {
        console.log('[Angular] Intercepted I/O call');
        return originalInterval.apply(window, [wrapRuntimeCallback(callback, component), ...args]);
    }) as any;
}

function leaveZone() {
    console.log('[Angular] Leaving zone');
    window.setInterval = originalInterval;
}

export interface AngularComponent extends Component {
    init(): void;
    render(): JSX.Element;
}
