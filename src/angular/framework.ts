import { Props, ReactNode } from 'react';

import { Component } from '../utils/component';
import { RefreshManager } from '../utils/refresh-manager';
import { applyVDOMDiff, VirtualDOM } from '../utils/virtual-dom';

const shadowDOM = new WeakMap<AngularComponent, VirtualDOM>();
const anchors = new WeakMap<AngularComponent, HTMLElement>();

export function renderAngularComponent(component: AngularComponent, anchor: HTMLElement) {
    anchors.set(component, anchor);
    // enterZone(component);
    component.init();
    // leaveZone();
    _render(component);
}

function _render(component: AngularComponent) {
    // enterZone(component);
    const tree = component.render();
    // leaveZone();

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


export interface AngularComponent extends Component {
    init(): void;
    render(): JSX.Element;
}
