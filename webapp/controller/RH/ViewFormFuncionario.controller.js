sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], (Controller, UIComponent, JSONModel) => {
    "use strict";

    return Controller.extend("zcoffee.controller.RH.ViewFormFuncionario", {
        onInit() {

            const oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteNewFuncionario").attachPatternMatched(this._onRouteMatchedNewFuncionario, this);
            oRouter.getRoute("RouteEditFuncionario").attachPatternMatched(this._onRouteMatchedEditFuncionario, this);

        },

        _onRouteMatchedNewFuncionario:function(){

            this.getView().setModel(new JSONModel({
                ID: "",
                Nome: "",
                CPF: "",
                Telefone: "",
                Nascimento: "",
                Admissao: "",
                Cargo: "1",
                Salario: "",
                Moeda: "",
                Login: ""
            }), "funcionario");

            this.onClear();
        },

        _onRouteMatchedEditFuncionario:function(oEvent){

            const sId = oEvent.getParameter("arguments").funcionarioId;
            const oODataModel = this.getView().getModel();

            oODataModel.read(`/ZIRH_ZCOFFEE('${sId}')`, {

                success:function(oData){
                    this.getView().setModel(new JSONModel(oData), "funcionario");
                }.bind(this),

                error: function(){
                    sap.m.MessageToast.show("Erro ao carregar dados do funcionário.");
                }.bind(this)
            });

        },

        onSalvarFuncionario:function(){

            const oModel = this.getView().getModel("funcionario");
            const oData = oModel.getData();

            const oDatePicker = this.byId("dp1");
            let oDate = oDatePicker.getDateValue(); 

            const oODataModel = this.getView().getModel();

            if(!oData.Nome || !oData.CPF || !oData.Telefone || !oDate || !oData.Cargo || !oData.Salario){
                sap.m.MessageToast.show("Por favor, preencha todos os campos obrigatórios.");
                return;
            }

            if(oData.ID){
                oODataModel.update(`/ZIRH_ZCOFFEE('${oData.ID}')`, {
                    Nome: oData.Nome.trim(),
                    CPF: oData.CPF,
                    Email: oData.Email.trim(),
                    Telefone: oData.Telefone,
                    Nascimento: oDate,
                    Cargo: oData.Cargo,
                    Salario: oData.Salario
                }, {
                    success:function(){

                        sap.m.MessageToast.show(`Funcionário atualizado com sucesso! ID: ${oData.ID}`);
                        this.onClear();
                        this.onNavToRH();
                    }.bind(this),

                    error:function(){
                        sap.m.MessageToast.show("Erro ao atualizar funcionário.");
                    }
                });

                return;

            }

           oODataModel.create("/ZIRH_ZCOFFEE", {
                Nome: oData.Nome.trim(),
                CPF: oData.CPF,
                Email: oData.Email.trim(),
                Telefone: oData.Telefone,
                Nascimento: oDate,
                Cargo: oData.Cargo,
                Salario: oData.Salario
            }, {

                success: (oDataNew) => {

                    sap.m.MessageToast.show(`Funcionário cadastrado com sucesso! ID: ${oDataNew.ID}`);
                    this.onClear();
                    this.onNavToRH();
                },

                error: () => {
                    sap.m.MessageToast.show("Erro ao cadastrar funcionário.");
                }

            });

        },


        onClear:function(){

            this.getView().getModel("funcionario").setData({
                ID: "",
                Nome: "",
                CPF: "",
                Telefone: "",
                Nascimento: "",
                Admissao: "",
                Cargo: "1",
                Salario: "",
                Moeda: "",
                Login: ""
            });
        },

        onNavToRH() {

            const oRouter = UIComponent.getRouterFor(this);

            oRouter.navTo("RouteRH");
        },

        onSalarioChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const sValue = oEvent.getParameter("value");

            const sDigits = sValue.replace(/\D/g, "");

            if (!sDigits) {
                oInput.setValue("");
                this._atualizarModelo(0);
                return;
            }

            const fAmount = parseFloat(sDigits) / 100;

            const oFloatFormat = sap.ui.core.format.NumberFormat.getFloatInstance({
                groupingEnabled: true,
                groupingSeparator: ".",
                decimalSeparator: ",",
                minFractionDigits: 2,
                maxFractionDigits: 2
            });

            const sFormattedValue = oFloatFormat.format(fAmount);
            oInput.setValue(sFormattedValue);

            this._atualizarModelo(fAmount.toFixed(2)); 
        },

        _atualizarModelo: function (sValorFinal) {
            const oModel = this.getView().getModel("funcionario");

            oModel.setProperty("/Salario", sValorFinal);
        }

    });
});