import "@paperbits/core/ko/bindingHandlers/bindingHandlers.component";
import { IInjector, IInjectorModule } from "@paperbits/common/injection";
import { DefaultEventManager } from "@paperbits/common/events";
import { XmlHttpRequestClient } from "@paperbits/common/http";
import { SettingsProvider } from "@paperbits/common/configuration";
import { DefaultRouter, DefaultRouteGuard } from "@paperbits/common/routing";
import { KnockoutRegistrationLoaders } from "@paperbits/core/ko/knockout.loaders";
import { ApiList } from "./components/apis/runtime/api-list/api-list";
import { ApiService } from "./services/apiService";
import { TagService } from "./services/tagService";
import { TenantService } from "./services/tenantService";
import { ApiDetails } from "./components/apis/runtime/api-details/api-details";
import { OperationDetails } from "./components/operations/runtime/operation-details/operation-details";
import { OperationConsole } from "./components/operations/runtime/operation-console/operation-console";
import { SchemaDetails } from "./components/runtime/schema-details/schema-details";
import { ProductService } from "./services/productService";
import { FileInput } from "./components/runtime/file-input/file-input";
import { MapiClient } from "./services/mapiClient";
import { UsersService } from "./services/usersService";
import { UserSignin } from "./components/users/runtime/user-signin/user-signin";
import { UserSignup } from "./components/users/runtime/user-signup/user-signup";
import { UserDetails } from "./components/users/runtime/user-details/user-details";
import { UserSubscriptions } from "./components/users/runtime/user-subscriptions/user-subscriptions";
import { ProductList } from "./components/products/runtime/product-list/product-list";
import { ProductDetails } from "./components/products/runtime/product-details/product-details";
import { ProductSubscribe } from "./components/products/runtime/product-subscribe/product-subscribe";
import { AccessTokenRouteGuard } from "./routing/accessTokenRouteGuard";
import { DefaultAuthenticator } from "./components/defaultAuthenticator";
import { Spinner } from "./components/spinner/spinner";
import { ProductApis } from "./components/products/runtime/product-apis/product-apis";
import { OperationList } from "./components/operations/runtime/operation-list/operation-list";
import { ProductSubscriptions } from "./components/products/runtime/product-subscriptions/product-subscriptions";


export class ApimRuntimeModule implements IInjectorModule {
    public register(injector: IInjector): void {
        injector.bindModule(new KnockoutRegistrationLoaders());
        injector.bindSingleton("eventManager", DefaultEventManager);
        injector.bindCollection("autostart");
        injector.bindCollection("routeGuards");
        injector.bindToCollection("routeGuards", AccessTokenRouteGuard);
        injector.bindSingleton("router", DefaultRouter);
        injector.bind("apiList", ApiList);
        injector.bind("apiDetails", ApiDetails);
        injector.bind("operationDetails", OperationDetails);
        injector.bind("operationConsole", OperationConsole);
        injector.bind("schemaDetails", SchemaDetails);
        injector.bind("fileInput", FileInput);
        injector.bind("apiService", ApiService);
        injector.bind("tagService", TagService);
        injector.bind("tenantService", TenantService);
        injector.bind("productService", ProductService);
        injector.bind("userSignin", UserSignin);
        injector.bind("userSignup", UserSignup);
        injector.bind("userDetails", UserDetails);
        injector.bind("userSubscriptions", UserSubscriptions);
        injector.bind("productList", ProductList);
        injector.bind("productDetails", ProductDetails);
        injector.bind("productSubscribe", ProductSubscribe);
        injector.bind("productSubscriptions", ProductSubscriptions);
        injector.bind("productApis", ProductApis);
        injector.bind("operationList", OperationList);
        injector.bind("operationDetails", OperationDetails);
        injector.bind("usersService", UsersService);
        injector.bind("spinner", Spinner);
        injector.bindSingleton("smapiClient", MapiClient);
        injector.bindSingleton("httpClient", XmlHttpRequestClient);
        injector.bindSingleton("settingsProvider", SettingsProvider);
        injector.bindSingleton("accessTokenRouteChecker", AccessTokenRouteGuard);
        injector.bindSingleton("authenticator", DefaultAuthenticator);
    }
}