
export class RefreshManager<C> {

    private willRefresh = false;
    private toRefresh = new Set<C>();

    constructor(private readonly renderFn: (component: C) => void) {}

    public scheduleRefresh(component: C) {
        if (!this.willRefresh) {
            requestAnimationFrame(this.refresh.bind(this));
            this.willRefresh = true;
        }
        this.toRefresh.add(component);
    }


    public refresh() {
        this.willRefresh = false;

        const batch = this.toRefresh;
        this.toRefresh = new Set();

        batch.forEach(this.renderFn);
    }
}