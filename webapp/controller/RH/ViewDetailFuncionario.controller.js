sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "zcoffee/model/formatter"
], (Controller, UIComponent, JSONModel, formatter) => {
    "use strict";

    return Controller.extend("zcoffee.controller.RH.ViewDetailFuncionario", {

        formatter: formatter,

        onInit() {
            const oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteDetailFuncionario").attachPatternMatched(this._onRouteMatched, this);

            this.getView().setModel(new JSONModel({}), "detail");

        },

        _onRouteMatched:function(oEvent){

            const sId = oEvent.getParameter("arguments").funcionarioId;

            this._carregarFuncionario(sId);
            this._carregarHistorico(sId);

        },

        _carregarFuncionario:function(sId){

            const oDetailModel = this.getView().getModel("detail").setData({
                ID: sId,
                NomeInitials: "",
                Nome: "",
                CPF: "",
                Telefone: "",
                Nascimento: "",
                Admissao: "",
                Cargo: "",
                Salario: "",
                Moeda: "",
                Login: ""
            })

            const oODataModel = this.getView().getModel();
            oODataModel.read(`/ZIRH_ZCOFFEE('${sId}')`, {

                success:function(oData2){

                    const sNomeInitials = oData2.Nome.split(" ").map(s => s.charAt(0)).join("");
                    oData2.NomeInitials = sNomeInitials;

                    this.getView().getModel("detail").setData(oData2);
                }.bind(this),

                error: function(oError){
                    sap.m.MessageToast.show("Erro ao carregar dados do funcionário.");
                }.bind(this)
            });

        },

        _carregarHistorico:function(sId){

            const oModel = this.getView().getModel();

            oModel.read("/ZCDS_HIST_SALARIO",{

                filters:[
                    new sap.ui.model.Filter(
                        "FuncionarioId",
                        sap.ui.model.FilterOperator.EQ,
                        sId
                    )
                ],

                success:(oData)=>{

                    const oJson = new JSONModel(oData.results);

                    this.getView().setModel(oJson,"historico");

                },
                error:function(oError){
                    sap.m.MessageToast.show("Erro ao carregar histórico de salários.");
                }

            });

        },

        _onNavBack() {
            const oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteRH");
        }
    });
});