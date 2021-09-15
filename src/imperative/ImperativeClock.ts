import { Component } from '../utils/component';
import { createNeedle, needleCssTransform, updateNeedle } from '../utils/time-utils';

function template(id: string) {
    let acc = `<svg width="300" height="300" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="-101 -101 202 202">
    <circle cx="0" cy="0" r="100" fill="#fff" stroke="#000"/>`;
    
    // Draw clock
    acc += "<g>";
    for (let i = 0 ; i < 60 ; i++) {
        if (i % 5 === 0) {
            acc += `<rect x="0" y="-3" width="18" height="6" fill="#000" style="transform: rotate(${360/60 * i}deg) translateX(82px);" />`
        } else {
            acc += `<rect x="0" y="-1" width="5" height="2" fill="#000" style="transform: rotate(${360/60 * i}deg) translateX(95px);" />`
        }
    }
    acc += "</g>";

    acc += '<text x="-35" y="50" fill="#000" font-family="helvetica" font-size="13px">Imperative.</text>'

    // Draw needles

    // hours
    acc += `<path id="${id}-hours" d="M -20 -5 L -20 5 L 75 4.5 L 75 -4.5 Z" fill="#000" style="transform: rotate(120deg); transition: transform 200ms cubic-bezier(0.32, 0.14, 0.31, 1.47);" />`;

    // minutes
    acc += `<path id="${id}-minutes" d="M -20 -5 L -20 5 L 98 4 L 98 -4 Z" fill="#000" style="transform: rotate(20deg); transition: transform 250ms cubic-bezier(0.32, 0.14, 0.31, 1.47);" />`;

    // seconds
    acc += `<g id="${id}-seconds" style="transform: rotate(220deg); transition: transform 200ms cubic-bezier(0.32, 0.14, 0.31, 1.47);">
        <circle cx="0" cy="0" r="2" fill="#de1721" />
        <circle cx="78" cy="0" r="7" fill="#de1721" />
        <rect x="-20" y="-1" width="100" height="2" fill="#de1721" />
    </g>`;

    return acc + '</svg>';
}

export class ImperativeClock implements Component {

    private interval?: NodeJS.Timer;

    private hours = createNeedle(12 * 60);
    private minutes = createNeedle(60);
    private seconds = createNeedle(60);

    private elements?: { hours: HTMLElement, minutes: HTMLElement, seconds: HTMLElement };

    create(anchor: HTMLElement) {
        this.interval = setInterval(() => {
            this.update();
            this.render();
        }, 1000);

        const myId = Math.floor(Math.random() * 1000).toString();

        anchor.innerHTML = template(myId);

        this.elements = {
            hours: document.getElementById(myId + '-hours')!,
            minutes: document.getElementById(myId + '-minutes')!,
            seconds: document.getElementById(myId + '-seconds')!,
        }

        this.update();
        this.render();
    }

    destroy() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
    }

    private update() {
        const now = new Date();
        this.seconds = updateNeedle(this.seconds, now.getSeconds());
        this.minutes = updateNeedle(this.minutes, now.getMinutes());
        this.hours = updateNeedle(this.hours, now.getHours() * 60 + now.getMinutes());
    }

    private render() {
        if (!this.elements) return;

        this.elements.hours.style.transform = needleCssTransform(this.hours);
        this.elements.minutes.style.transform = needleCssTransform(this.minutes);
        this.elements.seconds.style.transform = needleCssTransform(this.seconds);
    }
}

