import {
    Directive,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges,
    TemplateRef,
    ViewContainerRef,
} from '@angular/core';
import {BehaviorSubject, Subject, filter, map, takeUntil} from 'rxjs';
import {chunk} from 'lodash';
import {PaginationContext} from './pagination-context.interface';

@Directive({
    selector: '[appPagination]',
})
export class PaginationDirective<T> implements OnInit, OnChanges, OnDestroy {
    @Input() appPaginationOf: T[] | undefined | null;

    @Input() appPaginationChankSize = 4;

    groupItems: T[][] = [];

    private readonly currentIndex$ = new BehaviorSubject<number>(0);
    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly viewContainerRef: ViewContainerRef,
        private readonly templateRef: TemplateRef<PaginationContext<T>>,
    ) {}

    get shouldShowItems(): boolean {
        return Boolean(this.appPaginationOf?.length);
    }

    ngOnChanges({appPaginationOf, appPaginationChankSize}: SimpleChanges): void {
        if (appPaginationOf || appPaginationChankSize) {
            this.updateView();
        }
    }

    ngOnInit() {
        this.listenCurrentIndex();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private updateView() {
        if (this.shouldShowItems) {
            this.groupItems = chunk(this.appPaginationOf, this.appPaginationChankSize);
            this.currentIndex$.next(0);

            return;
        }

        this.viewContainerRef.clear();
    }

    private listenCurrentIndex() {
        this.currentIndex$
            .pipe(
                filter(() => this.shouldShowItems),
                map(index => this.getCurrentContext(index)),
                takeUntil(this.destroy$),
            )
            .subscribe(context => {
                this.viewContainerRef.clear();
                this.viewContainerRef.createEmbeddedView(this.templateRef, context);
            });
    }

    private getCurrentContext(currentIndex: number): PaginationContext<T> {
        const appPaginationOf = this.appPaginationOf as T[];

        return {
            $implicit: this.groupItems[currentIndex],
            appPaginationOf,
            selectIndex: currentIndex,
            pageIndex: this.groupItems.map((_, index) => index),
            next: this.next.bind(this),
            back: () => {
                this.back();
            },
            selectPage: (index: number) => {
                this.selectPage(index);
            },
        };
    }

    private next() {
        const nextIndex = this.currentIndex$.value + 1;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const newIndex = nextIndex < this.appPaginationOf!.length ? nextIndex : 0;

        this.currentIndex$.next(newIndex);
    }

    private back() {
        const previousIndex = this.currentIndex$.value - 1;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const lastIndex = this.appPaginationOf!.length - 1;
        const newIndex = previousIndex < 0 ? lastIndex : previousIndex;

        this.currentIndex$.next(newIndex);
    }

    private selectPage(index: number): void {
        this.currentIndex$.next(index);
    }
}