import { ClockNeedle, createNeedle, needleCssTransform, updateNeedle } from '../utils/time-utils';
import { seq } from '../utils/jsx';
import * as React from '../utils/jsx';
import { ReactComponent } from './framework';

export class ReactClock extends ReactComponent<{hours: ClockNeedle; minutes: ClockNeedle; seconds: ClockNeedle}> {

    anchor = document.createElement('div');
    private interval?: NodeJS.Timer;

    readonly state = {
        hours: createNeedle(12 * 60),
        minutes: createNeedle(60),
        seconds: createNeedle(60)
    };


    init() {
        this.interval = setInterval(() => {
            this.update();
        }, 1000);
    
        this.update();
    }

    public render() {
        return <svg width="300" height="300" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="-101 -101 202 202">
            <circle cx="0" cy="0" r="100" fill="#fff" stroke="#000"/>
            <g>
                { seq(0, 60).map(i => {
                    if (i % 5 === 0) {
                        return <rect x="0" y="-3" width="18" height="6" fill="#000" style={{transform: `rotate(${360/60 * i}deg) translateX(82px)` }} />;
                    } else {
                        return <rect x="0" y="-1" width="5" height="2" fill="#000" style={{transform: `rotate(${360/60 * i}deg) translateX(95px)`}} />;
                    }
                }) }
            </g>
            <text x="-20" y="50" fill="#000" fontFamily="helvetica" fontSize="13px">React.</text>
            {/* hours needle */}
            <path d="M -20 -5 L -20 5 L 75 4.5 L 75 -4.5 Z" fill="#000" style={{transform: needleCssTransform(this.state.hours), transition: `transform 200ms cubic-bezier(0.32, 0.14, 0.31, 1.47)`}} />
            {/* minutes needle */}
            <path d="M -20 -5 L -20 5 L 98 4 L 98 -4 Z" fill="#000" style={{transform: needleCssTransform(this.state.minutes), transition: `transform 250ms cubic-bezier(0.32, 0.14, 0.31, 1.47)`}} />`;
            {/* seconds needle */}
            <g style={{ transform: needleCssTransform(this.state.seconds), transition: `transform 200ms cubic-bezier(0.32, 0.14, 0.31, 1.47)` }}>
                <circle cx="0" cy="0" r="2" fill="#de1721" />
                <circle cx="78" cy="0" r="7" fill="#de1721" />
                <rect x="-20" y="-1" width="100" height="2" fill="#de1721" />
            </g>
        </svg>;
    }

    destroy() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
    }

    private update() {
        const now = new Date();
        this.setState({
            seconds: updateNeedle(this.state.seconds, now.getSeconds()),
            minutes: updateNeedle(this.state.minutes, now.getMinutes()),
            hours: updateNeedle(this.state.hours, now.getHours() * 60 + now.getMinutes())
        });
    }

}

