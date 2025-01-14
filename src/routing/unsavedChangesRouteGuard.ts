import { RouteGuard, Route, Router } from "@paperbits/common/routing";
import { OfflineObjectStorage } from "@paperbits/common/persistence";
import { IViewManager } from "@paperbits/common/ui";
import { IPageService } from "@paperbits/common/pages";


export class UnsavedChangesRouteGuard implements RouteGuard {
    constructor(
        private readonly offlineObjectStorage: OfflineObjectStorage,
        private readonly viewManager: IViewManager,
        private readonly pageService: IPageService
    ) { }

    public canActivate(route: Route): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            if (!this.offlineObjectStorage.hasUnsavedChanges()) {
                resolve(true);
            }

            const path = route.path;

            const pathNotChanged = route.previous && route.previous.path === path;

            if (pathNotChanged) {
                const page = await this.pageService.getPageByPermalink(path);

                if (!page || !page.contentKey) {
                    resolve(true);
                }

                if (this.offlineObjectStorage.hasUnsavedChangesAt(page.contentKey)) {
                    const toast = this.viewManager.addToast("Unsaved changes", `You have unsaved changes. Do you want to save or discard them?`, [
                        {
                            title: "Save",
                            iconClass: "paperbits-check-2",
                            action: async (): Promise<void> => {
                                await this.offlineObjectStorage.saveChanges();
                                this.viewManager.removeToast(toast);
                                resolve(true);
                            }
                        },
                        {
                            title: "Discard",
                            iconClass: "paperbits-simple-remove",
                            action: async (): Promise<void> => {
                                await this.offlineObjectStorage.discardChanges();
                                this.viewManager.removeToast(toast);
                                resolve(true);
                            }
                        }
                    ]);
                }
            }
            else {
                resolve(true);
            }
        });
    }
}