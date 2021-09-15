
import { ImperativeClock } from './imperative/ImperativeClock';
import { Component } from './utils/component';
import { AngularClock } from './angular/AngularClock';
import { renderAngularComponent } from './angular/framework';
import { DeclarativeClock } from './declarative/DeclarativeClock';
import { renderDeclarativeComponent } from './declarative/framework';
import { ReactClock } from './react/ReactClock';
import { renderReactComponent } from './react/framework';
import { VueClock } from './vue/VueClock';
import { renderVueComponent } from './vue/framework';
import SvelteClock from './svelte/SvelteClock';
import { renderSvelteComponent } from './svelte/framework';

const root = document.getElementById('app')!;

const possibleRoutes = [
    'imperative',
    'angular',
    'declarative',
    'react',
    'vue',
    'svelte',
    ''
] as const;
type Routes = typeof possibleRoutes[number];

let currentRoute: Routes = '';
let currentComponent: Component | null = null;

function updateApp() {
    const nextRoute = getRoute();

    if (possibleRoutes.includes(nextRoute as any)) {
        if (currentRoute != nextRoute) {
            renderRoute(nextRoute as any);
            currentRoute = nextRoute as any;
        }
    } else {
        window.location.replace('#/');
    }
}

function renderRoute(route: Routes) {
    if (currentComponent) {
        currentComponent.destroy();
        currentComponent = null;
    }

    root.innerHTML = '';

    switch (route) {
        case 'angular':
            const angularComponent = new AngularClock();
            renderAngularComponent(angularComponent, root);
            currentComponent = angularComponent;
            break;
        case 'react':
            const reactClock = new ReactClock();
            currentComponent = renderReactComponent(reactClock, root);
            currentComponent = reactClock;
            break;
        case 'declarative':
            const declarativeComponent = new DeclarativeClock();
            renderDeclarativeComponent(declarativeComponent, root);
            currentComponent = declarativeComponent;
            break;
        case 'imperative':
            const imperativeComponent = new ImperativeClock();
            imperativeComponent.create(root);
            currentComponent = imperativeComponent;
            break;
        case 'vue':
            const vueComponent = VueClock.newInstance();
            renderVueComponent(vueComponent, root);
            currentComponent = vueComponent;
            break;
        case 'svelte':
            const svelteComponent = new SvelteClock();
            renderSvelteComponent(svelteComponent, root);
            currentComponent = svelteComponent;
            break;

    }
}

function getRoute() {
    const segments = window.location.hash.split('/');
    return segments[segments.length - 1];
}

window.addEventListener('hashchange', updateApp);

updateApp();