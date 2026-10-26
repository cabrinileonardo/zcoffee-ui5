sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "zcoffee/model/formatter",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
  ],
  (Controller, UIComponent, formatter, History, JSONModel, MessageToast) => {
    "use strict";

    return Controller.extend("zcoffee.controller.MM.ViewDetailProduct", {
      formatter: formatter,

      onInit() {
        const oRouter = UIComponent.getRouterFor(this);
        oRouter
          .getRoute("RouteDetailProduct")
          .attachPatternMatched(this._onMatched, this);

        this.getView().setModel(new JSONModel({}), "prodDetail");
      },

      _onMatched: function (oEvent) {
        const sId = oEvent.getParameter("arguments").productId;

        this._loadProduct(sId);
      },

      _onNavBack: function () {
        const sPreviousHash = History.getInstance().getPreviousHash();

        if (sPreviousHash) {
          window.history.go(-1);
        } else {
          this.getOwnerComponent().getRouter().navTo("RouteProducts", {}, true);
        }
      },

        _loadProduct: function (sId) {

            const oModel = this.getView().getModel();

            oModel.read(`/ZI_MM_PRODUTO('${sId}')`, {

                success: function (oData) {

                    this.getView().getModel("prodDetail").setData(oData);

                }.bind(this),

                error: function () {

                    MessageToast.show("Erro ao carregar dados do produto.");

                }.bind(this),
            });
        }


    });
  },
);
