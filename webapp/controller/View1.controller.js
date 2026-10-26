sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent"
], (Controller, UIComponent) => {
    "use strict";

    return Controller.extend("zcoffee.controller.View1", {
        onInit() {

        },

        onNavToRH:function(){

            const router = UIComponent.getRouterFor(this);
            router.navTo("RouteRH");
            
        },

        onNavToProducts:function(){

            const router = UIComponent.getRouterFor(this);
            router.navTo("RouteProducts");
            
        },

        onNavToSuppliers:function(){

            const router = UIComponent.getRouterFor(this);
            router.navTo("RouteSuppliers");
        }
    });
});