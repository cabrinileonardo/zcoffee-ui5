sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "zcoffee/model/formatter",
    "sap/ui/model/json/JSONModel"
], (Controller, 
    UIComponent, 
    Filter, 
    FilterOperator, 
    formatter, 
    JSONModel) => {
    "use strict";

    return Controller.extend("zcoffee.controller.RH.ViewRH", {

        formatter: formatter,

        onInit() {

            const oFilterModel = new JSONModel({
                Nome: "",
                Cargo: [],
                Status: ["A"], // Inicia com Ativo
                dataInicio: null,
                dataFim: null
            });
            this.getView().setModel(oFilterModel, "filter");

            const oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteRH").attachPatternMatched(this._onRouteMatched, this);

        },

        _onRouteMatched:function(oEvent){

            this.onFilterToolbar(); // Aplica os filtros ao entrar na rota
            this._loadKPIs();   // Carrega os KPIs atualizados
            this._loadGrafico(); // Carrega o gráfico atualizado
        },

        onFilterToolbar:function(oEvent){

            const oFilterData = this.getView().getModel("filter").getData();
            const aFilters = [];

            if (oFilterData.Nome) {
                aFilters.push(new Filter("Nome", FilterOperator.Contains, oFilterData.Nome));
            }

            if (oFilterData.Cargo && oFilterData.Cargo.length > 0) {
                const aCargoFilters = oFilterData.Cargo.map(sKey => new Filter("Cargo", FilterOperator.EQ, sKey));
                aFilters.push(new Filter({ filters: aCargoFilters, and: false }));
            }

            if (oFilterData.Status && oFilterData.Status.length > 0) {
                const aStatusFilters = oFilterData.Status.map(sKey => new Filter("Status", FilterOperator.EQ, sKey));
                aFilters.push(new Filter({ filters: aStatusFilters, and: false }));
            }

             if (oFilterData.dataInicio && oFilterData.dataFim) {

                const sDataInicio = oFilterData.dataInicio.toISOString().split("T")[0];

                const sDataFim = oFilterData.dataFim.toISOString().split("T")[0];

                aFilters.push(new Filter("Admissao", FilterOperator.BT, sDataInicio, sDataFim));

            }

            // Aplica o array de filtros no binding da tabela
            const oTable = this.byId("TableRH");
            const oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.filter(aFilters);
            }

        },

        onClearFilters: function() {
            // Reseta o JSON Model para o estado inicial
            this.getView().getModel("filter").setData({
                Nome: "",
                Cargo: [],
                Status: ["A"],
                dataInicio: null,
                dataFim: null
            });
            
            // Reaplica os filtros resetados
            this.onFilterToolbar();
        },

        onDelete:function(oEvent){

            const sId = oEvent
                .getParameter("listItem")
                .getBindingContext()
                .getProperty("ID");

            const oODataModel = this.getView().getModel();

            this.getView().setBusy(true);
            oODataModel.remove(`/ZIRH_ZCOFFEE('${sId}')`, {

                success:function(){

                    sap.m.MessageToast.show(`Funcionário excluído com sucesso! ID: ${sId}`);
                    oDataModel.refresh();
                }.bind(this),

                error:function(){

                    sap.m.MessageToast.show("Erro ao excluir funcionário.");
                    this.getView().setBusy(false);
                }

            });

        },

        onNovoFuncionario: function() {
            
            const oRouter = UIComponent.getRouterFor(this);
            
            oRouter.navTo("RouteNewFuncionario");

        },

        onEditFuncionario:function(oEvent){
            const sId = oEvent
                .getSource()
                .getBindingContext()
                .getProperty("ID");

            const oRouter = UIComponent.getRouterFor(this);

            oRouter.navTo("RouteEditFuncionario", {
                funcionarioId: sId
            });
        },

        onRefresh:function(){
            const oODataModel = this.getView().getModel();

            this.getView().setBusy(true);
            oODataModel.read("/ZIRH_ZCOFFEE", {

                success:function(){
                    sap.m.MessageToast.show("Dados atualizados com sucesso!");
                    oODataModel.refresh();
                    this.getView().setBusy(false);
                }.bind(this),
                error:function(){
                    sap.m.MessageToast.show("Erro ao atualizar dados.");
                    this.getView().setBusy(false);
                }
            });
        },

        onDetailFuncionario:function(oEvent){

            const sId = oEvent
            .getParameter("listItem")
            .getBindingContext()
            .getPath()
            .split("'")[1];

            const oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteDetailFuncionario", {
                funcionarioId: sId
            });

        },

        _loadKPIs:function(){

            const oModel = this.getView().getModel();

            oModel.read("/ZIRH_ZCOFFEE",{

                success:function(oData){
                    const aFuncionarios = oData.results;
                    const iTotal = aFuncionarios.length;

                    const iAtivos = aFuncionarios.filter(f => f.Status === "A").length;

                    const fFolha = aFuncionarios.reduce((total, item) => {

                        return total + parseFloat(item.Salario || 0);

                    }, 0);

                    const oDashBoard = {
                        totalFuncionarios: iTotal,
                        ativos: iAtivos,
                        folhaSalarial: (fFolha / 1000).toFixed(2)
                    };

                    const oJson = new JSONModel(oDashBoard);

                    this.getView().setModel(oJson, "dashboard");

                }.bind(this),

                error:function(){
                    sap.m.MessageToast.show("Erro ao carregar dados do funcionário.");
                }
            });
        },

       
        _loadGrafico: function () {

            const oModel = this.getView().getModel();

            oModel.read("/ZIRH_ZCOFFEE", {

                success: function (oData) {

                    const oCargos = {};

                    oData.results.forEach(item => {

                        if (!oCargos[item.Cargo]) {
                            oCargos[item.Cargo] = 0;
                        }

                        oCargos[item.Cargo]++;
                    });

                    const aGrafico = Object.keys(oCargos).map(cargo => ({
                        cargo: this.formatter.formatCargo(cargo),
                        quantidade: oCargos[cargo]
                    }));

                    const oJson = new JSONModel({
                        cargoChart: aGrafico
                    });

                    this.getView().setModel(oJson, "grafico");

                }.bind(this)

            });
        },

        onNavBack:function(){
            const oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteView1");
        }
    });
});