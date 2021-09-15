import { Props, ReactNode } from 'react';
import { Component } from '../utils/component';
import { RefreshManager } from '../utils/refresh-manager';

import { applyVDOMDiff, VirtualDOM } from '../utils/virtual-dom';

const shadowDOM = new WeakMap<VueComponent, VirtualDOM>();
const anchors = new WeakMap<VueComponent, HTMLElement>();

const dataDependencies = new WeakMap<VueModel, Map<string | Symbol, Set<VueComponent>>>();

let activeComponentRender: VueComponent | null = null;

export function createVue<T extends VueDefinition>(definition: T): { newInstance(): VueComponent } {

    return {
        newInstance() {
            return new Proxy<T & VueComponent>({
                init() {},
                destroy() {},
                ...definition
            }, {
                get(target: T, p: string | symbol, receiver: any): any {
                    if (activeComponentRender != null) {
                        console.log(`[Vue] Property ${String(p)} was consumed while a component was rendered`);
                        const bucket = dataDependencies.get(target) ?? new Map<string, Set<VueComponent>>();
                        const views = bucket.get(p) ?? new Set();
                        views.add(activeComponentRender);
                        bucket.set(p, views);
                        dataDependencies.set(target, bucket);
                    }
                    return Reflect.get(target, p, receiver);
                },
                set(target: T, p: string | symbol, value: any, receiver: any): boolean {
                    dataDependencies.get(target)?.get(p)?.forEach(view => {
                        console.log(`[Vue] Scheduling a refresh because property ${String(p)} was modified`);
                        refreshManager.scheduleRefresh(view);
                    });
                    return Reflect.set(target, p, value, receiver);
                }
            });
        }
    }
}

export function renderVueComponent(component: VueComponent, anchor: HTMLElement) {
    anchors.set(component, anchor);
    component.init();
    refreshVueComponent(component);

    return component;
}

export function refreshVueComponent(component: VueComponent) {
    activeComponentRender = component;
    const tree = component.render();
    activeComponentRender = null;
    const previous = shadowDOM.get(component);
    const dom = applyVDOMDiff(tree as any, previous);
    if (dom?.domElement != null && dom?.domElement != previous?.domElement) {
        // re-attach dom element
        anchors.get(component)!.appendChild(dom?.domElement);
        shadowDOM.set(component, dom);
    }
}

const refreshManager = new RefreshManager(refreshVueComponent);

export interface VueComponent extends VueDefinition, Component {
    init(): void;
}

interface VueModel { }

interface VueDefinition {
    render(): JSX.Element;
}