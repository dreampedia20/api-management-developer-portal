import * as ko from "knockout";
import * as Constants from "../../../../../constants";
import template from "./api-list-dropdown.html";
import { Component, RuntimeComponent, OnMounted } from "@paperbits/common/ko/decorators";
import { ApiService } from "../../../../../services/apiService";
import { Api } from "../../../../../models/api";
import { TagGroup } from "../../../../../models/tagGroup";
import { SearchQuery } from "../../../../../contracts/searchQuery";


@RuntimeComponent({ selector: "api-list-dropdown" })
@Component({
    selector: "api-list-dropdown",
    template: template,
    injectable: "apiListDropdown"
})
export class ApiListDropdown {
    public readonly apiGroups: ko.ObservableArray<TagGroup<Api>>;
    public readonly working: ko.Observable<boolean>;
    public readonly selectedId: ko.Observable<string>;
    public readonly pattern: ko.Observable<string>;
    public readonly page: ko.Observable<number>;
    public readonly hasPager: ko.Computed<boolean>;
    public readonly hasPrevPage: ko.Observable<boolean>;
    public readonly hasNextPage: ko.Observable<boolean>;

    constructor(private readonly apiService: ApiService) {
        this.working = ko.observable();
        this.selectedId = ko.observable();
        this.pattern = ko.observable();
        this.page = ko.observable(1);
        this.hasPrevPage = ko.observable();
        this.hasNextPage = ko.observable();
        this.hasPager = ko.computed(() => this.hasPrevPage() || this.hasNextPage());
        this.apiGroups = ko.observableArray();
    }

    @OnMounted()
    public async initialize(): Promise<void> {
        await this.searchApis();
        this.pattern.subscribe(this.searchApis);
    }

    public prevPage(): void {
        this.page(this.page() - 1);
        this.searchApis(/*  */);
    }

    public nextPage(): void {
        this.page(this.page() + 1);
        this.searchApis();
    }

    /**
     * Initiates searching APIs.
     */
    public async searchApis(): Promise<void> {
        try {
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

            const nextLink = pageOfTagResources.nextLink;

            this.hasPrevPage(pageNumber > 0);
            this.hasNextPage(!!nextLink);
        }
        catch (error) {
            console.error(`Unable to load APIs. ${error}`);
        }
        finally {
            this.working(false);
        }
    }
}