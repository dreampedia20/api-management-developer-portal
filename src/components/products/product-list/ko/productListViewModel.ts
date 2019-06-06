import template from "./productList.html";
import { Component } from "@paperbits/common/ko/decorators";

@Component({
    selector: "productList",
    template: template,
    injectable: "productList"
})
export class ProductListViewModel { }