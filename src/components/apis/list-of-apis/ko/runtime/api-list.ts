import * as ko from "knockout";
import * as Constants from "../../../../../constants";
import template from "./api-list.html";
import { Component, RuntimeComponent, Param, OnMounted } from "@paperbits/common/ko/decorators";
import { Utils } from "../../../../../utils";
import { ApiService } from "../../../../../services/apiService";
import { DefaultRouter, Route } from "@paperbits/common/routing";
import { Api } from "../../../../../models/api";
import { TagGroup } from "../../../../../models/tagGroup";
import { SearchQuery } from "../../../../../contracts/searchQuery";


@RuntimeComponent({ selector: "api-list" })
@Component({
    selector: "api-list",
    template: template,
    injectable: "apiList"
})
export class ApiList {
    private queryParams: URLSearchParams;
    public readonly apis: ko.ObservableArray<Api>;
    public readonly apiGroups: ko.ObservableArray<TagGroup<Api>>;
    public readonly working: ko.Observable<boolean>;
    public readonly selectedId: ko.Observable<string>;
    public readonly dropDownId: ko.Observable<string>;
    public readonly pattern: ko.Observable<string>;
    public readonly page: ko.Observable<number>;
    public readonly hasPager: ko.Computed<boolean>;
    public readonly hasPrevPage: ko.Observable<boolean>;
    public readonly hasNextPage: ko.Observable<boolean>;

    constructor(
        private readonly apiService: ApiService,
        private readonly router: DefaultRouter
    ) {
        this.apis = ko.observableArray([]);
        this.itemStyleView = ko.observable();
        this.working = ko.observable();
        this.selectedId = ko.observable();
        this.dropDownId = ko.observable();
        this.applySelectedApi = this.applySelectedApi.bind(this);
        this.selectFirst = this.selectFirst.bind(this);
        this.selectionChanged = this.selectionChanged.bind(this);
        this.pattern = ko.observable();
        this.page = ko.observable(1);
        this.hasPrevPage = ko.observable();
        this.hasNextPage = ko.observable();
        this.hasPager = ko.computed(() => this.hasPrevPage() || this.hasNextPage());
        this.apiGroups = ko.observableArray();
    }

    @Param()
    public itemStyleView: ko.Observable<string>;

    @OnMounted()
    public async initialize(): Promise<void> {
        await this.loadApis(this.router.getCurrentRoute());
        this.router.addRouteChangeListener(this.loadApis);

        this.pattern.subscribe(this.searchApis);
    }

    public itemHeight: ko.Observable<string>;
    public itemWidth: ko.Observable<string>;

    
    public async loadApis(route?: Route): Promise<void> {
        const currentHash = route && route.hash;
        if (currentHash) {
            this.queryParams = new URLSearchParams(currentHash);

            if (this.queryParams.has("apiId")) {
                if (this.apis().length === 0) {
                    await this.searchApis();
                }
                this.applySelectedApi();
                return;
            }
        }

        this.queryParams = this.queryParams || new URLSearchParams(); // Params should be take from Route params

        if (this.apis().length > 0) {
            return;
        }
        await this.searchApis();

        this.selectFirst();
    }

    private applySelectedApi(): void {
        const currentId = this.selectedId();
        const selectedId = this.queryParams.get("apiId");
        if (selectedId === currentId) {
            return;
        }
        this.selectedId(selectedId);

        if (this.itemStyleView() === "dropdown" && this.dropDownId() !== selectedId) {
            this.dropDownId(selectedId);
        }

        this.queryParams.set("apiId", selectedId);
        this.router.navigateTo("#?" + this.queryParams.toString());
    }

    public selectionChanged(change, event): void {
        if (event.originalEvent) { // user changed
            const currentId = this.queryParams.get("apiId");
            const selectedId = this.dropDownId();
            if (selectedId === currentId) {
                return;
            }
            this.queryParams.set("apiId", selectedId);
            this.queryParams.delete("operationId");
            this.router.navigateTo("#?" + this.queryParams.toString());
        }
    }

    private selectFirst(): void {
        if (this.itemStyleView() === "tiles" || this.queryParams.has("apiId")) {
            return;
        }

        const list = this.apis();

        if (list.length > 0) {
            const selectedId = list[0].name;
            this.queryParams.set("apiId", selectedId);
            this.applySelectedApi();
        }
    }


    public prevPage(): void {
        this.page(this.page() - 1);
        this.searchApis(/*  */);
    }

    public nextPage(): void {
        this.page(this.page() + 1);
        this.searchApis();
    }

    public async searchApis(): Promise<void> {
        this.working(true);

        const pageNumber = this.page() - 1;

        const query: SearchQuery = {
            pattern: this.pattern(),
            skip: pageNumber * Constants.defaultPageSize,
            take: Constants.defaultPageSize
        };

        const pageOfTagResources = await this.apiService.getApisByTags(query);
        const apiGroups = pageOfTagResources.value;

        this.apiGroups(apiGroups);

        this.hasPrevPage(pageNumber > 0);
        this.hasNextPage(!!pageOfTagResources.nextLink);


        switch (query.grouping || "none") {
            case "none":
                const pageOfApis = await this.apiService.getApis(query);
                const apis = pageOfApis ? pageOfApis.value : [];
                this.apis(this.groupApis(apis));

                break;

            case "tag":
                const pageOfTagResources = await this.apiService.getApisByTags(query);
                const tagResources = pageOfTagResources ? pageOfTagResources.value : [];
                // TODO: this.tagResourcesToNodes(tagResources);

                break;

            default:
                throw new Error("Unexpected groupBy value");
        }

        this.working(false);
    }

    private groupApis(apis: Api[]): Api[] {
        apis = apis.filter(x => x.isCurrent);
        const result = apis.filter(x => !x.apiVersionSet);
        const versionedApis = apis.filter(x => !!x.apiVersionSet);
        const groups = Utils.groupBy(versionedApis, x => x.apiVersionSet.id);
        result.push(...groups.map(g => g[g.length - 1]));
        return result;
    }

    public dispose(): void {
        this.router.removeRouteChangeListener(this.loadApis);
    }
}