import * as Constants from "../constants";
import { TagContract } from "./../contracts/tag";
import { ProductContract } from "./../contracts/product";
import { ApiContract } from "../contracts/api";
import { ApiTagResourceContract } from "../contracts/tagResource";
import { PageContract } from "../contracts/page";
import { SearchQuery } from "../contracts/searchQuery";
import { Api } from "../models/api";
import { VersionSet } from "../models/versionSet";
import { Page } from "../models/page";
import { Operation } from "../models/operation";
import { Product } from "../models/product";
import { Schema } from "../models/schema";
import { MapiClient } from "./mapiClient";
import { Utils } from "../utils";
import { OperationContract } from "../contracts/operation";
import { SchemaContract } from "../contracts/schema";
import { VersionSetContract } from "../contracts/apiVersionSet";
import { HttpHeader } from "@paperbits/common/http/httpHeader";
import { ChangeLogContract } from "../contracts/apiChangeLog";
import { TagGroup } from "../models/tagGroup";
import { Bag } from "@paperbits/common";


export class ApiService {
    constructor(private readonly mapiClient: MapiClient) { }

    /**
     * Returns APIs matching search request (if specified).
     * @param searchRequest 
     */
    public async getApis(searchRequest?: SearchQuery): Promise<Page<Api>> {
        const skip = searchRequest && searchRequest.skip || 0;
        const take = searchRequest && searchRequest.take || Constants.defaultPageSize;

        let query = `/apis?expandApiVersionSet=true&$top=${take}&$skip=${skip}`;

        if (searchRequest) {
            if (searchRequest.tags) {
                searchRequest.tags.forEach((tag, index) => {
                    query = Utils.addQueryParameter(query, `tags[${index}]=${tag}`);
                });
            }

            if (searchRequest.pattern) {
                const pattern = Utils.escapeValueForODataFilter(searchRequest.pattern);
                query = Utils.addQueryParameter(query, `$filter=contains(properties/name,'${encodeURIComponent(pattern)}')`);
            }
        }

        const pageOfApis = await this.mapiClient.get<Page<ApiContract>>(query);

        const page = new Page<Api>();
        page.value = pageOfApis.value.map(x => new Api(x));
        page.nextLink = pageOfApis.nextLink;

        return page;
    }

    /**
     * Returns APIs in specified version set.
     * @param versionSetId Unique version set identifier.
     */
    public async getVersionSetApis(versionSetId: string): Promise<Api[]> {
        if (!versionSetId) {
            return null;
        }
        const query = "/apis?expandApiVersionSet=true";

        const apisPage = await this.mapiClient.get<Page<ApiContract>>(query);

        const result = apisPage.value.filter(x => x.properties.apiVersionSetId && Utils.getResourceName("api-version-sets", x.properties.apiVersionSetId, "shortId") === versionSetId).map(x => new Api(x));

        return result;
    }

    /**
     * Returns Tag/API pairs matching search request (if specified).
     * @param searchRequest Search request definition.
     */
    public async getApisByTags(searchRequest?: SearchQuery): Promise<Page<TagGroup<Api>>> {
        const skip = searchRequest && searchRequest.skip || 0;
        const take = searchRequest && searchRequest.take || Constants.defaultPageSize;

        let query = `/apisByTags?includeNotTaggedApis=true&$top=${take}&$skip=${skip}`;

        const odataFilterEntries = [];
        odataFilterEntries.push(`api/isCurrent eq true`);

        if (searchRequest) {
            if (searchRequest.tags && searchRequest.tags.length > 0) {
                const tagFilterEntries = searchRequest.tags.map((tag) => `tag/name eq '${tag}'`);
                odataFilterEntries.push(`(${tagFilterEntries.join(" or ")})`);
            }

            if (searchRequest.pattern) {
                const pattern = Utils.escapeValueForODataFilter(searchRequest.pattern);
                odataFilterEntries.push(`(contains(api/name,'${encodeURIComponent(pattern)}'))`);
            }
        }

        if (odataFilterEntries.length > 0) {
            query = Utils.addQueryParameter(query, `$filter=` + odataFilterEntries.join(" and "));
        }

        const pageOfApiTagResources = await this.mapiClient.get<PageContract<ApiTagResourceContract>>(query);
        const page = new Page<TagGroup<Api>>();
        const tagGroups: Bag<TagGroup<Api>> = {};

        pageOfApiTagResources.value.forEach(x => {
            const tagContract: TagContract = x.tag ? Utils.armifyContract(x.tag) : null;
            const apiContract: ApiContract = x.api ? Utils.armifyContract(x.api) : null;

            let tagGroup: TagGroup<Api>;
            let tagName: string;

            if (tagContract) {
                tagName = tagContract.properties.displayName;
            }
            else {
                tagName = "Not tagged";
            }

            tagGroup = tagGroups[tagName];

            if (!tagGroup) {
                tagGroup = new TagGroup<Api>();
                tagGroup.tag = tagName;
                tagGroups[tagName] = tagGroup;
            }
            tagGroup.items.push(new Api(apiContract));
        });

        page.value = Object.keys(tagGroups).map(x => tagGroups[x]);
        page.nextLink = pageOfApiTagResources.nextLink;

        return page;
    }

    /**
     * Returns API with specified ID and revision.
     * @param apiId Unique API indentifier.
     * @param revision 
     */
    public async getApi(apiId: string, revision?: string): Promise<Api> {
        let apiResourceUri = apiId;

        if (revision) {
            apiResourceUri += `;rev=${revision}`;
        }

        apiResourceUri += `?expandApiVersionSet=true`; // TODO: doesn't work in non-ARM resources

        const apiContract = await this.mapiClient.get<ApiContract>(apiResourceUri);

        if (!apiContract) {
            return null;
        }

        const api = new Api(apiContract);

        if (apiContract.properties.apiVersionSetId && !api.apiVersionSet) {
            const setId = Utils.getResourceName("api-version-sets", apiContract.properties.apiVersionSetId, "shortId");
            api.apiVersionSet = await this.getApiVersionSet(setId);
        }

        return api;
    }

    public exportApi(apiId: string, format: string): Promise<string> {
        const header: HttpHeader = {
            name: "Accept",
            value: "application/vnd.swagger.doc+json"
        };
        switch (format) {
            case "wadl":
                header.value = "application/vnd.sun.wadl+xml";
                break;
            case "wsdl":
                header.value = "application/wsdl+xml";
                break;
            case "swagger": // json 2.0
                header.value = "application/vnd.swagger.doc+json";
                break;
            case "openapi": // yaml 3.0
                header.value = "application/vnd.oai.openapi";
                break;
            case "openapi+json": // json 3.0
                header.value = "application/vnd.oai.openapi+json";
                break;
            default:
        }

        return this.mapiClient.get<string>(apiId, [header]);
    }

    /**
     * This is a function to get all change log pages for the API
     * 
     * @param apiId A string parameter which is the id of the API
     * @returns all changelog pages
     */
    public async getApiChangeLog(apiId: string, skip: number): Promise<Page<ChangeLogContract>> {
        let apiResourceUri = apiId;
        const take = Constants.defaultPageSize;
        apiResourceUri += `/releases?$top=${take}&$skip=${skip}`;

        const changelogContracts = await this.mapiClient.get<Page<ChangeLogContract>>(apiResourceUri);
        if (!changelogContracts) {
            return null;
        }

        return changelogContracts;
    }

    public async getApiVersionSet(versionSetId: string): Promise<VersionSet> {
        const versionSetContract = await this.mapiClient.get<VersionSetContract>(versionSetId);
        return new VersionSet(versionSetContract.id, versionSetContract);
    }

    public async getOperation(operationId: string): Promise<Operation> {
        const operationContract = await this.mapiClient.get<OperationContract>(operationId);

        if (!operationContract) {
            return null;
        }

        const operation = new Operation(operationContract);

        return operation;
    }

    public async getOperations(apiId: string, searchQuery?: SearchQuery): Promise<Page<Operation>> {
        let query = `${apiId}/operations`;

        let top;

        if (searchQuery) {
            searchQuery.tags.forEach((tag, index) => {
                query = Utils.addQueryParameter(query, `tags[${index}]=${tag}`);
            });

            if (searchQuery.pattern) {
                const pattern = Utils.escapeValueForODataFilter(searchQuery.pattern);
                query = Utils.addQueryParameter(query, `$filter=contains(properties/name,'${encodeURIComponent(pattern)}')`);
            }

            top = searchQuery.take;

            if (searchQuery.skip) {
                query = Utils.addQueryParameter(query, `$skip=${searchQuery.skip}`);
            }
        }

        query = Utils.addQueryParameter(query, `$top=${top || 20}`);

        const result = await this.mapiClient.get<Page<OperationContract>>(query);
        const page = new Page<Operation>();

        page.value = result.value.map(c => new Operation(<any>c));
        page.nextLink = result.nextLink;

        return page;
    }

    private lastApiSchemas = {};

    public async getApiSchema(schemaId: string): Promise<Schema> {
        const apiId = schemaId.split("/schemas").shift();
        let cachedApi = this.lastApiSchemas[apiId];
        if (!cachedApi) {
            // clean cache if apiId changed
            if (Object.keys(this.lastApiSchemas).length > 0) {
                this.lastApiSchemas = {};
            }
            this.lastApiSchemas[apiId] = {};
            cachedApi = this.lastApiSchemas[apiId];
        }

        const cached = cachedApi && cachedApi[schemaId];
        if (cached) {
            return cached;
        }

        const schema = await this.mapiClient.get<SchemaContract>(`${schemaId}`);
        const loaded = new Schema(schema);

        cachedApi[schemaId] = loaded;

        return loaded;
    }

    public async getSchemas(api: Api): Promise<Page<Schema>> {
        const result = await this.mapiClient.get<Page<SchemaContract>>(`${api.id}/schemas?$top=20`);
        const schemaReferences = result.value;
        const schemas = await Promise.all(schemaReferences.map(schemaReference => this.getApiSchema(schemaReference.id)));

        // return schemas;
        // const result = await this.mapiClient.get<Page<SchemaContract>>(`${api.id}/schemas?$top=20`, null);
        // const schemas = await Promise.all(schemaReferences.map(schemaReference => this.getApiSchema(schemaReference.id)));
        // return schemas;

        const page = new Page<Schema>();
        page.value = schemas;
        return page;
    }

    private lastApiProducts = {};

    public async getAllApiProducts(apiId: string): Promise<Page<Product>> {
        let cachedApi = this.lastApiProducts[apiId];
        if (!cachedApi) {
            // clean cache if apiId changed
            if (Object.keys(this.lastApiProducts).length > 0) {
                this.lastApiProducts = {};
            }
        } else {
            return cachedApi;
        }

        const result = [];
        const pageOfProducts = await this.mapiClient.get<Page<ProductContract>>(`${apiId}/products`);

        if (pageOfProducts && pageOfProducts.value) {
            pageOfProducts.value.map(item => result.push(new Product(item)));
        }

        const page = new Page<Product>();
        page.value = result;
        page.count = pageOfProducts.count;
        // page.nextPage = pageOfProductContracts.nextPage;

        this.lastApiProducts[apiId] = page;
        return page;
    }

    public async getProductApis(productId: string): Promise<Page<Api>> {
        const result: Api[] = [];

        const pageOfApis = await this.mapiClient.get<Page<ApiContract>>(`${productId}/apis`);

        if (pageOfApis && pageOfApis.value) {
            pageOfApis.value.map(item => result.push(new Api(item)));
        }

        const page = new Page<Api>();
        page.value = result;
        page.count = pageOfApis.count;

        return page;
    }
}